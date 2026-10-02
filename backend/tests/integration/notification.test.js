import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Notification } from '../../src/features/notifications/notification.model.js';
import { AuditLog } from '../../src/features/audit/audit.model.js';
import { smsProvider } from '../../src/features/notifications/providers/index.js';
import * as notificationService from '../../src/features/notifications/notification.service.js';
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
    AuditLog.deleteMany({}),
    mongoose.connection.collection('counters').deleteMany({}),
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

async function citizen(mobile = '9876500001') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  const u = await User.findOne({ mobile });
  return { token: res.body.data.token, id: u.id };
}

describe('provider abstraction', () => {
  test('mock SMS provider reports sent with a message id', async () => {
    const result = await smsProvider.send({ to: '9876500001', title: 'x', message: 'hi' });
    expect(result.status).toBe('sent');
    expect(result.providerMessageId).toBeDefined();
  });
});

describe('notification creation + delivery', () => {
  test('registering a citizen creates a welcome in-app notification + audit', async () => {
    const c = await citizen();
    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${c.token}`);
    expect(list.status).toBe(200);
    const welcome = list.body.data.data.find((n) => n.purpose === 'welcome');
    expect(welcome).toBeDefined();
    expect(welcome.channel).toBe('inApp');
    expect(welcome.status).toBe('sent');

    const created = await AuditLog.countDocuments({ action: 'notification.created' });
    expect(created).toBeGreaterThanOrEqual(1);
  });

  test('notify with an SMS channel dispatches through the provider (delivered)', async () => {
    const c = await citizen();
    const n = await notificationService.notify({
      recipientId: c.id,
      title: 'Test',
      message: 'Hello',
      channels: ['inApp', 'sms'],
      to: '9876500001',
      module: 'system',
    });
    expect(n.status).toBe('delivered');
    expect(n.providerMessageId).toBeDefined();
  });
});

describe('mark as read', () => {
  test('unread count drops after marking read', async () => {
    const c = await citizen();
    const before = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${c.token}`);
    expect(before.body.data.unread).toBeGreaterThanOrEqual(1);

    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${c.token}`);
    const id = list.body.data.data[0].id;

    const read = await request(app)
      .patch(`/api/v1/notifications/${id}/read`)
      .set('Authorization', `Bearer ${c.token}`);
    expect(read.status).toBe(200);
    expect(read.body.data.readAt).toBeDefined();

    const after = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${c.token}`);
    expect(after.body.data.unread).toBe(before.body.data.unread - 1);
  });

  test('a citizen cannot read another citizen’s notification (403)', async () => {
    const a = await citizen('9876500001');
    const b = await citizen('9876500002');
    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${a.token}`);
    const id = list.body.data.data[0].id;
    const res = await request(app)
      .patch(`/api/v1/notifications/${id}/read`)
      .set('Authorization', `Bearer ${b.token}`);
    expect(res.status).toBe(403);
  });
});

describe('broadcast + admin', () => {
  test('officer broadcasts to all citizens; each gets an in-app notification', async () => {
    const o = await officer();
    await citizen('9876500001');
    await citizen('9876500002');

    const res = await request(app)
      .post('/api/v1/admin/notifications/broadcast')
      .set('Authorization', `Bearer ${o.token}`)
      .send({ title: 'Water shutdown', message: 'Water off Sunday', channels: ['inApp'] });
    expect(res.status).toBe(200);
    expect(res.body.data.recipientCount).toBe(2);

    const broadcasts = await Notification.countDocuments({ purpose: 'broadcast' });
    expect(broadcasts).toBe(2);
    const audit = await AuditLog.countDocuments({ action: 'notification.broadcast' });
    expect(audit).toBe(1);
  });

  test('citizen cannot broadcast (403)', async () => {
    const c = await citizen();
    const res = await request(app)
      .post('/api/v1/admin/notifications/broadcast')
      .set('Authorization', `Bearer ${c.token}`)
      .send({ title: 'nope', message: 'no', channels: ['inApp'] });
    expect(res.status).toBe(403);
  });

  test('admin list + stats', async () => {
    const o = await officer();
    await citizen();
    const list = await request(app)
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${o.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);

    const stats = await request(app)
      .get('/api/v1/admin/notifications/stats')
      .set('Authorization', `Bearer ${o.token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);
  });
});

describe('retry + failure handling', () => {
  test('a failed notification can be retried', async () => {
    const o = await officer();
    const c = await citizen();
    // Force a failed notification directly.
    const doc = await Notification.create({
      notificationId: 'NTF-2026-999999',
      recipientId: c.id,
      recipientRole: 'citizen',
      title: 'Failed one',
      message: 'body',
      channel: 'sms',
      channels: ['inApp', 'sms'],
      purpose: 'broadcast',
      to: '9876500001',
      status: 'failed',
      error: 'provider down',
    });

    const res = await request(app)
      .post(`/api/v1/admin/notifications/${doc.id}/retry`)
      .set('Authorization', `Bearer ${o.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.retryCount).toBe(1);
    // mock provider succeeds on retry
    expect(res.body.data.status).toBe('delivered');

    const audit = await AuditLog.countDocuments({ action: 'notification.retried' });
    expect(audit).toBe(1);
  });

  test('retrying a non-failed notification is rejected (400)', async () => {
    const o = await officer();
    const c = await citizen();
    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${c.token}`);
    const id = list.body.data.data[0].id; // welcome = sent
    const res = await request(app)
      .post(`/api/v1/admin/notifications/${id}/retry`)
      .set('Authorization', `Bearer ${o.token}`);
    expect(res.status).toBe(400);
  });
});
