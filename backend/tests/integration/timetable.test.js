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

async function citizen() {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile: '9876500021',
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

const ENTRY = {
  serviceType: 'Ghantagadi',
  title: 'Ward 1 collection',
  titleMr: 'प्रभाग १ संकलन',
  area: 'Ward 1',
  day: 'Monday',
  startTime: '07:30',
  endTime: '09:00',
};

function create(token, over = {}) {
  return request(app)
    .post('/api/v1/admin/timetable')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...ENTRY, ...over });
}

describe('public timetable', () => {
  it('names both services even when nothing is published', async () => {
    const res = await request(app).get('/api/v1/timetable');

    expect(res.status).toBe(200);
    // Both keys present with empty arrays: the screen can then say "not published yet" for a
    // service instead of having to infer absence from a missing key.
    expect(res.body.data.Ghantagadi).toEqual([]);
    expect(res.body.data.WaterSupply).toEqual([]);
    expect(res.body.data.updatedAt).toBeNull();
  });

  it('shows published entries and hides unpublished ones', async () => {
    const token = await officer();
    await create(token, { isPublished: true, title: 'Published run' });
    await create(token, { isPublished: false, title: 'Draft run' });

    const res = await request(app).get('/api/v1/timetable');

    const titles = res.body.data.Ghantagadi.map((e) => e.title);
    expect(titles).toContain('Published run');
    expect(titles).not.toContain('Draft run');
  });

  it('needs no authentication', async () => {
    const token = await officer();
    await create(token, { isPublished: true });

    const res = await request(app).get('/api/v1/timetable');
    expect(res.status).toBe(200);
    expect(res.body.data.Ghantagadi).toHaveLength(1);
  });

  it('orders the week as a person reads it, not alphabetically', async () => {
    const token = await officer();
    await create(token, { isPublished: true, day: 'Friday', title: 'Fri' });
    await create(token, { isPublished: true, day: 'Monday', title: 'Mon' });
    await create(token, { isPublished: true, day: 'Daily', title: 'Every day' });

    const res = await request(app).get('/api/v1/timetable');

    // Alphabetical order would have put Friday first.
    expect(res.body.data.Ghantagadi.map((e) => e.title)).toEqual(['Every day', 'Mon', 'Fri']);
  });

  it('keeps the two services apart', async () => {
    const token = await officer();
    await create(token, { isPublished: true, serviceType: 'Ghantagadi', title: 'Bin lorry' });
    await create(token, { isPublished: true, serviceType: 'WaterSupply', title: 'Tap hours' });

    const res = await request(app).get('/api/v1/timetable');

    expect(res.body.data.Ghantagadi.map((e) => e.title)).toEqual(['Bin lorry']);
    expect(res.body.data.WaterSupply.map((e) => e.title)).toEqual(['Tap hours']);
  });
});

describe('officer timetable management', () => {
  it('creates an entry, unpublished by default', async () => {
    const token = await officer();
    const res = await create(token);

    expect(res.status).toBe(201);
    expect(res.body.data.serviceType).toBe('Ghantagadi');
    expect(res.body.data.titleMr).toBe('प्रभाग १ संकलन');
    // Nothing reaches a public page until an officer says so.
    expect(res.body.data.isPublished).toBe(false);
  });

  it('publishes and unpublishes', async () => {
    const token = await officer();
    const { body } = await create(token);

    const published = await request(app)
      .put(`/api/v1/admin/timetable/${body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isPublished: true });
    expect(published.body.data.isPublished).toBe(true);
    expect((await request(app).get('/api/v1/timetable')).body.data.Ghantagadi).toHaveLength(1);

    await request(app)
      .put(`/api/v1/admin/timetable/${body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isPublished: false });
    expect((await request(app).get('/api/v1/timetable')).body.data.Ghantagadi).toHaveLength(0);
  });

  it.each([
    ['9:00', 'a time without a leading zero'],
    ['25:00', 'an hour that does not exist'],
    ['07:60', 'a minute that does not exist'],
    ['morning', 'words instead of a time'],
  ])('rejects %s (%s)', async (startTime) => {
    const token = await officer();
    const res = await create(token, { startTime });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.startTime).toBeDefined();
  });

  it('rejects an unknown service or day', async () => {
    const token = await officer();
    expect((await create(token, { serviceType: 'Electricity' })).status).toBe(400);
    expect((await create(token, { day: 'Someday' })).status).toBe(400);
  });

  it('holds an update to the same rules as a create', async () => {
    const token = await officer();
    const { body } = await create(token);

    const res = await request(app)
      .put(`/api/v1/admin/timetable/${body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startTime: '7:5' });

    expect(res.status).toBe(400);
  });

  it('soft-deletes: the row leaves both lists but still exists', async () => {
    const token = await officer();
    const { body } = await create(token, { isPublished: true });

    const del = await request(app)
      .delete(`/api/v1/admin/timetable/${body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    expect((await request(app).get('/api/v1/timetable')).body.data.Ghantagadi).toHaveLength(0);
    const adminList = await request(app)
      .get('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${token}`);
    expect(adminList.body.data.data).toHaveLength(0);

    // Still on disk, so the audit entry points at something real.
    expect(await TimetableEntry.findById(body.data.id)).not.toBeNull();
  });

  it('writes an audit entry for every change', async () => {
    const token = await officer();
    const { body } = await create(token);
    await request(app)
      .put(`/api/v1/admin/timetable/${body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isPublished: true });

    const logs = await mongoose.connection
      .collection('auditlogs')
      .find({ entity: 'timetable' })
      .toArray();
    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining(['timetable.create', 'timetable.update']),
    );
  });
});

describe('timetable authorization', () => {
  it('refuses an anonymous write', async () => {
    const res = await request(app).post('/api/v1/admin/timetable').send(ENTRY);
    expect(res.status).toBe(401);
  });

  it('refuses a citizen write', async () => {
    const token = await citizen();
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${token}`)
      .send(ENTRY);

    expect(res.status).toBe(403);
  });

  it('refuses a citizen the officer list', async () => {
    const token = await citizen();
    const res = await request(app)
      .get('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
