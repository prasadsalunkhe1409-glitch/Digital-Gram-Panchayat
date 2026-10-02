import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
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
  const cols = await mongoose.connection.db.collections();
  await Promise.all(cols.map((c) => c.deleteMany({})));
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

async function citizen(mobile = '9876500080') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return { token: res.body.data.token, id: res.body.data.user.id };
}

describe('tax bills (upload + citizen view)', () => {
  test('officer attaches a bill; citizen sees it on their record', async () => {
    const oToken = await officer();
    const c = await citizen('9811100080');
    const created = await request(app)
      .post('/api/v1/admin/tax')
      .set('Authorization', `Bearer ${oToken}`)
      .field('citizenId', c.id)
      .field('taxType', 'Property')
      .field('financialYear', '2024-2025')
      .field('amount', '5000')
      .field('propertyNumber', 'PROP-9')
      .attach('bills', PNG, { filename: 'bill.png', contentType: 'image/png' });
    expect(created.status).toBe(201);
    expect(created.body.data.bills).toHaveLength(1);
    expect(created.body.data.bills[0].type).toBe('image');

    const mine = await request(app)
      .get('/api/v1/tax/mine')
      .set('Authorization', `Bearer ${c.token}`);
    expect(mine.body.data.data[0].bills).toHaveLength(1);
  });
});

describe('notice bilingual content', () => {
  test('creating a notice stores both language versions', async () => {
    const oToken = await officer();
    const res = await request(app)
      .post('/api/v1/admin/notices')
      .set('Authorization', `Bearer ${oToken}`)
      .field('title', 'Water supply cut')
      .field('content', 'Supply will be off on Monday')
      .field('isPublished', 'true');
    expect(res.status).toBe(201);
    const { i18n } = res.body.data;
    expect(i18n.title.en).toBe('Water supply cut');
    expect(i18n.title.mr).toContain('Water supply cut');
    expect(i18n.title.mr).not.toBe(i18n.title.en);
  });
});

describe('admin notification broadcast rollup', () => {
  test('a broadcast is one dashboard row with recipient counts', async () => {
    const oToken = await officer();
    await citizen('9811100081');
    await citizen('9811100082');

    const sent = await request(app)
      .post('/api/v1/admin/notifications/broadcast')
      .set('Authorization', `Bearer ${oToken}`)
      .send({ title: 'Office closed', message: 'Closed tomorrow', channels: ['inApp'] });
    expect(sent.status).toBe(200);

    const list = await request(app)
      .get('/api/v1/admin/notifications/broadcasts')
      .set('Authorization', `Bearer ${oToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.data).toHaveLength(1); // one entry, not one-per-recipient
    const row = list.body.data.data[0];
    expect(row.recipientCount).toBe(2);
    expect(row.title).toBe('Office closed');

    const recips = await request(app)
      .get(`/api/v1/admin/notifications/broadcasts/${row.broadcastId}`)
      .set('Authorization', `Bearer ${oToken}`);
    expect(recips.status).toBe(200);
    expect(recips.body.data.recipients).toHaveLength(2);
  });
});
