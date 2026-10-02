import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Meeting } from '../../src/features/meetings/meeting.model.js';
import { Project } from '../../src/features/projects/project.model.js';
import { Poll, PollVote } from '../../src/features/polls/poll.model.js';
import { Feedback } from '../../src/features/feedback/feedback.model.js';
import { hashPassword } from '../../src/utils/password.js';

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
  // The one-vote-per-citizen guarantee IS the unique index, so it has to exist in the test DB.
  await Promise.all([Poll.syncIndexes(), PollVote.syncIndexes()]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Meeting.deleteMany({}),
    Project.deleteMany({}),
    Poll.deleteMany({}),
    PollVote.deleteMany({}),
    Feedback.deleteMany({}),
  ]);
});

async function officerToken() {
  await User.create({
    role: ROLES.OFFICER,
    fullName: 'Officer',
    email: 'officer@dgp.local',
    passwordHash: await hashPassword('Admin@123'),
  });
  const res = await request(app)
    .post('/api/v1/admin/login')
    .send({ email: 'officer@dgp.local', password: 'Admin@123' });
  return res.body.data.token;
}

async function citizenToken(mobile = '9876500001') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'S',
    address: 'R',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('gram sabha meetings', () => {
  test('status is derived from the clock, not stored', async () => {
    const token = await officerToken();
    const past = await request(app).post('/api/v1/admin/meetings').set(auth(token)).send({
      title: 'Held last year',
      scheduledAt: '2020-01-01T05:00:00.000Z',
      isPublished: true,
    });
    const future = await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .send({ title: 'Next month', scheduledAt: '2999-01-01T05:00:00.000Z', isPublished: true });

    expect(past.body.data.status).toBe('Completed');
    expect(future.body.data.status).toBe('Upcoming');
    // Nothing was persisted: the field does not exist on the document.
    const stored = await Meeting.findById(past.body.data.id).lean();
    expect(stored.status).toBeUndefined();
  });

  test('a meeting in progress reads Live', async () => {
    const token = await officerToken();
    const startedMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .send({ title: 'Happening now', scheduledAt: startedMinutesAgo, isPublished: true });
    expect(res.body.data.status).toBe('Live');
  });

  test('unpublished meetings are invisible to citizens', async () => {
    const token = await officerToken();
    const draft = await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .send({ title: 'Draft', scheduledAt: '2999-01-01T05:00:00.000Z' });

    expect((await request(app).get('/api/v1/meetings')).body.data.total).toBe(0);
    expect((await request(app).get(`/api/v1/meetings/${draft.body.data.id}`)).status).toBe(404);
    // The officer still sees their own draft.
    expect(
      (await request(app).get('/api/v1/admin/meetings').set(auth(token))).body.data.total,
    ).toBe(1);
  });

  test('live and upcoming meetings are listed before completed ones', async () => {
    const token = await officerToken();
    await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .send({ title: 'Old', scheduledAt: '2020-01-01T05:00:00.000Z', isPublished: true });
    await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .send({ title: 'Soon', scheduledAt: '2999-01-01T05:00:00.000Z', isPublished: true });

    const rows = (await request(app).get('/api/v1/meetings')).body.data.data;
    expect(rows[0].title).toBe('Soon');
    expect(rows[1].title).toBe('Old');
  });

  test('agenda items survive the round trip', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .send({
        title: 'With agenda',
        scheduledAt: '2999-01-01T05:00:00.000Z',
        agenda: [{ title: 'Drainage' }, { title: 'Water', description: 'Tank cleaning' }],
        isPublished: true,
      });
    expect(res.body.data.agenda).toHaveLength(2);
    expect(res.body.data.agenda[1].description).toBe('Tank cleaning');
  });
});

