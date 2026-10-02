import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Complaint } from '../../src/features/complaints/complaint.model.js';
import { IdempotencyKey } from '../../src/features/idempotency/idempotency.model.js';
import { hashPassword } from '../../src/utils/password.js';

let mongo;
let app;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

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
    Complaint.deleteMany({}),
    IdempotencyKey.deleteMany({}),
    mongoose.connection.collection('counters').deleteMany({}),
    mongoose.connection.collection('notifications').deleteMany({}),
    mongoose.connection.collection('auditlogs').deleteMany({}),
  ]);
});

async function officer() {
  const doc = await User.create({
    role: ROLES.OFFICER,
    fullName: 'Officer',
    email: 'officer@dgp.local',
    passwordHash: await hashPassword('Admin@123'),
  });
  const res = await request(app)
    .post('/api/v1/admin/login')
    .send({ email: 'officer@dgp.local', password: 'Admin@123' });
  return { token: res.body.data.token, id: doc.id };
}

async function citizen(mobile = '9876500021') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen One',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return { token: res.body.data.token, id: res.body.data.user.id };
}

describe('idempotency: failed request releases the key', () => {
  test('a 4xx does not persist the key, so a corrected retry succeeds', async () => {
    const { token } = await citizen('9876500022');
    const key = 'retry-after-failure-1';

    const bad = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .field('category', 'Road'); // missing title/description -> validation 400
    expect(bad.status).toBe(400);

    const good = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .field('category', 'Road')
      .field('title', 'Now valid complaint')
      .field('description', 'A proper description here');
    expect(good.status).toBe(201);
  });
});

describe('upload limits', () => {
  test('too many images are rejected', async () => {
    const { token } = await citizen('9876500023');
    const req = request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Many photos')
      .field('description', 'Attaching too many images');
    for (let i = 0; i < 4; i += 1) {
      req.attach('images', PNG, { filename: `p${i}.png`, contentType: 'image/png' });
    }
    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOO_MANY_FILES');
  });
});

describe('user management filters + detail', () => {
  test('search + status filter and 404 for unknown user', async () => {
    const { token } = await officer();
    await citizen('9876500024');

    const list = await request(app)
      .get('/api/v1/admin/users?role=citizen&status=active&q=Citizen&page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);

    const missing = await request(app)
      .get(`/api/v1/admin/users/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('USER_NOT_FOUND');
  });
});
