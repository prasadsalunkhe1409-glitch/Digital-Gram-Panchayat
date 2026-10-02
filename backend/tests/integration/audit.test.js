import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Scheme } from '../../src/features/schemes/scheme.model.js';
import { AuditLog } from '../../src/features/audit/audit.model.js';
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
    Scheme.deleteMany({}),
    AuditLog.deleteMany({}),
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

describe('admin audit viewer', () => {
  test('lists audit entries newest-first with actor names', async () => {
    const token = await officerToken();
    // Generate real audit rows by creating + updating a scheme.
    const created = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Audited Scheme')
      .field('description', 'Generates audit rows')
      .field('category', 'Other');
    await request(app)
      .put(`/api/v1/admin/schemes/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Audited Scheme v2');

    const res = await request(app)
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.data[0].at >= res.body.data.data[1].at).toBe(true);
    expect(res.body.data.data[0].actorName).toBe('Officer');
    expect(res.body.data.data.some((r) => r.action === 'scheme.create')).toBe(true);
  });

  test('filters by action prefix', async () => {
    const token = await officerToken();
    await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Filter Scheme')
      .field('description', 'x')
      .field('category', 'Other');
    const res = await request(app)
      .get('/api/v1/admin/audit?action=scheme')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.every((r) => r.action.startsWith('scheme'))).toBe(true);
  });

  test('citizen cannot read the audit trail (403)', async () => {
    const token = await citizenToken();
    const res = await request(app)
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('no token -> 401', async () => {
    const res = await request(app).get('/api/v1/admin/audit');
    expect(res.status).toBe(401);
  });
});
