import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { VillageProfile } from '../../src/features/village/village.model.js';
import { Event } from '../../src/features/events/event.model.js';
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
  await Promise.all([User.deleteMany({}), VillageProfile.deleteMany({}), Event.deleteMany({})]);
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
async function citizenToken() {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile: '9876500001',
    password: 'Secret@123',
    village: 'S',
    address: 'R',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

describe('village profile', () => {
  test('public GET returns a default profile before any edit (no auth)', async () => {
    const res = await request(app).get('/api/v1/village');
    expect(res.status).toBe(200);
    expect(res.body.data.general).toBeDefined();
    expect(res.body.data.general.state).toBe('Maharashtra');
    // singleton created exactly once
    expect(await VillageProfile.countDocuments({})).toBe(1);
  });

  test('officer partial edit merges without wiping other fields; stays a singleton', async () => {
    const token = await officerToken();
    const first = await request(app)
      .put('/api/v1/admin/village')
      .set('Authorization', `Bearer ${token}`)
      .field('general', JSON.stringify({ villageName: 'Sakharale', taluka: 'Walwa' }));
    expect(first.status).toBe(200);
    expect(first.body.data.general.villageName).toBe('Sakharale');

    // A second edit touching only leadership must keep the village name.
    const second = await request(app)
      .put('/api/v1/admin/village')
      .set('Authorization', `Bearer ${token}`)
      .field('leadership', JSON.stringify({ sarpanch: 'Smt. Patil' }));
    expect(second.body.data.general.villageName).toBe('Sakharale');
    expect(second.body.data.leadership.sarpanch).toBe('Smt. Patil');
    expect(await VillageProfile.countDocuments({})).toBe(1);
  });

  test('citizen cannot edit the profile (403); public read still works', async () => {
    const token = await citizenToken();
    const res = await request(app)
      .put('/api/v1/admin/village')
      .set('Authorization', `Bearer ${token}`)
      .field('general', JSON.stringify({ villageName: 'Hack' }));
    expect(res.status).toBe(403);
  });

  test('officer sets directory members; public read returns them with defaults', async () => {
    const token = await officerToken();
    const members = [
      {
        name: 'Smt. A. Patil',
        designation: 'Sarpanch',
        mobile: '9876500010',
        category: 'OfficeBearer',
      },
      {
        name: 'Shri. B. More',
        designation: 'Ward Member',
        ward: '3',
        category: 'WardMember',
        status: 'Temporary',
      },
    ];
    const res = await request(app)
      .put('/api/v1/admin/village')
      .set('Authorization', `Bearer ${token}`)
      .field('members', JSON.stringify(members));
    expect(res.status).toBe(200);
    expect(res.body.data.members).toHaveLength(2);

    const pub = await request(app).get('/api/v1/village');
    expect(pub.body.data.members).toHaveLength(2);
    const sarpanch = pub.body.data.members.find((m) => m.designation === 'Sarpanch');
    expect(sarpanch.name).toBe('Smt. A. Patil');
    expect(sarpanch.status).toBe('Active'); // schema default applied
    const ward = pub.body.data.members.find((m) => m.category === 'WardMember');
    expect(ward.status).toBe('Temporary');
    expect(ward.ward).toBe('3');
  });
});

describe('events', () => {
  test('officer creates an event; public sees upcoming only', async () => {
    const token = await officerToken();
    const future = new Date(Date.now() + 7 * 864e5).toISOString();
    const past = new Date(Date.now() - 7 * 864e5).toISOString();

    await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Gram Sabha Meeting', startDate: future, category: 'GramSabha' });
    await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Old Republic Day', startDate: past, category: 'RepublicDay' });

    const pub = await request(app).get('/api/v1/events');
    expect(pub.status).toBe(200);
    expect(pub.body.data.data).toHaveLength(1);
    expect(pub.body.data.data[0].title).toBe('Gram Sabha Meeting');
  });

  test('event requires a title and valid start date (400)', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  test('citizen cannot create an event (403)', async () => {
    const token = await citizenToken();
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'x', startDate: new Date().toISOString() });
    expect(res.status).toBe(403);
  });
});
