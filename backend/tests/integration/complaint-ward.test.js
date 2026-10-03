import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Complaint } from '../../src/features/complaints/complaint.model.js';
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
  await Promise.all([User.deleteMany({}), Complaint.deleteMany({})]);
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

/** Complaints as they already exist on disk — the ward field was free text and often absent. */
async function seedComplaint(over = {}) {
  return Complaint.create({
    complaintId: `CMP-2026-${String(Math.floor(Math.random() * 899999) + 100000)}`,
    citizenId: new mongoose.Types.ObjectId(),
    category: 'WaterSupply',
    title: 'Leak',
    description: 'A leak on the main road needs attention.',
    createdBy: new mongoose.Types.ObjectId(),
    ...over,
  });
}

const list = (token, qs = '') =>
  request(app).get(`/api/v1/admin/complaints${qs}`).set('Authorization', `Bearer ${token}`);

/**
 * The complaint list already read `query.ward` and built a Mongo filter from it, but nothing
 * validated the value. These cover the gate that was missing, and the 'unset' token that
 * finds the complaints filed before the field carried a validated value.
 */
describe('officer complaint ward filter', () => {
  async function seed() {
    const token = await officerToken();
    await seedComplaint({ ward: 'Ward 1', title: 'W1' });
    await seedComplaint({ ward: 'Ward 3', title: 'W3' });
    await seedComplaint({ title: 'No ward' }); // never had one
    await seedComplaint({ ward: '', title: 'Empty ward' }); // legacy free text, blank
    return token;
  }

  it('returns everything with no ward filter', async () => {
    const token = await seed();
    expect((await list(token)).body.data.total).toBe(4);
  });

  it.each([
    ['Ward 1', 1],
    ['Ward 3', 1],
    ['Ward 2', 0],
    ['Ward 6', 0],
  ])('ward %s returns %i complaints', async (ward, expected) => {
    const token = await seed();
    const res = await list(token, `?ward=${encodeURIComponent(ward)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(expected);
  });

  it('finds both shapes of "no ward" under the unset token', async () => {
    const token = await seed();
    const res = await list(token, '?ward=unset');

    // null and '' are both what "never recorded" looks like in this collection.
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.data.map((c) => c.title).sort()).toEqual(['Empty ward', 'No ward']);
  });

  it('rejects a ward that is not a ward', async () => {
    const token = await seed();
    expect((await list(token, '?ward=Ward%2099')).status).toBe(400);
    expect((await list(token, '?ward=Mumbai')).status).toBe(400);
  });

  it('rejects a Mongo operator rather than passing it into the filter', async () => {
    const token = await seed();
    // This is the hole the missing validator left: an object reaching filter.ward directly.
    const res = await list(token, '?ward[$ne]=null');
    expect(res.status).toBe(400);
  });

  it('composes with the existing status and category filters', async () => {
    const token = await officerToken();
    await seedComplaint({ ward: 'Ward 2', category: 'WaterSupply', status: 'Pending', title: 'A' });
    await seedComplaint({ ward: 'Ward 2', category: 'Road', status: 'Pending', title: 'B' });
    await seedComplaint({ ward: 'Ward 4', category: 'WaterSupply', status: 'Pending', title: 'C' });

    expect((await list(token, '?ward=Ward%202')).body.data.total).toBe(2);
    expect((await list(token, '?ward=Ward%202&category=WaterSupply')).body.data.total).toBe(1);
    expect(
      (await list(token, '?ward=Ward%202&category=WaterSupply&status=Pending')).body.data.total,
    ).toBe(1);
  });

  it('leaves historical complaints readable whatever their ward', async () => {
    const token = await officerToken();
    const legacy = await seedComplaint({ ward: 'ward three', title: 'Legacy free text' });

    // A value from before the enum existed is not rewritten and the record still opens.
    const res = await request(app)
      .get(`/api/v1/admin/complaints/${legacy.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.ward).toBe('ward three');
  });
});

/**
 * A complaint's ward decides whose queue it lands in, so it is read from the citizen's own
 * account and never from the request they send.
 */
describe('a complaint takes its ward from the citizen who filed it', () => {
  async function citizenToken(mobile, ward) {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Citizen',
        mobile,
        password: 'Secret@123',
        village: 'Sakharale',
        address: 'Main Road',
        ...(ward ? { ward } : {}),
      });
    return res.body.data.token;
  }

  const file = (token, extra = {}) =>
    request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'WaterSupply')
      .field('title', 'Leak on the main road')
      .field('description', 'Water has been leaking for two days near the temple.')
      .field(Object.keys(extra)[0] ?? 'priority', Object.values(extra)[0] ?? 'Medium');

  it('stamps the ward recorded on the account', async () => {
    const token = await citizenToken('9871100001', 'Ward 4');
    const res = await file(token);

    expect(res.status).toBe(201);
    const stored = await Complaint.findById(res.body.data.id).lean();
    expect(stored.ward).toBe('Ward 4');
  });

  it('ignores a ward the citizen tries to send', async () => {
    const token = await citizenToken('9871100002', 'Ward 2');
    const res = await file(token, { ward: 'Ward 6' });

    expect(res.status).toBe(201);
    // Filing into someone else's ward is exactly what deriving it server-side prevents.
    const stored = await Complaint.findById(res.body.data.id).lean();
    expect(stored.ward).toBe('Ward 2');
  });

  it('lets a citizen with no ward file anyway, carrying no ward', async () => {
    // Accounts created before the ward field exists are not backfilled and not blocked.
    const unwarded = await User.create({
      role: ROLES.CITIZEN,
      fullName: 'Legacy Citizen',
      mobile: '9871100003',
      village: 'Sakharale',
      address: 'Main Road',
      passwordHash: await hashPassword('Secret@123'),
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ mobile: '9871100003', password: 'Secret@123' });
    const res = await file(login.body.data.token);

    expect(res.status).toBe(201);
    const stored = await Complaint.findById(res.body.data.id).lean();
    expect(stored.ward == null).toBe(true);
    expect(String(stored.citizenId)).toBe(String(unwarded._id));
  });

  it('files into the officer ward filter it was stamped with', async () => {
    const cToken = await citizenToken('9871100004', 'Ward 5');
    await file(cToken);
    const oToken = await officerToken();

    expect((await list(oToken, '?ward=Ward%205')).body.data.total).toBe(1);
    expect((await list(oToken, '?ward=Ward%203')).body.data.total).toBe(0);
  });
});
