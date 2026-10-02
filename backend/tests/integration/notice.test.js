import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Notice } from '../../src/features/notices/notice.model.js';
import { Notification } from '../../src/features/notifications/notification.model.js';
import { AuditLog } from '../../src/features/audit/audit.model.js';
import { hashPassword } from '../../src/utils/password.js';

let mongo;
let app;

const PDF = Buffer.from('%PDF-1.4 mock', 'utf8');

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
    Notification.deleteMany({}),
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

async function citizenToken(mobile = '9876500001') {
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

function createNotice(token, overrides = {}) {
  return request(app)
    .post('/api/v1/admin/notices')
    .set('Authorization', `Bearer ${token}`)
    .field('title', overrides.title || 'Water shutdown notice')
    .field('content', overrides.content || 'Water supply off on Sunday')
    .field('category', overrides.category || 'WaterSupply')
    .field('summary', overrides.summary || 'Water off Sunday');
}

describe('officer notice CRUD', () => {
  test('creates a notice (draft) with an NTC id', async () => {
    const token = await officerToken();
    const res = await createNotice(token);
    expect(res.status).toBe(201);
    expect(res.body.data.noticeId).toMatch(/^NTC-\d{4}-\d{6}$/);
    expect(res.body.data.isPublished).toBe(false);
    expect(res.body.data.isActive).toBe(true);
  });

  test('accepts a PDF attachment', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/notices')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Notice with attachment')
      .field('content', 'See attached PDF')
      .attach('attachment', PDF, { filename: 'notice.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.attachmentType).toBe('pdf');
    expect(res.body.data.attachmentUrl).toBeDefined();
  });

  test('rejects a non-pdf/image attachment (400)', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/notices')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Bad attachment')
      .field('content', 'Attaching a text file')
      .attach('attachment', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  test('rejects missing title (400 validation)', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/notices')
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'No title here');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('updates a notice', async () => {
    const token = await officerToken();
    const created = await createNotice(token);
    const res = await request(app)
      .put(`/api/v1/admin/notices/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Updated title');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated title');
  });

  test('publishes then archives a notice', async () => {
    const token = await officerToken();
    const created = await createNotice(token);
    const id = created.body.data.id;

    const pub = await request(app)
      .patch(`/api/v1/admin/notices/${id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.isPublished).toBe(true);
    expect(pub.body.data.publishDate).toBeDefined();

    const arch = await request(app)
      .patch(`/api/v1/admin/notices/${id}/archive`)
      .set('Authorization', `Bearer ${token}`);
    expect(arch.status).toBe(200);
    expect(arch.body.data.isPublished).toBe(false);
  });

  test('soft-deletes a notice (stays in db, isActive false)', async () => {
    const token = await officerToken();
    const created = await createNotice(token);
    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/v1/admin/notices/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const doc = await Notice.findById(id);
    expect(doc).not.toBeNull();
    expect(doc.isActive).toBe(false);

    const adminList = await request(app)
      .get('/api/v1/admin/notices')
      .set('Authorization', `Bearer ${token}`);
    expect(adminList.body.data.total).toBe(0);
  });

  test('writes an audit log for create + publish', async () => {
    const token = await officerToken();
    const created = await createNotice(token);
    await request(app)
      .patch(`/api/v1/admin/notices/${created.body.data.id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    const created_ = await AuditLog.countDocuments({ action: 'notice.create' });
    const published = await AuditLog.countDocuments({ action: 'notice.publish' });
    expect(created_).toBe(1);
    expect(published).toBe(1);
  });
});

describe('authorization', () => {
  test('citizen cannot create a notice (403)', async () => {
    const token = await citizenToken();
    const res = await request(app)
      .post('/api/v1/admin/notices')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Nope')
      .field('content', 'Citizen cannot');
    expect(res.status).toBe(403);
  });

  test('no token cannot list admin notices (401)', async () => {
    const res = await request(app).get('/api/v1/admin/notices');
    expect(res.status).toBe(401);
  });
});

describe('public read', () => {
  test('published notices are readable without a token; drafts are hidden', async () => {
    const token = await officerToken();
    const draft = await createNotice(token, { title: 'Draft notice' });
    const toPublish = await createNotice(token, { title: 'Published notice' });
    await request(app)
      .patch(`/api/v1/admin/notices/${toPublish.body.data.id}/publish`)
      .set('Authorization', `Bearer ${token}`);

    const list = await request(app).get('/api/v1/notices');
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.data[0].title).toBe('Published notice');

    // draft detail is 404 publicly
    const draftDetail = await request(app).get(`/api/v1/notices/${draft.body.data.id}`);
    expect(draftDetail.status).toBe(404);
  });

  test('public search + category filter', async () => {
    const token = await officerToken();
    const n = await createNotice(token, { title: 'Electricity cut', category: 'Electricity' });
    await request(app)
      .patch(`/api/v1/admin/notices/${n.body.data.id}/publish`)
      .set('Authorization', `Bearer ${token}`);

    const search = await request(app).get('/api/v1/notices?q=electricity');
    expect(search.body.data.total).toBe(1);
    const filter = await request(app).get('/api/v1/notices?category=Electricity');
    expect(filter.body.data.total).toBe(1);
    const miss = await request(app).get('/api/v1/notices?category=Health');
    expect(miss.body.data.total).toBe(0);
  });
});

describe('broadcast + notification integration', () => {
  test('broadcast dispatches to all citizens and logs notifications', async () => {
    const token = await officerToken();
    await citizenToken('9876500001');
    await citizenToken('9876500002');
    const notice = await createNotice(token);

    const res = await request(app)
      .post(`/api/v1/admin/notices/${notice.body.data.id}/broadcast`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sms: true, voice: false, summary: 'Water off Sunday 10am-2pm' });

    expect(res.status).toBe(200);
    expect(res.body.data.recipientCount).toBe(2);
    expect(res.body.data.sms).toBe(2);

    const logs = await Notification.countDocuments({ purpose: 'noticeBroadcast', channel: 'sms' });
    expect(logs).toBe(2);

    const audit = await AuditLog.countDocuments({ action: 'notice.broadcast' });
    expect(audit).toBe(1);
  });

  test('broadcast without a summary is rejected (400)', async () => {
    const token = await officerToken();
    const notice = await createNotice(token);
    const res = await request(app)
      .post(`/api/v1/admin/notices/${notice.body.data.id}/broadcast`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sms: true });
    expect(res.status).toBe(400);
  });
});
