import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { TimetableEntry } from '../../src/features/timetable/timetable.model.js';
import { hashPassword } from '../../src/utils/password.js';

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    TimetableEntry.deleteMany({}),
    mongoose.connection.collection('auditlogs').deleteMany({}),
  ]);
});

async function officer() {
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

const ENTRY = {
  serviceType: 'Ghantagadi',
  title: 'Ward collection',
  day: 'Monday',
  startTime: '07:30',
  endTime: '09:00',
};

const create = (token, over = {}) =>
  request(app)
    .post('/api/v1/admin/timetable')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...ENTRY, ...over });

const adminList = (token, qs = '') =>
  request(app).get(`/api/v1/admin/timetable${qs}`).set('Authorization', `Bearer ${token}`);

async function citizenIn(ward, mobile) {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward,
  });
  return res.body.data.token;
}

const titlesFor = async (token) => {
  const req = request(app).get('/api/v1/timetable');
  if (token) req.set('Authorization', `Bearer ${token}`);
  const res = await req;
  return res.body.data.Ghantagadi.map((e) => e.title);
};

const ALL_SIX = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6'];

/**
 * Ward applicability on the timetable.
 *
 * A Ward 3 household reading Ward 1's collection time is worse than reading nothing, so the
 * citizen view narrows to their own ward plus whatever the village shares. The officer view
 * keeps everything.
 */
describe('timetable ward validation', () => {
  it.each([...ALL_SIX, 'All Wards'])('accepts %s on create', async (ward) => {
    const token = await officer();
    const res = await create(token, { ward });

    expect(res.status).toBe(201);
    expect(res.body.data.ward).toBe(ward);
  });

  it.each(['Ward 0', 'Ward 7', 'ward 1', 'Mumbai', 'unset'])(
    'refuses %p on create',
    async (ward) => {
      const token = await officer();
      const res = await create(token, { ward });

      expect(res.status).toBe(400);
      expect(res.body.error.fields.ward).toBeDefined();
    },
  );

  it('refuses a Mongo operator in the ward', async () => {
    const token = await officer();
    const res = await create(token, { ward: { $ne: null } });

    expect(res.status).toBe(400);
  });

  it('leaves ward null when none is given', async () => {
    const token = await officer();
    const res = await create(token);

    expect(res.status).toBe(201);
    // Not backfilled, not defaulted to a ward nobody chose.
    expect(res.body.data.ward).toBeNull();
  });

  it('updates a ward, and holds the update to the create rules', async () => {
    const token = await officer();
    const { body } = await create(token, { ward: 'Ward 1' });

    const ok = await request(app)
      .put(`/api/v1/admin/timetable/${body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ward: 'Ward 5' });
    expect(ok.body.data.ward).toBe('Ward 5');

    const bad = await request(app)
      .put(`/api/v1/admin/timetable/${body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ward: 'Ward 9' });
    expect(bad.status).toBe(400);
    // The rejected update changed nothing.
    expect((await TimetableEntry.findById(body.data.id)).ward).toBe('Ward 5');
  });

  it('does not repurpose area — both fields survive together', async () => {
    const token = await officer();
    const res = await create(token, { ward: 'Ward 2', area: 'Temple Lane' });

    expect(res.body.data.ward).toBe('Ward 2');
    expect(res.body.data.area).toBe('Temple Lane');
  });
});

