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
  await Promise.all([User.deleteMany({}), TaxRecord.deleteMany({})]);
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

async function seedCitizen(fullName, mobile, ward) {
  return User.create({
    role: ROLES.CITIZEN,
    fullName,
    mobile,
    village: 'Sakharale',
    address: 'Main Road',
    ...(ward ? { ward } : {}),
    passwordHash: await hashPassword('Secret@123'),
  });
}

const search = (token, q, extra = '') =>
  request(app)
    .get(`/api/v1/admin/tax/lookup?q=${encodeURIComponent(q)}${extra}`)
    .set('Authorization', `Bearer ${token}`);

const names = (res) => res.body.data.map((c) => c.fullName).sort();

/**
 * The officer used to have to type a whole ten-digit mobile to attach a bill to a citizen.
 * At a counter they usually have a partial name, the last digits of a number, or the property
 * number printed on the bill in front of them.
 */
describe('officer citizen search for tax and certificates', () => {
  async function seed() {
    const token = await officerToken();
    const rahul = await seedCitizen('Rahul Patil', '9876500001', 'Ward 3');
    const rahim = await seedCitizen('Rahim Shaikh', '9876500123', 'Ward 1');
    const sunita = await seedCitizen('Sunita Jadhav', '9811100045', 'Ward 3');
    const legacy = await seedCitizen('Old Record', '9811100099'); // registered before wards
    return { token, rahul, rahim, sunita, legacy };
  }

  it('matches a partial name, case-insensitively', async () => {
    const { token } = await seed();

    expect(names(await search(token, 'Rah'))).toEqual(['Rahim Shaikh', 'Rahul Patil']);
    expect(names(await search(token, 'rah'))).toEqual(['Rahim Shaikh', 'Rahul Patil']);
    expect(names(await search(token, 'Rahul'))).toEqual(['Rahul Patil']);
    expect(names(await search(token, 'patil'))).toEqual(['Rahul Patil']);
  });

  it('matches a fragment of a mobile number, not just the whole thing', async () => {
    const { token } = await seed();

    // The trailing digits are what someone reads off a form.
    expect(names(await search(token, '123'))).toEqual(['Rahim Shaikh']);
    expect(names(await search(token, '98111000'))).toEqual(['Old Record', 'Sunita Jadhav']);
    expect(names(await search(token, '9876500001'))).toEqual(['Rahul Patil']);
  });

  it('finds the owner of a property or tax number', async () => {
    const { token, sunita } = await seed();
    await TaxRecord.create({
      taxRecordId: 'TAX-2026-000041',
      citizenId: sunita.id,
      propertyNumber: 'SKH-W3-118',
      taxType: 'Property',
      financialYear: '2025-2026',
      amount: 1200,
      createdBy: sunita.id,
    });

    // The officer has the bill, not the person's details.
    expect(names(await search(token, 'W3-118'))).toEqual(['Sunita Jadhav']);
    expect(names(await search(token, 'SKH'))).toEqual(['Sunita Jadhav']);
    expect(names(await search(token, '000041'))).toEqual(['Sunita Jadhav']);
  });

  it('returns the fields the officer needs to tell two people apart', async () => {
    const { token } = await seed();
    const [hit] = (await search(token, 'Rahul')).body.data;

    expect(hit).toMatchObject({ fullName: 'Rahul Patil', mobile: '9876500001', ward: 'Ward 3' });
    expect(hit.id).toBeTruthy();
  });

  it('reports no ward rather than inventing one for a pre-ward account', async () => {
    const { token } = await seed();
    const [hit] = (await search(token, 'Old Record')).body.data;
    expect(hit.ward).toBeNull();
  });

  it('composes with the ward filter instead of being replaced by it', async () => {
    const { token } = await seed();

    // Every Rahul/Rahim, then only the one in Ward 3.
    expect(names(await search(token, 'Rah'))).toHaveLength(2);
    expect(names(await search(token, 'Rah', '&ward=Ward%203'))).toEqual(['Rahul Patil']);
    expect(names(await search(token, 'Rah', '&ward=Ward%201'))).toEqual(['Rahim Shaikh']);
    expect(names(await search(token, 'Rah', '&ward=Ward%205'))).toEqual([]);
  });

  it('finds pre-ward accounts under the unset token', async () => {
    const { token } = await seed();
    expect(names(await search(token, 'Record', '&ward=unset'))).toEqual(['Old Record']);
  });

  it('returns an empty list rather than a 404 when nothing matches', async () => {
    const { token } = await seed();
    const res = await search(token, 'Nobody');

    // A 404 for "no match" made the field feel broken; an empty shortlist is the truth.
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('treats the fragment as text, not as a pattern', async () => {
    const { token } = await seed();

    // Unescaped, `.*` would match every citizen and `(` would throw inside the RegExp.
    expect((await search(token, '.*')).body.data).toEqual([]);
    expect((await search(token, 'Rah.*Patil')).body.data).toEqual([]);
    const paren = await search(token, '(');
    expect(paren.status).toBe(200);
    expect(paren.body.data).toEqual([]);
  });

  it('never returns officers, only citizens', async () => {
    const { token } = await seed();
    // The officer account is called "Officer"; searching for it must find nobody.
    expect((await search(token, 'Officer')).body.data).toEqual([]);
  });

  it('rejects an empty search and an invalid ward', async () => {
    const { token } = await seed();

    expect((await search(token, '')).status).toBe(400);
    expect((await search(token, 'Rah', '&ward=Mumbai')).status).toBe(400);
  });

  it('is officer-only', async () => {
    await seed();
    expect((await request(app).get('/api/v1/admin/tax/lookup?q=Rah')).status).toBe(401);
  });
});
