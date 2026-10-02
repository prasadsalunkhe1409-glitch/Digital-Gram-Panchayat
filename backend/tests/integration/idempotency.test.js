import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Complaint } from '../../src/features/complaints/complaint.model.js';
import { IdempotencyKey } from '../../src/features/idempotency/idempotency.model.js';

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
    Complaint.deleteMany({}),
    IdempotencyKey.deleteMany({}),
    mongoose.connection.collection('counters').deleteMany({}),
    mongoose.connection.collection('notifications').deleteMany({}),
  ]);
});

async function citizenToken() {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile: '9876500001',
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

function submit(token, key) {
  const req = request(app).post('/api/v1/complaints').set('Authorization', `Bearer ${token}`);
  if (key) req.set('Idempotency-Key', key);
  return req
    .field('category', 'Road')
    .field('title', 'Pothole near temple')
    .field('description', 'Large pothole on the main road');
}

describe('complaint idempotency', () => {
  test('same Idempotency-Key creates the complaint only once', async () => {
    const token = await citizenToken();
    const key = 'offline-complaint-abc-123';

    const first = await submit(token, key);
    expect(first.status).toBe(201);
    const firstId = first.body.data.complaintId;

    const second = await submit(token, key);
    expect(second.status).toBe(201);
    expect(second.body.data.complaintId).toBe(firstId); // replayed, not new

    const count = await Complaint.countDocuments({});
    expect(count).toBe(1);
  });

  test('different keys create distinct complaints', async () => {
    const token = await citizenToken();
    await submit(token, 'key-1');
    await submit(token, 'key-2');
    expect(await Complaint.countDocuments({})).toBe(2);
  });

  test('no Idempotency-Key header behaves exactly as before (no dedupe)', async () => {
    const token = await citizenToken();
    await submit(token);
    await submit(token);
    expect(await Complaint.countDocuments({})).toBe(2);
  });
});
