import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Notification } from '../../src/features/notifications/notification.model.js';
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
    Notification.deleteMany({}),
    mongoose.connection.collection('counters').deleteMany({}),
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

async function citizen(mobile = '9876500003') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return res.body.data.token; // registration fires a welcome notification
}

describe('mark all read', () => {
  test('read-all zeroes the unread count', async () => {
    const token = await citizen();
    const before = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);
    expect(before.body.data.unread).toBeGreaterThanOrEqual(1);

    const all = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(all.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.data.unread).toBe(0);
  });
});

describe('notification detail', () => {
  test('citizen reads own notification; officer reads it via admin detail', async () => {
    const cToken = await citizen('9876500004');
    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${cToken}`);
    const id = list.body.data.data[0].id;

    const mine = await request(app)
      .get(`/api/v1/notifications/${id}`)
      .set('Authorization', `Bearer ${cToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.id).toBe(id);

    const oToken = await officerToken();
    const admin = await request(app)
      .get(`/api/v1/admin/notifications/${id}`)
      .set('Authorization', `Bearer ${oToken}`);
    expect(admin.status).toBe(200);
    expect(admin.body.data.id).toBe(id);
  });

  test('unknown notification id -> 404', async () => {
    const token = await citizen('9876500005');
    const res = await request(app)
      .get(`/api/v1/notifications/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