describe('development projects', () => {
  const base = {
    name: 'Ward 3 road',
    budget: 100000,
    isPublished: true,
  };

  test('spending is clamped to the sanctioned budget', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/projects')
      .set(auth(token))
      .send({ ...base, amountSpent: 250000 });

    // A typo must never publish "250% utilised" on a public page.
    expect(created.body.data.amountSpent).toBe(100000);
    expect(created.body.data.utilisation).toBe(100);
  });

  test('an impossible progress figure is rejected outright on create', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/projects')
      .set(auth(token))
      .send({ ...base, progress: 500 });
    // The validator refuses it rather than quietly correcting it — the officer should know.
    expect(res.status).toBe(400);
  });

  test('update rejects an impossible progress figure, as create does', async () => {
    const token = await officerToken();
    const created = await request(app).post('/api/v1/admin/projects').set(auth(token)).send(base);
    // Update used to accept anything: create validated, update did not. It does now.
    const updated = await request(app)
      .put(`/api/v1/admin/projects/${created.body.data.id}`)
      .set(auth(token))
      .send({ progress: 250 });

    expect(updated.status).toBe(400);
  });

  test('overspend is still clamped on update — the validator only bounds it below', async () => {
    const token = await officerToken();
    const created = await request(app).post('/api/v1/admin/projects').set(auth(token)).send(base);
    // 999999 is a valid non-negative number, so it passes validation; the service is what
    // stops it exceeding the sanctioned budget. Defence in depth, both layers tested.
    const updated = await request(app)
      .put(`/api/v1/admin/projects/${created.body.data.id}`)
      .set(auth(token))
      .send({ amountSpent: 999999 });

    expect(updated.status).toBe(200);
    expect(updated.body.data.amountSpent).toBe(100000);
    expect(updated.body.data.utilisation).toBe(100);
  });

  test('utilisation is 0 when no budget is recorded, not a divide-by-zero', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/projects')
      .set(auth(token))
      .send({ name: 'No budget yet', isPublished: true });
    expect(res.body.data.utilisation).toBe(0);
  });

  test('summary aggregates only published projects', async () => {
    const token = await officerToken();
    await request(app)
      .post('/api/v1/admin/projects')
      .set(auth(token))
      .send({ ...base, amountSpent: 40000 });
    await request(app)
      .post('/api/v1/admin/projects')
      .set(auth(token))
      .send({ name: 'Hidden draft', budget: 999999, isPublished: false });

    const summary = (await request(app).get('/api/v1/projects/summary')).body.data;
    expect(summary.count).toBe(1);
    expect(summary.totalBudget).toBe(100000);
    expect(summary.utilisation).toBe(40);
  });
});

describe('quick polls', () => {
  async function publishedPoll(officer) {
    const res = await request(app)
      .post('/api/v1/admin/polls')
      .set(auth(officer))
      .send({ question: 'Where next?', options: ['Ward 1', 'Ward 2'], isPublished: true });
    return res.body.data;
  }

  test('tallies are hidden until the citizen has voted', async () => {
    const officer = await officerToken();
    await publishedPoll(officer);
    const citizen = await citizenToken();

    const before = (await request(app).get('/api/v1/polls').set(auth(citizen))).body.data.data[0];
    expect(before.hasVoted).toBe(false);
    expect(before.totalVotes).toBeUndefined();
    expect(before.options[0].votes).toBeUndefined();
  });

  test('voting reveals the tally', async () => {
    const officer = await officerToken();
    const poll = await publishedPoll(officer);
    const citizen = await citizenToken();

    const listed = (await request(app).get('/api/v1/polls').set(auth(citizen))).body.data.data[0];
    const res = await request(app)
      .post(`/api/v1/polls/${poll.id}/vote`)
      .set(auth(citizen))
      .send({ optionId: listed.options[0].id });

    expect(res.status).toBe(200);
    expect(res.body.data.hasVoted).toBe(true);
    expect(res.body.data.totalVotes).toBe(1);
    expect(res.body.data.options[0].votes).toBe(1);
    expect(res.body.data.options[0].percent).toBe(100);
  });

  test('a second vote is rejected and the tally does not move', async () => {
    const officer = await officerToken();
    const poll = await publishedPoll(officer);
    const citizen = await citizenToken();
    const listed = (await request(app).get('/api/v1/polls').set(auth(citizen))).body.data.data[0];
    const optionId = listed.options[0].id;

    await request(app).post(`/api/v1/polls/${poll.id}/vote`).set(auth(citizen)).send({ optionId });
    const second = await request(app)
      .post(`/api/v1/polls/${poll.id}/vote`)
      .set(auth(citizen))
      .send({ optionId });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_VOTED');
    expect((await Poll.findById(poll.id).lean()).totalVotes).toBe(1);
    expect(await PollVote.countDocuments({ pollId: poll.id })).toBe(1);
  });

  test('concurrent votes from one citizen still leave exactly one', async () => {
    const officer = await officerToken();
    const poll = await publishedPoll(officer);
    const citizen = await citizenToken();
    const listed = (await request(app).get('/api/v1/polls').set(auth(citizen))).body.data.data[0];
    const optionId = listed.options[0].id;

    // The application-level check cannot separate these; the unique index has to.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post(`/api/v1/polls/${poll.id}/vote`).set(auth(citizen)).send({ optionId }),
      ),
    );

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect((await Poll.findById(poll.id).lean()).totalVotes).toBe(1);
  });

  test('different citizens each get a vote', async () => {
    const officer = await officerToken();
    const poll = await publishedPoll(officer);
    const a = await citizenToken('9876500001');
    const b = await citizenToken('9876500002');
    const listed = (await request(app).get('/api/v1/polls').set(auth(a))).body.data.data[0];

    await request(app)
      .post(`/api/v1/polls/${poll.id}/vote`)
      .set(auth(a))
      .send({ optionId: listed.options[0].id });
    const second = await request(app)
      .post(`/api/v1/polls/${poll.id}/vote`)
      .set(auth(b))
      .send({ optionId: listed.options[1].id });

    expect(second.status).toBe(200);
    expect(second.body.data.totalVotes).toBe(2);
  });

  test('a poll needs at least two options', async () => {
    const officer = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/polls')
      .set(auth(officer))
      .send({ question: 'One choice only?', options: ['Yes'] });
    expect(res.status).toBe(400);
  });

  test('polls require a signed-in citizen', async () => {
    expect((await request(app).get('/api/v1/polls')).status).toBe(401);
  });
});

