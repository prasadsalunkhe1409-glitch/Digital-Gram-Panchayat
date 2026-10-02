import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
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
    mongoose.connection.collection('auditlogs').deleteMany({}),
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

async function registerCitizen(mobile, ward, fullName = 'Citizen') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName,
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward,
  });
  return { token: res.body.data.token, id: res.body.data.user.id };
}

/** An account as it existed before the ward field — written straight to the collection. */
async function legacyCitizen(mobile = '9876599001', fullName = 'Legacy Citizen') {
  return User.create({
    role: ROLES.CITIZEN,
    fullName,
    mobile,
    passwordHash: await hashPassword('Secret@123'),
    village: 'Sakharale',
    address: 'Old Road',
  });
}

const list = (token, qs = '') =>
  request(app).get(`/api/v1/admin/users${qs}`).set('Authorization', `Bearer ${token}`);

describe('officer assigns a ward', () => {
  it('sets a ward on an account that never had one', async () => {
    const token = await officerToken();
    const legacy = await legacyCitizen();
    expect(legacy.ward).toBeNull();

    const res = await request(app)
      .patch(`/api/v1/admin/users/${legacy.id}/ward`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ward: 'Ward 4' });

    expect(res.status).toBe(200);
    expect(res.body.data.ward).toBe('Ward 4');
    expect((await User.findById(legacy.id)).ward).toBe('Ward 4');
  });

  it('leaves the rest of the account untouched', async () => {
    const token = await officerToken();
    const legacy = await legacyCitizen();

    await request(app)
      .patch(`/api/v1/admin/users/${legacy.id}/ward`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ward: 'Ward 2' });

    const after = await User.findById(legacy.id);
    expect(after.fullName).toBe('Legacy Citizen');
    expect(after.mobile).toBe('9876599001');
    expect(after.village).toBe('Sakharale');
    expect(after.isActive).toBe(true);
  });

  it.each(['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6'])(
    'accepts %s',
    async (ward) => {
      const token = await officerToken();
      const legacy = await legacyCitizen();

      const res = await request(app)
        .patch(`/api/v1/admin/users/${legacy.id}/ward`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ward });

      expect(res.status).toBe(200);
      expect(res.body.data.ward).toBe(ward);
    },
  );

  it.each(['Ward 0', 'Ward 7', 'ward 1', 'Mumbai', ''])('refuses %p', async (ward) => {
    const token = await officerToken();
    const legacy = await legacyCitizen();

    const res = await request(app)
      .patch(`/api/v1/admin/users/${legacy.id}/ward`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ward });

    expect(res.status).toBe(400);
  });

  it('refuses the "unset" filter token — it is not a ward anyone can be assigned', async () => {
    const token = await officerToken();
    const legacy = await legacyCitizen();

    const res = await request(app)
      .patch(`/api/v1/admin/users/${legacy.id}/ward`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ward: 'unset' });

    expect(res.status).toBe(400);
    expect((await User.findById(legacy.id)).ward).toBeNull();
  });

  it('refuses an anonymous caller and a citizen', async () => {
    const token = await officerToken();
    const legacy = await legacyCitizen();
    const { token: citizen } = await registerCitizen('9876599002', 'Ward 1');

    expect(
      (await request(app).patch(`/api/v1/admin/users/${legacy.id}/ward`).send({ ward: 'Ward 1' }))
        .status,
    ).toBe(401);

    expect(
      (
        await request(app)
          .patch(`/api/v1/admin/users/${legacy.id}/ward`)
          .set('Authorization', `Bearer ${citizen}`)
          .send({ ward: 'Ward 1' })
      ).status,
    ).toBe(403);

    // And the officer still can, so the refusals above are about the caller, not the payload.
    expect(
      (
        await request(app)
          .patch(`/api/v1/admin/users/${legacy.id}/ward`)
          .set('Authorization', `Bearer ${token}`)
          .send({ ward: 'Ward 1' })
      ).status,
    ).toBe(200);
  });

  it('writes an audit entry carrying the before and after ward', async () => {
    const token = await officerToken();
    const legacy = await legacyCitizen();

    await request(app)
      .patch(`/api/v1/admin/users/${legacy.id}/ward`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ward: 'Ward 5' });

    const [log] = await mongoose.connection
      .collection('auditlogs')
      .find({ action: 'user.ward.update' })
      .toArray();

    expect(log).toBeDefined();
    expect(log.before.ward).toBeNull();
    expect(log.after.ward).toBe('Ward 5');
  });
});

describe('officer filters users by ward', () => {
  async function seed() {
    const token = await officerToken();
    await registerCitizen('9876599011', 'Ward 1', 'Asha One');
    await registerCitizen('9876599012', 'Ward 1', 'Balu One');
    await registerCitizen('9876599013', 'Ward 3', 'Asha Three');
    await legacyCitizen('9876599014', 'Nowhere Citizen');
    return token;
  }

  it('returns every citizen when no ward is given', async () => {
    const token = await seed();
    const res = await list(token);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(4);
  });

  it.each([
    ['Ward 1', 2],
    ['Ward 3', 1],
    ['Ward 2', 0],
    ['Ward 4', 0],
    ['Ward 5', 0],
    ['Ward 6', 0],
  ])('%s returns %i citizens', async (ward, expected) => {
    const token = await seed();
    const res = await list(token, `?ward=${encodeURIComponent(ward)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(expected);
  });

  it('finds the accounts that never had a ward', async () => {
    const token = await seed();
    const res = await list(token, '?ward=unset');

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].fullName).toBe('Nowhere Citizen');
  });

  it('rejects a ward that is not a ward', async () => {
    const token = await seed();
    expect((await list(token, '?ward=Ward%2099')).status).toBe(400);
    expect((await list(token, '?ward=../etc')).status).toBe(400);
  });

  it('composes with the name search', async () => {
    const token = await seed();
    // Two Ashas, one per ward: the pair together must narrow to one.
    expect((await list(token, '?q=Asha')).body.data.total).toBe(2);
    expect((await list(token, '?ward=Ward%201&q=Asha')).body.data.total).toBe(1);
    expect((await list(token, '?ward=Ward%201&q=Asha')).body.data.data[0].fullName).toBe(
      'Asha One',
    );
  });

  it('composes with the status filter', async () => {
    const token = await seed();
    const one = await list(token, '?ward=Ward%201');
    const target = one.body.data.data[0];

    await request(app)
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'inactive' });

    expect((await list(token, '?ward=Ward%201&status=active')).body.data.total).toBe(1);
    expect((await list(token, '?ward=Ward%201&status=inactive')).body.data.total).toBe(1);
  });

  it('reports a ward for each citizen and null for the ones without', async () => {
    const token = await seed();
    const rows = (await list(token)).body.data.data;
    const byName = Object.fromEntries(rows.map((r) => [r.fullName, r.ward]));

    expect(byName['Asha One']).toBe('Ward 1');
    expect(byName['Nowhere Citizen']).toBeNull();
  });
});
