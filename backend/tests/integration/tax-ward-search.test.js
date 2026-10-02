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

async function citizen(fullName, mobile, ward) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      fullName,
      mobile,
      password: 'Secret@123',
      village: 'Sakharale',
      address: 'Road',
      ward,
    });
  return res.body.data.user.id;
}

/** A citizen as they existed before wards — written straight to the collection. */
async function legacyCitizen(fullName, mobile) {
  const u = await User.create({
    role: ROLES.CITIZEN,
    fullName,
    mobile,
    passwordHash: await hashPassword('Secret@123'),
    village: 'Sakharale',
    address: 'Old Road',
  });
  return u.id;
}

async function makeRecord(token, citizenId, propertyNumber) {
  const res = await request(app)
    .post('/api/v1/admin/tax')
    .set('Authorization', `Bearer ${token}`)
    .send({
      citizenId,
      taxType: 'Property',
      financialYear: '2025-2026',
      amount: 1000,
      propertyNumber,
    });
  return res.body.data;
}

const list = (token, qs = '') =>
  request(app).get(`/api/v1/admin/tax${qs}`).set('Authorization', `Bearer ${token}`);

/**
 * A tax record references a citizen; it does not copy their name or ward. Everything here
 * exercises that indirection — the officer searches for a person, the API resolves citizens
 * first and then constrains the records.
 */
describe('officer tax search and ward filter', () => {
  async function seed() {
    const token = await officerToken();
    const rahulW3 = await citizen('Rahul Patil', '9876520001', 'Ward 3');
    const rahulW1 = await citizen('Rahul Deshmukh', '9876520002', 'Ward 1');
    const sunita = await citizen('Sunita Jadhav', '9876520003', 'Ward 3');
    const legacy = await legacyCitizen('Old Resident', '9876520004');

    await makeRecord(token, rahulW3, 'PROP-A1');
    await makeRecord(token, rahulW1, 'PROP-B2');
    await makeRecord(token, sunita, 'PROP-C3');
    await makeRecord(token, legacy, 'PROP-D4');
    return token;
  }

  it('still finds a record by its taxRecordId', async () => {
    const token = await seed();
    const all = await list(token);
    const target = all.body.data.data[0];

    const res = await list(token, `?q=${target.taxRecordId}`);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].taxRecordId).toBe(target.taxRecordId);
  });

  it('still finds a record by its property number', async () => {
    const token = await seed();
    const res = await list(token, '?q=PROP-C3');

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].propertyNumber).toBe('PROP-C3');
  });

  it('finds records by the citizen name, which the record does not store', async () => {
    const token = await seed();
    const res = await list(token, '?q=Sunita');

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].propertyNumber).toBe('PROP-C3');
  });

  it('matches a partial name, case-insensitively, like the other searches here', async () => {
    const token = await seed();
    // Two Rahuls, in different wards.
    expect((await list(token, '?q=rahul')).body.data.total).toBe(2);
    expect((await list(token, '?q=PATIL')).body.data.total).toBe(1);
  });

  it.each([
    ['Ward 3', 2],
    ['Ward 1', 1],
    ['Ward 2', 0],
    ['Ward 6', 0],
  ])('ward %s returns %i records', async (ward, expected) => {
    const token = await seed();
    const res = await list(token, `?ward=${encodeURIComponent(ward)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(expected);
  });

  it('finds the records whose citizen has no ward recorded', async () => {
    const token = await seed();
    const res = await list(token, '?ward=unset');

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].propertyNumber).toBe('PROP-D4');
  });

  it('composes name and ward — both conditions, not either', async () => {
    const token = await seed();
    // "Rahul" alone matches two; adding Ward 3 must narrow to one, not widen to everything.
    expect((await list(token, '?q=Rahul')).body.data.total).toBe(2);
    const res = await list(token, '?q=Rahul&ward=Ward%203');

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].propertyNumber).toBe('PROP-A1');
  });

  it('composes a property-number search with a ward', async () => {
    const token = await seed();
    // The number belongs to a Ward 3 citizen, so one filter agrees and the other does not.
    expect((await list(token, '?q=PROP-A1&ward=Ward%203')).body.data.total).toBe(1);
    expect((await list(token, '?q=PROP-A1&ward=Ward%201')).body.data.total).toBe(0);
  });

  it('composes with the existing status and type filters', async () => {
    const token = await seed();
    const res = await list(token, '?ward=Ward%203&taxType=Property&paymentStatus=Unpaid');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
  });

  it('returns nothing, not everything, when no citizen matches', async () => {
    const token = await seed();
    // The failure mode this guards: a filter that matches no citizen silently doing nothing
    // and handing the officer the whole register.
    expect((await list(token, '?q=Nobody%20Here')).body.data.total).toBe(0);
    expect((await list(token, '?ward=Ward%205')).body.data.total).toBe(0);
    expect((await list(token, '?q=Rahul&ward=Ward%205')).body.data.total).toBe(0);
  });

  it('rejects a ward that is not a ward', async () => {
    const token = await seed();
    expect((await list(token, '?ward=Ward%2099')).status).toBe(400);
    expect((await list(token, '?ward=%7B%22%24ne%22%3Anull%7D')).status).toBe(400);
  });

  it('keeps pagination correct under a ward filter', async () => {
    const token = await seed();
    const page1 = await list(token, '?ward=Ward%203&page=1&limit=1');

    expect(page1.body.data.total).toBe(2);
    expect(page1.body.data.data).toHaveLength(1);
    expect(page1.body.data.page).toBe(1);

    const page2 = await list(token, '?ward=Ward%203&page=2&limit=1');
    expect(page2.body.data.data).toHaveLength(1);
    expect(page2.body.data.data[0].id).not.toBe(page1.body.data.data[0].id);
  });

  it('leaves the unfiltered list exactly as it was', async () => {
    const token = await seed();
    const res = await list(token);

    expect(res.body.data.total).toBe(4);
  });

  it('does not store a ward on the tax record itself', async () => {
    await seed();
    const [record] = await TaxRecord.find({ propertyNumber: 'PROP-A1' }).lean();

    // The whole point of resolving through the citizen: historical rows are never rewritten.
    expect(record.ward).toBeUndefined();
  });
});