describe('officer timetable ward filter', () => {
  async function seed() {
    const token = await officer();
    await create(token, { ward: 'Ward 1', title: 'W1', isPublished: true });
    await create(token, { ward: 'Ward 3', title: 'W3', isPublished: true });
    await create(token, { ward: 'All Wards', title: 'Common', isPublished: true });
    await create(token, { title: 'Legacy', isPublished: true }); // no ward at all
    return token;
  }

  it('returns everything with no filter', async () => {
    const token = await seed();
    expect((await adminList(token)).body.data.total).toBe(4);
  });

  it.each([
    ['Ward 1', ['W1']],
    ['Ward 3', ['W3']],
    ['All Wards', ['Common']],
    ['Ward 6', []],
  ])('ward %s returns %p', async (ward, titles) => {
    const token = await seed();
    const res = await adminList(token, `?ward=${encodeURIComponent(ward)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.map((e) => e.title)).toEqual(titles);
  });

  it('finds the entries with no ward recorded', async () => {
    const token = await seed();
    const res = await adminList(token, '?ward=unset');

    expect(res.body.data.data.map((e) => e.title)).toEqual(['Legacy']);
  });

  it('composes with the service filter', async () => {
    const token = await seed();
    const res = await adminList(token, '?ward=Ward%201&serviceType=Ghantagadi');

    expect(res.body.data.total).toBe(1);
  });

  it('rejects a ward that is not a ward', async () => {
    const token = await seed();
    expect((await adminList(token, '?ward=Ward%2099')).status).toBe(400);
  });

  it('still refuses an anonymous and a citizen caller', async () => {
    await officer();
    const citizen = await citizenIn('Ward 1', '9876540099');

    expect((await request(app).get('/api/v1/admin/timetable')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/admin/timetable').set('Authorization', `Bearer ${citizen}`))
        .status,
    ).toBe(403);
  });
});

describe('what a citizen sees', () => {
  async function seedAll() {
    const token = await officer();
    for (const w of ALL_SIX) {
      await create(token, { ward: w, title: w, isPublished: true });
    }
    await create(token, { ward: 'All Wards', title: 'Common', isPublished: true });
    await create(token, { title: 'Legacy', isPublished: true });
    await create(token, { ward: 'Ward 1', title: 'W1 draft', isPublished: false });
    return token;
  }

  // Two wards, not one: a single ward would pass even if the ward were hard-coded.
  it.each([
    ['Ward 1', '9876540001'],
    ['Ward 4', '9876540002'],
  ])('a %s citizen sees their own ward and the shared schedule only', async (ward, mobile) => {
    await seedAll();
    const titles = await titlesFor(await citizenIn(ward, mobile));

    expect(titles).toEqual(expect.arrayContaining([ward, 'Common', 'Legacy']));
    ALL_SIX.filter((w) => w !== ward).forEach((other) => expect(titles).not.toContain(other));
  });

  it('never shows a draft, whatever the ward', async () => {
    await seedAll();
    const titles = await titlesFor(await citizenIn('Ward 1', '9876540003'));

    expect(titles).not.toContain('W1 draft');
  });

  it('shows an anonymous visitor the shared schedule and no ward-specific one', async () => {
    await seedAll();
    const titles = await titlesFor(null);

    expect(titles).toEqual(expect.arrayContaining(['Common', 'Legacy']));
    ALL_SIX.forEach((w) => expect(titles).not.toContain(w));
  });

  it('guesses nothing for a citizen whose ward was never recorded', async () => {
    await seedAll();
    // An account from before the ward field existed.
    await User.create({
      role: ROLES.CITIZEN,
      fullName: 'Legacy Citizen',
      mobile: '9876540009',
      passwordHash: await hashPassword('Secret@123'),
      village: 'Sakharale',
      address: 'Old Road',
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ mobile: '9876540009', password: 'Secret@123' });

    const titles = await titlesFor(login.body.data.token);

    expect(titles).toEqual(expect.arrayContaining(['Common', 'Legacy']));
    ALL_SIX.forEach((w) => expect(titles).not.toContain(w));
  });

  it('stays public: a junk token falls back to anonymous rather than 401', async () => {
    await seedAll();
    const res = await request(app)
      .get('/api/v1/timetable')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(200);
    expect(res.body.data.Ghantagadi.map((e) => e.title)).toContain('Common');
  });

  it('keeps the two services apart under a ward filter', async () => {
    const token = await officer();
    await create(token, {
      ward: 'Ward 2',
      serviceType: 'Ghantagadi',
      title: 'Bins',
      isPublished: true,
    });
    await create(token, {
      ward: 'Ward 2',
      serviceType: 'WaterSupply',
      title: 'Taps',
      isPublished: true,
    });
    await create(token, {
      ward: 'Ward 5',
      serviceType: 'WaterSupply',
      title: 'Other taps',
      isPublished: true,
    });

    const citizen = await citizenIn('Ward 2', '9876540011');
    const res = await request(app)
      .get('/api/v1/timetable')
      .set('Authorization', `Bearer ${citizen}`);

    expect(res.body.data.Ghantagadi.map((e) => e.title)).toEqual(['Bins']);
    expect(res.body.data.WaterSupply.map((e) => e.title)).toEqual(['Taps']);
  });
});
