import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { TaxRecord } from '../../src/features/tax/tax.model.js';
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
    TaxRecord.deleteMany({}),
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

async function makeCitizen(mobile = '9876500001') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  const user = await User.findOne({ mobile });
  return { token: res.body.data.token, id: user.id };
}

function createRecord(token, citizenId, overrides = {}) {
  return request(app)
    .post('/api/v1/admin/tax')
    .set('Authorization', `Bearer ${token}`)
    .send({
      citizenId,
      propertyNumber: overrides.propertyNumber || 'PROP-101',
      taxType: overrides.taxType || 'Property',
      financialYear: overrides.financialYear || '2025-2026',
      amount: overrides.amount ?? 5000,
    });
}

describe('officer tax record CRUD', () => {
  test('creates a record with balance = amount and Unpaid status', async () => {
    const token = await officerToken();
    const citizen = await makeCitizen();
    const res = await createRecord(token, citizen.id, { amount: 5000 });
    expect(res.status).toBe(201);
    expect(res.body.data.taxRecordId).toMatch(/^TAX-\d{4}-\d{6}$/);
    expect(res.body.data.balance).toBe(5000);
    expect(res.body.data.amountPaid).toBe(0);
    expect(res.body.data.paymentStatus).toBe('Unpaid');
    expect(res.body.data.history).toHaveLength(1);
  });

  test('rejects a non-existent citizen (404)', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/tax')
      .set('Authorization', `Bearer ${token}`)
      .send({
        citizenId: new mongoose.Types.ObjectId().toString(),
        propertyNumber: 'P1',
        taxType: 'Property',
        financialYear: '2025-2026',
        amount: 100,
      });
    expect(res.status).toBe(404);
  });

  test('rejects a negative amount (400)', async () => {
    const token = await officerToken();
    const citizen = await makeCitizen();
    const res = await createRecord(token, citizen.id, { amount: -50 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('update appends history, previous value preserved', async () => {
    const token = await officerToken();
    const citizen = await makeCitizen();
    const created = await createRecord(token, citizen.id, { amount: 5000 });
    const res = await request(app)
      .patch(`/api/v1/admin/tax/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 6000 });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(6000);
    expect(res.body.data.balance).toBe(6000);
    const amountEntry = res.body.data.history.find(
      (h) => h.field === 'amount' && h.action === 'update',
    );
    expect(amountEntry.old).toBe(5000);
    expect(amountEntry.new).toBe(6000);
  });
});

describe('payments + balance', () => {
  test('partial payment sets Partial + correct balance', async () => {
    const token = await officerToken();
    const citizen = await makeCitizen();
    const created = await createRecord(token, citizen.id, { amount: 5000 });

    const res = await request(app)
      .post(`/api/v1/admin/tax/${created.body.data.id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 2000, receiptNo: 'RC-1' });
    expect(res.status).toBe(201);
    expect(res.body.data.amountPaid).toBe(2000);
    expect(res.body.data.balance).toBe(3000);
    expect(res.body.data.paymentStatus).toBe('Partial');
    expect(res.body.data.payments).toHaveLength(1);
  });

  test('full payment sets Paid + zero balance', async () => {
    const token = await officerToken();
    const citizen = await makeCitizen();
    const created = await createRecord(token, citizen.id, { amount: 5000 });
    const id = created.body.data.id;
    await request(app)
      .post(`/api/v1/admin/tax/${id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 2000 });
    const res = await request(app)
      .post(`/api/v1/admin/tax/${id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 3000 });
    expect(res.body.data.amountPaid).toBe(5000);
    expect(res.body.data.balance).toBe(0);
    expect(res.body.data.paymentStatus).toBe('Paid');
    expect(res.body.data.payments).toHaveLength(2);
  });

  test('rejects payment exceeding balance (400)', async () => {
    const token = await officerToken();
    const citizen = await makeCitizen();
    const created = await createRecord(token, citizen.id, { amount: 5000 });
    const res = await request(app)
      .post(`/api/v1/admin/tax/${created.body.data.id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 6000 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_EXCEEDS_BALANCE');
  });

  test('history endpoint returns payments + change log', async () => {
    const token = await officerToken();
    const citizen = await makeCitizen();
    const created = await createRecord(token, citizen.id, { amount: 5000 });
    await request(app)
      .post(`/api/v1/admin/tax/${created.body.data.id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000 });
    const res = await request(app)
      .get(`/api/v1/admin/tax/${created.body.data.id}/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.payments).toHaveLength(1);
    expect(res.body.data.history.some((h) => h.action === 'payment')).toBe(true);
  });
});

describe('citizen view + filtering', () => {
  test('citizen sees only their own records with total dues', async () => {
    const token = await officerToken();
    const a = await makeCitizen('9876500001');
    const b = await makeCitizen('9876500002');
    await createRecord(token, a.id, { amount: 5000, taxType: 'Property' });
    await createRecord(token, a.id, { amount: 1200, taxType: 'Water' });
    await createRecord(token, b.id, { amount: 999, taxType: 'Property' });

    const mine = await request(app)
      .get('/api/v1/tax/mine')
      .set('Authorization', `Bearer ${a.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.data).toHaveLength(2);
    expect(mine.body.data.totalDues).toBe(6200);
  });

  test('financial year filter narrows results', async () => {
    const token = await officerToken();
    const c = await makeCitizen();
    await createRecord(token, c.id, { financialYear: '2024-2025', amount: 1000 });
    await createRecord(token, c.id, { financialYear: '2025-2026', amount: 2000 });

    const res = await request(app)
      .get('/api/v1/tax/mine?financialYear=2025-2026')
      .set('Authorization', `Bearer ${c.token}`);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].financialYear).toBe('2025-2026');
  });
});

describe('authorization + audit', () => {
  test('citizen cannot create a tax record (403)', async () => {
    const c = await makeCitizen();
    const res = await request(app)
      .post('/api/v1/admin/tax')
      .set('Authorization', `Bearer ${c.token}`)
      .send({
        citizenId: c.id,
        propertyNumber: 'P1',
        taxType: 'Property',
        financialYear: '2025-2026',
        amount: 100,
      });
    expect(res.status).toBe(403);
  });

  test('no token cannot view tax/mine (401)', async () => {
    const res = await request(app).get('/api/v1/tax/mine');
    expect(res.status).toBe(401);
  });

  test('audits create / update / payment', async () => {
    const token = await officerToken();
    const c = await makeCitizen();
    const created = await createRecord(token, c.id, { amount: 5000 });
    const id = created.body.data.id;
    await request(app)
      .patch(`/api/v1/admin/tax/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5500 });
    await request(app)
      .post(`/api/v1/admin/tax/${id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500 });

    const counts = await Promise.all(
      ['tax.create', 'tax.update', 'tax.payment'].map((action) =>
        AuditLog.countDocuments({ action }),
      ),
    );
    counts.forEach((count) => expect(count).toBe(1));
  });
});