describe('citizen feedback', () => {
  test('anonymity is held against the officer endpoint too', async () => {
    const citizen = await citizenToken();
    await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Roads', rating: 2, comment: 'Broken', isAnonymous: true });

    const officer = await officerToken();
    const rows = (await request(app).get('/api/v1/admin/feedback').set(auth(officer))).body.data
      .data;

    expect(rows).toHaveLength(1);
    expect(rows[0].isAnonymous).toBe(true);
    // "Anonymous" an officer can see through is not anonymous.
    expect(rows[0].citizenName).toBeUndefined();
    expect(rows[0].citizenId).toBeUndefined();
    // It is still linked in the database, which is what stops one person flooding a rating.
    expect((await Feedback.findOne({}).lean()).citizenId).toBeDefined();
  });

  test('a named entry does reach the officer with its name', async () => {
    const citizen = await citizenToken();
    await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Roads', rating: 5 });

    const officer = await officerToken();
    const rows = (await request(app).get('/api/v1/admin/feedback').set(auth(officer))).body.data
      .data;
    expect(rows[0].citizenName).toBe('Citizen');
  });

  test('ratings outside 1-5 are rejected', async () => {
    const citizen = await citizenToken();
    for (const rating of [0, 6, -1]) {
      const res = await request(app)
        .post('/api/v1/feedback')
        .set(auth(citizen))
        .send({ category: 'Roads', rating });
      expect(res.status).toBe(400);
    }
  });

  test('the public summary carries averages but never comments', async () => {
    const citizen = await citizenToken();
    await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'WaterSupply', rating: 4, comment: 'private note' });

    const rows = (await request(app).get('/api/v1/feedback/summary')).body.data.data;
    const water = rows.find((r) => r.category === 'WaterSupply');
    expect(water.average).toBe(4);
    expect(water.count).toBe(1);
    expect(JSON.stringify(rows)).not.toContain('private note');
  });

  test('every rateable service appears in the summary, even with no ratings', async () => {
    const rows = (await request(app).get('/api/v1/feedback/summary')).body.data.data;
    expect(rows).toHaveLength(9);
    // No ratings means no average — not a misleading zero.
    expect(rows.every((r) => r.average === null && r.count === 0)).toBe(true);
  });

  test('submitting feedback requires signing in', async () => {
    const res = await request(app).post('/api/v1/feedback').send({ category: 'Roads', rating: 5 });
    expect(res.status).toBe(401);
  });
});

describe('access control on the new admin routes', () => {
  test.each([
    ['/api/v1/admin/meetings'],
    ['/api/v1/admin/projects'],
    ['/api/v1/admin/polls'],
    ['/api/v1/admin/feedback'],
    ['/api/v1/admin/downloads'],
  ])('a citizen is refused %s', async (path) => {
    const citizen = await citizenToken();
    expect((await request(app).get(path).set(auth(citizen))).status).toBe(403);
  });
});
