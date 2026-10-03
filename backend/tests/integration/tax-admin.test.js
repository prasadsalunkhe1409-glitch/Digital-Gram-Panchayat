import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { TaxRecord } from '../../src/features/tax/tax.model.js';
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
    mongoose.connection.collection('counters').deleteMany({}),
    mongoose.connection.collection('notifications').deleteMany({}),
  ]);
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

async function citizen(mobile = '9876500011') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Ramesh',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return { token: res.body.data.token, id: res.body.data.user.id, mobile };
}

async function makeRecord(token, citizenId, over = {}) {
  const res = await request(app)
    .post('/api/v1/admin/tax')
    .set('Authorization', `Bearer ${token}`)
    .send({
      citizenId,
      taxType: 'Property',
      financialYear: '2024-2025',
      amount: 5000,
      propertyNumber: 'PROP-1',
      ...over,
    });
  return res.body.data;
}

describe('officer tax lookup', () => {
  // The endpoint takes a fragment of a name or number now and returns a shortlist. The full
  // behaviour is covered in tax-citizen-search.test.js; these two keep the contract this
  // suite already relied on honest.
  test('finds a citizen by their full mobile', async () => {
    const token = await officer();
    await citizen('9811110011');
    const res = await request(app)
      .get('/api/v1/admin/tax/lookup?q=9811110011')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].mobile).toBe('9811110011');
    expect(res.body.data[0].fullName).toBe('Ramesh');
  });

  test('no match is an empty shortlist, not a 404', async () => {
    const token = await officer();
    const res = await request(app)
      .get('/api/v1/admin/tax/lookup?q=9700000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('officer tax admin list + detail', () => {
  test('lists with filters and returns detail', async () => {
    const token = await officer();
    const c = await citizen('9811110012');
    const created = await makeRecord(token, c.id);

    const list = await request(app)
      .get('/api/v1/admin/tax?taxType=Property&paymentStatus=Unpaid&q=PROP-1&page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.data[0].taxRecordId).toBe(created.taxRecordId);

    const detail = await request(app)
      .get(`/api/v1/admin/tax/${created.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(created.id);
  });

  test('history endpoint 404 for unknown id', async () => {
    const token = await officer();
    const res = await request(app)
      .get(`/api/v1/admin/tax/${new mongoose.Types.ObjectId()}/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

/**
 * The officer attaches the scanned demand bill instead of transcribing the figure from it —
 * the one step where a typo silently became a citizen's official liability. `amount` therefore
 * became optional, and "unknown" has to stay distinguishable from "nil", or a record with no
 * transcribed figure would announce itself as settled.
 */
describe('tax records raised from a scanned bill', () => {
  // %PDF- so the magic-byte check downstream of multer accepts it.
  const PDF = Buffer.from('%PDF-1.4');

  async function makeFromBill(token, citizenId, fields = {}) {
    const req = request(app)
      .post('/api/v1/admin/tax')
      .set('Authorization', `Bearer ${token}`)
      .field('citizenId', citizenId)
      .field('taxType', 'Property')
      .field('financialYear', '2024-2025')
      .field('propertyNumber', 'PROP-BILL');
    Object.entries(fields).forEach(([k, v]) => req.field(k, v));
    return req.attach('bills', PDF, 'bill.pdf');
  }

  it('creates a record with no amount when a bill is attached', async () => {
    const token = await officer();
    const c = await citizen();
    const res = await makeFromBill(token, c.id);

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBeNull();
    expect(res.body.data.bills).toHaveLength(1);
    // Not 'Paid'. Nothing knows what settling this record would mean.
    expect(res.body.data.paymentStatus).toBe('Unpaid');
    expect(res.body.data.balance).toBe(0);
  });

  it('rejects a record carrying neither an amount nor a bill', async () => {
    const token = await officer();
    const c = await citizen();
    const res = await request(app)
      .post('/api/v1/admin/tax')
      .set('Authorization', `Bearer ${token}`)
      .send({
        citizenId: c.id,
        taxType: 'Property',
        financialYear: '2024-2025',
        propertyNumber: 'PROP-EMPTY',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BILL_REQUIRED');
  });

  it('still accepts a typed amount, and 0 still means a settled nil demand', async () => {
    const token = await officer();
    const c = await citizen();
    const rec = await makeRecord(token, c.id, { amount: 0 });

    expect(rec.amount).toBe(0);
    expect(rec.paymentStatus).toBe('Paid');
  });

  it('records a payment against a bill-only record instead of refusing it', async () => {
    const token = await officer();
    const c = await citizen();
    const created = await makeFromBill(token, c.id);

    // balance is 0 because the total is unknown — that must not read as "nothing left to pay".
    const res = await request(app)
      .post(`/api/v1/admin/tax/${created.body.data.id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 750 });

    expect(res.status).toBe(201);
    expect(res.body.data.amountPaid).toBe(750);
    expect(res.body.data.paymentStatus).toBe('Partial');
  });

  it('settles once the officer fills the amount in from the bill', async () => {
    const token = await officer();
    const c = await citizen();
    const created = await makeFromBill(token, c.id);
    const id = created.body.data.id;

    await request(app)
      .post(`/api/v1/admin/tax/${id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1200 });

    const res = await request(app)
      .patch(`/api/v1/admin/tax/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1200 });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe('Paid');
    expect(res.body.data.balance).toBe(0);
  });
});
