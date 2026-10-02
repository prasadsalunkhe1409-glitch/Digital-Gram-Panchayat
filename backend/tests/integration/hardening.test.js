import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Notice } from '../../src/features/notices/notice.model.js';
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
    Notice.deleteMany({}),
    Complaint.deleteMany({}),
    AuditLog.deleteMany({}),
    mongoose.connection.collection('counters').deleteMany({}),
    mongoose.connection.collection('notifications').deleteMany({}),
  ]);
});

async function citizen(mobile = '9876543210') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

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

describe('security headers (helmet + cache)', () => {
  test('sets hardening headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-response-time']).toMatch(/ms$/);
  });

  test('sends a locked-down Content-Security-Policy for the JSON API', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});

describe('CORS allowlist', () => {
  test('rejects a disallowed origin', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://evil.example.com');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CORS_FORBIDDEN');
  });
});

describe('Mongo injection protection', () => {
  test('operator object in login body cannot match a user', async () => {
    await citizen('9811111111');
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ mobile: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400); // sanitized to {} -> validation error, never a match
    expect(res.body.success).toBe(false);
  });
});

describe('authorization', () => {
  test('no token -> 401', async () => {
    const res = await request(app).get('/api/v1/admin/complaints');
    expect(res.status).toBe(401);
  });

  test('citizen token on officer route -> 403', async () => {
    const token = await citizen('9822222222');
    const res = await request(app)
      .get('/api/v1/admin/complaints')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('upload security', () => {
  test('non-image mimetype is rejected', async () => {
    const token = await citizen('9833333333');
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Bad upload attempt')
      .field('description', 'Trying to upload a script file')
      .attach('images', Buffer.from('#!/bin/sh\nrm -rf /'), {
        filename: 'evil.sh',
        contentType: 'application/x-sh',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });
});

describe('audit logging', () => {
  test('a mutation writes an audit entry', async () => {
    const token = await citizen('9844444444');
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Pothole on the main road')
      .field('description', 'Large pothole needs repair')
      .attach('images', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(res.status).toBe(201);

    const logs = await AuditLog.find({ action: 'complaint.create' });
    expect(logs.length).toBe(1);
    expect(logs[0].entity).toBe('complaints');
  });
});

describe('pagination', () => {
  test('limit + page slice the result set with a total', async () => {
    const token = await officer();
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post('/api/v1/admin/notices')
        .set('Authorization', `Bearer ${token}`)
        .field('title', `Notice ${i}`)
        .field('content', 'Body of the notice')
        .field('isPublished', 'true');
    }
    const res = await request(app).get('/api/v1/notices?limit=2&page=1');
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBe(2);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.limit).toBe(2);
  });
});
