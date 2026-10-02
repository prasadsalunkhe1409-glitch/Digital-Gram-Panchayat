import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Complaint } from '../../src/features/complaints/complaint.model.js';
import { AuditLog } from '../../src/features/audit/audit.model.js';
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
    AuditLog.deleteMany({}),
    mongoose.connection.collection('counters').deleteMany({}),
  ]);
});

async function registerCitizen(mobile = '9876543210') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Test Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Main Road',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

async function officerToken() {
  await User.create({
    role: ROLES.OFFICER,
    fullName: 'Officer One',
    email: 'officer@dgp.local',
    passwordHash: await hashPassword('Admin@123'),
  });
  const res = await request(app)
    .post('/api/v1/admin/login')
    .send({ email: 'officer@dgp.local', password: 'Admin@123' });
  return res.body.data.token;
}

describe('POST /complaints', () => {
  test('creates a complaint with an image + GPS and a CMP id', async () => {
    const token = await registerCitizen();
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Pothole on main road')
      .field('description', 'Large pothole near the temple')
      .field('latitude', '17.6599')
      .field('longitude', '74.0089')
      .attach('images', PNG, { filename: 'p.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.complaintId).toMatch(/^CMP-\d{4}-\d{6}$/);
    expect(res.body.data.status).toBe('Pending');
    expect(res.body.data.images).toHaveLength(1);
    expect(res.body.data.location.coordinates).toEqual([74.0089, 17.6599]);
    expect(res.body.data.statusHistory).toHaveLength(1);
  });

  test('creates a complaint without GPS (permission denied path)', async () => {
    const token = await registerCitizen();
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'WaterSupply')
      .field('title', 'No water supply')
      .field('description', 'No water since morning');
    expect(res.status).toBe(201);
    expect(res.body.data.location).toBeUndefined();
  });

  test('generates sequential ids', async () => {
    const token = await registerCitizen();
    const mk = () =>
      request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`)
        .field('category', 'Other')
        .field('title', 'Some issue here')
        .field('description', 'Description text');
    const a = await mk();
    const b = await mk();
    const year = new Date().getFullYear();
    expect(a.body.data.complaintId).toBe(`CMP-${year}-000001`);
    expect(b.body.data.complaintId).toBe(`CMP-${year}-000002`);
  });

  test('rejects a 4th image with 400', async () => {
    const token = await registerCitizen();
    const req = request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Too many photos')
      .field('description', 'Attaching four images');
    for (let i = 0; i < 4; i += 1) {
      req.attach('images', PNG, { filename: `p${i}.png`, contentType: 'image/png' });
    }
    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOO_MANY_FILES');
  });

  test('rejects a non-image file with 400', async () => {
    const token = await registerCitizen();
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Bad file type')
      .field('description', 'Attaching a text file')
      .attach('images', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  test('rejects out-of-range latitude with 400 validation error', async () => {
    const token = await registerCitizen();
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Bad coordinates')
      .field('description', 'Latitude out of range')
      .field('latitude', '200')
      .field('longitude', '74');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields.latitude).toBeDefined();
  });

  test('rejects unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/v1/complaints')
      .field('category', 'Road')
      .field('title', 'No token')
      .field('description', 'Should be rejected');
    expect(res.status).toBe(401);
  });

  test('rejects officer creating a complaint with 403', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Officer cannot file')
      .field('description', 'Wrong role');
    expect(res.status).toBe(403);
  });
});

describe('GET /complaints/mine + ownership', () => {
  test('returns only the caller’s complaints', async () => {
    const tokenA = await registerCitizen('9876500001');
    const tokenB = await registerCitizen('9876500002');
    await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('category', 'Road')
      .field('title', 'A complaint one')
      .field('description', 'Belongs to A');

    const mineA = await request(app)
      .get('/api/v1/complaints/mine')
      .set('Authorization', `Bearer ${tokenA}`);
    const mineB = await request(app)
      .get('/api/v1/complaints/mine')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(mineA.body.data.total).toBe(1);
    expect(mineB.body.data.total).toBe(0);
  });

  test('a citizen cannot read another citizen’s complaint (403)', async () => {
    const tokenA = await registerCitizen('9876500001');
    const tokenB = await registerCitizen('9876500002');
    const created = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('category', 'Road')
      .field('title', 'A private complaint')
      .field('description', 'Only for A');

    const res = await request(app)
      .get(`/api/v1/complaints/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });
});

describe('admin list + status update', () => {
  async function seedComplaint(citizenToken) {
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('category', 'Sanitation')
      .field('title', 'Garbage not collected')
      .field('description', 'Overflowing bins');
    return res.body.data;
  }

  test('officer lists, filters, and searches complaints', async () => {
    const citizen = await registerCitizen();
    const officer = await officerToken();
    await seedComplaint(citizen);

    const all = await request(app)
      .get('/api/v1/admin/complaints')
      .set('Authorization', `Bearer ${officer}`);
    expect(all.body.data.total).toBe(1);

    const filtered = await request(app)
      .get('/api/v1/admin/complaints?status=Pending&category=Sanitation')
      .set('Authorization', `Bearer ${officer}`);
    expect(filtered.body.data.total).toBe(1);

    const search = await request(app)
      .get('/api/v1/admin/complaints?q=garbage')
      .set('Authorization', `Bearer ${officer}`);
    expect(search.body.data.total).toBe(1);
  });

  test('citizen is forbidden from the admin list (403)', async () => {
    const citizen = await registerCitizen();
    const res = await request(app)
      .get('/api/v1/admin/complaints')
      .set('Authorization', `Bearer ${citizen}`);
    expect(res.status).toBe(403);
  });

  test('officer updates status → history grows, remark added, audit written', async () => {
    const citizen = await registerCitizen();
    const officer = await officerToken();
    const complaint = await seedComplaint(citizen);

    const res = await request(app)
      .patch(`/api/v1/admin/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${officer}`)
      .send({ status: 'InProgress', remark: 'Team dispatched' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('InProgress');
    expect(res.body.data.statusHistory).toHaveLength(2);
    expect(res.body.data.remarks).toHaveLength(1);

    const audits = await AuditLog.countDocuments({ action: 'complaint.status.update' });
    expect(audits).toBe(1);
  });

  test('resolving without a remark is rejected (400)', async () => {
    const citizen = await registerCitizen();
    const officer = await officerToken();
    const complaint = await seedComplaint(citizen);

    const res = await request(app)
      .patch(`/api/v1/admin/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${officer}`)
      .send({ status: 'Resolved' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.remark).toBeDefined();
  });

  test('status history is retrievable on detail', async () => {
    const citizen = await registerCitizen();
    const officer = await officerToken();
    const complaint = await seedComplaint(citizen);
    await request(app)
      .patch(`/api/v1/admin/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${officer}`)
      .send({ status: 'InProgress', remark: 'Working on it' });

    const detail = await request(app)
      .get(`/api/v1/complaints/${complaint.id}`)
      .set('Authorization', `Bearer ${citizen}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.statusHistory).toHaveLength(2);
    expect(detail.body.data.statusHistory[1].status).toBe('InProgress');
  });
});
