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
import { DownloadDoc } from '../../src/features/downloads/download.model.js';
import { Event } from '../../src/features/events/event.model.js';
import { hashPassword } from '../../src/utils/password.js';

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
  // The one-rating-per-service and one-vote-per-poll guarantees ARE these indexes.
  await Promise.all([Feedback.syncIndexes(), Poll.syncIndexes(), PollVote.syncIndexes()]);
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
    DownloadDoc.deleteMany({}),
    Event.deleteMany({}),
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
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ fullName: 'Citizen', mobile, password: 'Secret@123', village: 'S', address: 'R' });
  return res.body.data.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/* ------------------------------------------------------------------ 2.1 feedback abuse guard */

describe('feedback: one rating per citizen per service', () => {
  test('rating the same service twice replaces the score instead of stacking', async () => {
    const citizen = await citizenToken();

    await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Roads', rating: 5, comment: 'first' });
    const second = await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Roads', rating: 1, comment: 'changed my mind' });

    expect(second.status).toBe(201);
    // Before the fix this was two rows and an average of 3.
    expect(await Feedback.countDocuments({ category: 'Roads' })).toBe(1);
    const summary = (await request(app).get('/api/v1/feedback/summary')).body.data.data;
    const roads = summary.find((r) => r.category === 'Roads');
    expect(roads.count).toBe(1);
    expect(roads.average).toBe(1);
  });

  test('one citizen cannot move the published average by repeating themselves', async () => {
    const a = await citizenToken('9876500001');
    const b = await citizenToken('9876500002');

    await request(app).post('/api/v1/feedback').set(auth(b)).send({ category: 'Roads', rating: 5 });
    // Ten attempts to drag the average down.
    for (let i = 0; i < 10; i += 1) {
      await request(app)
        .post('/api/v1/feedback')
        .set(auth(a))
        .send({ category: 'Roads', rating: 1 });
    }

    const roads = (await request(app).get('/api/v1/feedback/summary')).body.data.data.find(
      (r) => r.category === 'Roads',
    );
    // Two citizens, two ratings: 5 and 1.
    expect(roads.count).toBe(2);
    expect(roads.average).toBe(3);
  });

  test('different services from one citizen are still separate ratings', async () => {
    const citizen = await citizenToken();
    await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Roads', rating: 4 });
    await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Health', rating: 2 });
    expect(await Feedback.countDocuments({})).toBe(2);
  });

  test('the service rejects a non-integer rating even when called past the validator', async () => {
    const citizen = await citizenToken();
    const res = await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Roads', rating: 3.7 });
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------- 2.4 malformed JSON is a 400 */

describe('malformed JSON in multipart fields reads as 400, not 500', () => {
  test('a broken agenda is rejected', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .field('title', 'Meeting with broken agenda')
      .field('scheduledAt', '2999-01-01T05:00:00.000Z')
      .field('agenda', '{not json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_AGENDA');
  });

  test('broken poll options are rejected', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/polls')
      .set(auth(token))
      .send({ question: 'Broken options?', options: '{not json' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OPTIONS');
  });

  test('a well-formed agenda still works', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .field('title', 'Meeting with agenda')
      .field('scheduledAt', '2999-01-01T05:00:00.000Z')
      .field('agenda', JSON.stringify([{ title: 'Drainage' }]));

    expect(res.status).toBe(201);
    expect(res.body.data.agenda).toHaveLength(1);
  });
});

/* ------------------------------------------------------- 2.3 update validation across modules */

describe('update validates the same fields as create', () => {
  test('meeting update rejects a bad date and a bad type', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .send({ title: 'Valid meeting', scheduledAt: '2999-01-01T05:00:00.000Z' });
    const id = created.body.data.id;

    expect(
      (
        await request(app)
          .put(`/api/v1/admin/meetings/${id}`)
          .set(auth(token))
          .send({ scheduledAt: 'not-a-date' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put(`/api/v1/admin/meetings/${id}`)
          .set(auth(token))
          .send({ meetingType: 'NotAType' })
      ).status,
    ).toBe(400);
  });

  test('meeting update still accepts a valid change', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/meetings')
      .set(auth(token))
      .send({ title: 'Valid meeting', scheduledAt: '2999-01-01T05:00:00.000Z' });
    const res = await request(app)
      .put(`/api/v1/admin/meetings/${created.body.data.id}`)
      .set(auth(token))
      .send({ venue: 'New hall', isPublished: true });

    expect(res.status).toBe(200);
    expect(res.body.data.venue).toBe('New hall');
    expect(res.body.data.isPublished).toBe(true);
  });

  test('poll update rejects a bad closing date', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/polls')
      .set(auth(token))
      .send({ question: 'A question?', options: ['a', 'b'] });
    const res = await request(app)
      .put(`/api/v1/admin/polls/${created.body.data.id}`)
      .set(auth(token))
      .send({ closesAt: 'whenever' });
    expect(res.status).toBe(400);
  });

  test('event update rejects a bad start date', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/events')
      .set(auth(token))
      .send({ title: 'Valid event', startDate: '2999-01-01T05:00:00.000Z' });
    const res = await request(app)
      .put(`/api/v1/admin/events/${created.body.data.id}`)
      .set(auth(token))
      .send({ startDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  test('document update rejects an unknown category', async () => {
    const token = await officerToken();
    const doc = await DownloadDoc.create({
      title: 'Existing form',
      fileUrl: 'https://example.test/f.pdf',
      isPublished: true,
      createdBy: (await User.findOne({ role: ROLES.OFFICER }))._id,
    });
    const res = await request(app)
      .put(`/api/v1/admin/downloads/${doc.id}`)
      .set(auth(token))
      .send({ category: 'NotACategory' });
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------- downloads: was untested */

describe('download centre', () => {
  async function publishedDoc(officerId, over = {}) {
    return DownloadDoc.create({
      title: 'Marriage certificate form',
      category: 'Form',
      fileUrl: 'https://example.test/form.pdf',
      fileName: 'form.pdf',
      year: '2026',
      isPublished: true,
      createdBy: officerId,
      ...over,
    });
  }

  test('only published documents are listed publicly', async () => {
    const token = await officerToken();
    const officer = await User.findOne({ role: ROLES.OFFICER });
    await publishedDoc(officer._id);
    await publishedDoc(officer._id, { title: 'Draft circular', isPublished: false });

    const publicRows = (await request(app).get('/api/v1/downloads')).body.data;
    expect(publicRows.total).toBe(1);
    // The officer still sees the draft.
    const adminRows = (await request(app).get('/api/v1/admin/downloads').set(auth(token))).body
      .data;
    expect(adminRows.total).toBe(2);
  });

  test('category and year filter the list', async () => {
    const token = await officerToken();
    const officer = await User.findOne({ role: ROLES.OFFICER });
    await publishedDoc(officer._id);
    await publishedDoc(officer._id, { title: 'Budget 2025', category: 'Budget', year: '2025' });

    expect((await request(app).get('/api/v1/downloads?category=Budget')).body.data.total).toBe(1);
    expect((await request(app).get('/api/v1/downloads?year=2026')).body.data.total).toBe(1);
    expect(
      (await request(app).get('/api/v1/admin/downloads?category=Form').set(auth(token))).body.data
        .total,
    ).toBe(1);
  });

  test('opening a document counts it and returns the file URL', async () => {
    const officer = await officerToken().then(() => User.findOne({ role: ROLES.OFFICER }));
    const doc = await publishedDoc(officer._id);

    const res = await request(app).post(`/api/v1/downloads/${doc.id}/open`);
    expect(res.status).toBe(200);
    expect(res.body.data.fileUrl).toBe('https://example.test/form.pdf');
    expect(res.body.data.count).toBe(1);

    await request(app).post(`/api/v1/downloads/${doc.id}/open`);
    expect((await DownloadDoc.findById(doc.id).lean()).downloadCount).toBe(2);
  });

  test('an unpublished document cannot be opened', async () => {
    const officer = await officerToken().then(() => User.findOne({ role: ROLES.OFFICER }));
    const doc = await publishedDoc(officer._id, { isPublished: false });
    expect((await request(app).post(`/api/v1/downloads/${doc.id}/open`)).status).toBe(404);
  });

  test('opening an unknown document is a 404, not a crash', async () => {
    const res = await request(app).post('/api/v1/downloads/6a5872c51a07264f012d4bd7/open');
    expect(res.status).toBe(404);
  });

  test('a document is created, updated and soft-deleted', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/downloads')
      .set(auth(token))
      .field('title', 'Water connection form')
      .field('category', 'Form')
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'water.pdf',
        contentType: 'application/pdf',
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const updated = await request(app)
      .put(`/api/v1/admin/downloads/${id}`)
      .set(auth(token))
      .send({ title: 'Water connection form (2026)' });
    expect(updated.body.data.title).toBe('Water connection form (2026)');

    expect(
      (await request(app).delete(`/api/v1/admin/downloads/${id}`).set(auth(token))).status,
    ).toBe(200);
    // Soft delete: gone from the API, still in the collection.
    expect((await request(app).get('/api/v1/downloads')).body.data.total).toBe(0);
    expect(await DownloadDoc.countDocuments({})).toBe(1);
  });

  test('publishing a document without a file is refused', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/downloads')
      .set(auth(token))
      .field('title', 'No file attached');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REQUIRED');
  });

  test('updating or deleting an unknown document is a 404', async () => {
    const token = await officerToken();
    const ghost = '6a5872c51a07264f012d4bd7';
    expect(
      (await request(app).put(`/api/v1/admin/downloads/${ghost}`).set(auth(token)).send({})).status,
    ).toBe(404);
    expect(
      (await request(app).delete(`/api/v1/admin/downloads/${ghost}`).set(auth(token))).status,
    ).toBe(404);
  });
});

/* ------------------------------------------------- error paths the governance suite did not hit */

describe('not-found and closed-state paths', () => {
  test('meeting, project and poll updates 404 on an unknown id', async () => {
    const token = await officerToken();
    const ghost = '6a5872c51a07264f012d4bd7';
    expect(
      (
        await request(app)
          .put(`/api/v1/admin/meetings/${ghost}`)
          .set(auth(token))
          .send({ venue: 'x' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .put(`/api/v1/admin/projects/${ghost}`)
          .set(auth(token))
          .send({ location: 'x' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .put(`/api/v1/admin/polls/${ghost}`)
          .set(auth(token))
          .send({ isPublished: true })
      ).status,
    ).toBe(404);
  });

  test('deletes 404 on an unknown id', async () => {
    const token = await officerToken();
    const ghost = '6a5872c51a07264f012d4bd7';
    for (const path of ['meetings', 'projects', 'polls']) {
      expect(
        (await request(app).delete(`/api/v1/admin/${path}/${ghost}`).set(auth(token))).status,
      ).toBe(404);
    }
  });

  test('voting in a closed poll is refused', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/polls')
      .set(auth(token))
      .send({
        question: 'Already over?',
        options: ['a', 'b'],
        isPublished: true,
        closesAt: '2020-01-01T00:00:00.000Z',
      });
    const citizen = await citizenToken();
    const poll = await Poll.findById(created.body.data.id).lean();

    const res = await request(app)
      .post(`/api/v1/polls/${created.body.data.id}/vote`)
      .set(auth(citizen))
      .send({ optionId: String(poll.options[0]._id) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('POLL_CLOSED');
  });

  test('a closed poll reveals its tallies without voting', async () => {
    const token = await officerToken();
    await request(app)
      .post('/api/v1/admin/polls')
      .set(auth(token))
      .send({
        question: 'Finished poll',
        options: ['a', 'b'],
        isPublished: true,
        closesAt: '2020-01-01T00:00:00.000Z',
      });
    const citizen = await citizenToken();
    const listed = (await request(app).get('/api/v1/polls').set(auth(citizen))).body.data.data[0];

    expect(listed.isOpen).toBe(false);
    // Nothing left to bias — the result is history.
    expect(listed.totalVotes).toBe(0);
    expect(listed.options[0].votes).toBe(0);
  });

  test('voting in an unpublished poll is a 404', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/polls')
      .set(auth(token))
      .send({ question: 'Draft poll', options: ['a', 'b'] });
    const citizen = await citizenToken();
    const poll = await Poll.findById(created.body.data.id).lean();

    const res = await request(app)
      .post(`/api/v1/polls/${created.body.data.id}/vote`)
      .set(auth(citizen))
      .send({ optionId: String(poll.options[0]._id) });
    expect(res.status).toBe(404);
  });

  test('project and meeting detail 404 on an unknown id', async () => {
    const ghost = '6a5872c51a07264f012d4bd7';
    expect((await request(app).get(`/api/v1/projects/${ghost}`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/meetings/${ghost}`)).status).toBe(404);
  });

  test('project list filters by category and status', async () => {
    const token = await officerToken();
    await request(app)
      .post('/api/v1/admin/projects')
      .set(auth(token))
      .send({ name: 'Road work', category: 'Road', status: 'Completed', isPublished: true });
    await request(app)
      .post('/api/v1/admin/projects')
      .set(auth(token))
      .send({ name: 'Water work', category: 'WaterSupply', status: 'Planned', isPublished: true });

    expect((await request(app).get('/api/v1/projects?category=Road')).body.data.total).toBe(1);
    expect((await request(app).get('/api/v1/projects?status=Planned')).body.data.total).toBe(1);
    expect(
      (await request(app).get('/api/v1/admin/projects?status=Completed').set(auth(token))).body.data
        .total,
    ).toBe(1);
  });

  test('an update that records a milestone keeps it on the project', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/projects')
      .set(auth(token))
      .send({ name: 'Tracked work', budget: 1000, isPublished: true });
    const res = await request(app)
      .put(`/api/v1/admin/projects/${created.body.data.id}`)
      .set(auth(token))
      .send({ progress: 40, milestone: 'Foundation laid' });

    expect(res.body.data.milestones).toHaveLength(1);
    expect(res.body.data.milestones[0].label).toBe('Foundation laid');
    expect(res.body.data.milestones[0].progress).toBe(40);
  });

  test('meetings filter by type on both the public and officer lists', async () => {
    const token = await officerToken();
    await request(app).post('/api/v1/admin/meetings').set(auth(token)).send({
      title: 'Ward meeting',
      meetingType: 'WardMeeting',
      scheduledAt: '2999-01-01T05:00:00.000Z',
      isPublished: true,
    });
    await request(app).post('/api/v1/admin/meetings').set(auth(token)).send({
      title: 'Gram Sabha',
      meetingType: 'GramSabha',
      scheduledAt: '2999-02-01T05:00:00.000Z',
      isPublished: true,
    });

    expect(
      (await request(app).get('/api/v1/meetings?meetingType=WardMeeting')).body.data.total,
    ).toBe(1);
    expect(
      (await request(app).get('/api/v1/admin/meetings?meetingType=GramSabha').set(auth(token))).body
        .data.total,
    ).toBe(1);
  });

  test('a citizen sees their own feedback history and nobody else’s', async () => {
    const a = await citizenToken('9876500001');
    const b = await citizenToken('9876500002');
    await request(app).post('/api/v1/feedback').set(auth(a)).send({ category: 'Roads', rating: 3 });
    await request(app)
      .post('/api/v1/feedback')
      .set(auth(b))
      .send({ category: 'Health', rating: 5 });

    const mine = (await request(app).get('/api/v1/feedback/mine').set(auth(a))).body.data;
    expect(mine.total).toBe(1);
    expect(mine.data[0].category).toBe('Roads');
  });

  test('officer feedback list filters by category', async () => {
    const citizen = await citizenToken();
    await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Roads', rating: 3 });
    await request(app)
      .post('/api/v1/feedback')
      .set(auth(citizen))
      .send({ category: 'Health', rating: 5 });

    const token = await officerToken();
    const rows = (await request(app).get('/api/v1/admin/feedback?category=Roads').set(auth(token)))
      .body.data;
    expect(rows.total).toBe(1);
  });
});
