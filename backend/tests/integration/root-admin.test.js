import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { AuditLog } from '../../src/features/audit/audit.model.js';
import { Notice } from '../../src/features/notices/notice.model.js';
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
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({}), Notice.deleteMany({})]);
});

const PASSWORD = 'Admin@123';

async function seedAdmin(role, email) {
  return User.create({
    role,
    fullName: role === ROLES.ROOT_ADMIN ? 'Root Admin' : 'Panchayat Officer',
    email,
    passwordHash: await hashPassword(PASSWORD),
  });
}

async function adminToken(role, email) {
  const user = await seedAdmin(role, email);
  const res = await request(app).post('/api/v1/admin/login').send({ email, password: PASSWORD });
  return { token: res.body.data.token, user, loginStatus: res.status };
}

async function citizenToken(mobile = '9876500001') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Main Road',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

const NEW_OFFICER = {
  fullName: 'New Officer',
  email: 'new.officer@dgp.local',
  password: 'Officer@123',
};

const list = (token) =>
  request(app).get('/api/v1/admin/admins').set('Authorization', `Bearer ${token}`);
const create = (token, body = NEW_OFFICER) =>
  request(app).post('/api/v1/admin/admins').set('Authorization', `Bearer ${token}`).send(body);
const setStatus = (token, id, status) =>
  request(app)
    .patch(`/api/v1/admin/admins/${id}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status });

/**
 * Who may reach the officer-account routes at all. The gate is ROOT_ADMIN only, which is the
 * one place in the system where being an officer is not enough.
 */
describe('root-admin routes are reachable only by a root admin', () => {
  it('refuses an anonymous caller', async () => {
    expect((await request(app).get('/api/v1/admin/admins')).status).toBe(401);
    expect((await request(app).post('/api/v1/admin/admins').send(NEW_OFFICER)).status).toBe(401);
  });

  it('refuses a citizen', async () => {
    const token = await citizenToken();
    expect((await list(token)).status).toBe(403);
    expect((await create(token)).status).toBe(403);
  });

  it('refuses an ordinary officer', async () => {
    const { token } = await adminToken(ROLES.OFFICER, 'officer@dgp.local');
    // An officer runs the whole portal and still cannot add or remove a colleague.
    expect((await list(token)).status).toBe(403);
    expect((await create(token)).status).toBe(403);
  });

  it('admits a root admin', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    expect((await list(token)).status).toBe(200);
  });
});

describe('creating an officer account', () => {
  it('creates one and never returns a password', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const res = await create(token);

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe(ROLES.OFFICER);
    expect(res.body.data.email).toBe(NEW_OFFICER.email);
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(NEW_OFFICER.password);
  });

  it('creates an account that can actually sign in to the portal', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    await create(token);

    const login = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: NEW_OFFICER.email, password: NEW_OFFICER.password });

    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe(ROLES.OFFICER);
  });

  it('cannot be talked into minting a root admin', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    // `role` is not an input; sending one must change nothing.
    const res = await create(token, { ...NEW_OFFICER, role: ROLES.ROOT_ADMIN });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe(ROLES.OFFICER);
    expect(await User.countDocuments({ role: ROLES.ROOT_ADMIN })).toBe(1);
  });

  it('refuses a duplicate email', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    await create(token);
    const again = await create(token);

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('validates the submitted details', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');

    expect((await create(token, { ...NEW_OFFICER, email: 'not-an-email' })).status).toBe(400);
    expect((await create(token, { ...NEW_OFFICER, password: 'short' })).status).toBe(400);
    expect((await create(token, { ...NEW_OFFICER, fullName: '' })).status).toBe(400);
    expect((await create(token, { ...NEW_OFFICER, ward: 'Ward 99' })).status).toBe(400);
  });

  it('records the creation in the audit trail, without the password', async () => {
    const { token, user: root } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    await create(token);

    const entry = await AuditLog.findOne({ action: 'admin.account.create' }).lean();
    expect(entry).toBeTruthy();
    expect(String(entry.actorId)).toBe(String(root._id));
    expect(entry.actorRole).toBe(ROLES.ROOT_ADMIN);
    expect(entry.at).toBeInstanceOf(Date);
    expect(JSON.stringify(entry)).not.toContain(NEW_OFFICER.password);
    expect(JSON.stringify(entry)).not.toContain('passwordHash');
  });
});

describe('deactivating an officer account', () => {
  it('deactivates one and stops it signing in', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);

    const res = await setStatus(token, created.body.data.id, 'inactive');
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    const login = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: NEW_OFFICER.email, password: NEW_OFFICER.password });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('keeps the record rather than deleting it, so history survives', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);
    await setStatus(token, created.body.data.id, 'inactive');

    // The officer who resolved a complaint must still have a name on it.
    const still = await User.findById(created.body.data.id);
    expect(still).toBeTruthy();
    expect(still.fullName).toBe(NEW_OFFICER.fullName);
  });

  it('can reactivate', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);
    await setStatus(token, created.body.data.id, 'inactive');

    expect((await setStatus(token, created.body.data.id, 'active')).body.data.isActive).toBe(true);
  });

  it('refuses to let a root admin switch themselves off', async () => {
    const { token, user } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const res = await setStatus(token, String(user._id), 'inactive');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_SELF_DEACTIVATE');
  });

  it('refuses to deactivate the last root admin', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const other = await seedAdmin(ROLES.ROOT_ADMIN, 'root2@dgp.local');

    // Two root admins: switching one off is allowed.
    expect((await setStatus(token, String(other._id), 'inactive')).status).toBe(200);
    // Now only the caller is left, and they are not allowed to leave nobody in charge.
    const last = await setStatus(token, String(other._id), 'inactive');
    expect(last.status).toBe(200); // already inactive, idempotent

    const solo = await User.findOne({ role: ROLES.ROOT_ADMIN, isActive: true });
    const res = await setStatus(token, String(solo._id), 'inactive');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_SELF_DEACTIVATE');
  });

  it('always leaves at least one active root admin', async () => {
    const { token, user: caller } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const other = await seedAdmin(ROLES.ROOT_ADMIN, 'root2@dgp.local');

    // With two, either may be switched off.
    expect((await setStatus(token, String(other._id), 'inactive')).status).toBe(200);
    // With one left — the caller — there is no move that empties the role, because the only
    // remaining target is themselves and that is refused.
    expect((await setStatus(token, String(caller._id), 'inactive')).status).toBe(400);

    expect(await User.countDocuments({ role: ROLES.ROOT_ADMIN, isActive: true })).toBe(1);
  });

  it('refuses outright if the target is the last active root admin', async () => {
    // Reached at the service boundary rather than through a request: a caller who is an
    // active root admin always counts toward the total, so the HTTP path is already guarded
    // by CANNOT_SELF_DEACTIVATE. This covers the inner rule directly.
    const { setAdminAccountStatus } =
      await import('../../src/features/users/admin-account.service.js');
    const root = await seedAdmin(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const someoneElse = await seedAdmin(ROLES.OFFICER, 'officer@dgp.local');

    await expect(
      setAdminAccountStatus({
        id: String(root._id),
        actorId: String(someoneElse._id),
        isActive: false,
      }),
    ).rejects.toMatchObject({ code: 'LAST_ROOT_ADMIN' });
  });

  it('refuses to reach a citizen through this route', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    await citizenToken('9876500002');
    const citizen = await User.findOne({ role: ROLES.CITIZEN });

    const res = await setStatus(token, String(citizen._id), 'inactive');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NOT_AN_ADMIN_ACCOUNT');
  });

  it('refuses an ordinary officer trying to deactivate a colleague', async () => {
    const { token: rootTok } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(rootTok);
    const { token: officerTok } = await adminToken(ROLES.OFFICER, 'officer@dgp.local');

    expect((await setStatus(officerTok, created.body.data.id, 'inactive')).status).toBe(403);
  });

  it('audits the deactivation', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);
    await setStatus(token, created.body.data.id, 'inactive');

    const entry = await AuditLog.findOne({ action: 'admin.account.deactivate' }).lean();
    expect(entry).toBeTruthy();
    expect(entry.actorRole).toBe(ROLES.ROOT_ADMIN);
    expect(entry.before.isActive).toBe(true);
    expect(entry.after.isActive).toBe(false);
  });
});

describe('the account list', () => {
  it('shows officers and root admins, never citizens, and never a hash', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    await seedAdmin(ROLES.OFFICER, 'officer@dgp.local');
    await citizenToken('9876500003');

    const res = await list(token);
    const roles = res.body.data.map((u) => u.role).sort();

    expect(roles).toEqual([ROLES.OFFICER, ROLES.ROOT_ADMIN]);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(res.body.data.every((u) => u.password === undefined)).toBe(true);
    // Enough to tell two officers apart, and nothing more.
    expect(res.body.data[0]).toHaveProperty('fullName');
    expect(res.body.data[0]).toHaveProperty('isActive');
    expect(res.body.data[0]).toHaveProperty('createdAt');
  });
});

/**
 * The role is additive: a root admin is an officer everywhere else, and an officer is
 * unchanged. These guard the thing most likely to break quietly.
 */
describe('the existing officer surface is unchanged', () => {
  it('lets a root admin use ordinary officer routes', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    expect(
      (await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/v1/admin/complaints').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(200);
  });

  it('leaves an ordinary officer with exactly the access they had', async () => {
    const { token, loginStatus } = await adminToken(ROLES.OFFICER, 'officer@dgp.local');
    expect(loginStatus).toBe(200);
    expect(
      (await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(200);
  });

  it('still refuses a citizen on officer routes', async () => {
    const token = await citizenToken();
    expect(
      (await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(403);
  });
});

/**
 * A login attempt at the wrong portal is a rejection, not an account change. The shared
 * /auth/session endpoint is role-agnostic by design — the portal gate lives in the UI — so
 * what matters here is that authenticating as one role leaves the account exactly as it was
 * and the next attempt still succeeds.
 */
describe('a portal-mismatch attempt leaves the account untouched', () => {
  const snapshot = (u) => ({
    role: u.role,
    passwordHash: u.passwordHash,
    isActive: u.isActive,
    ward: u.ward ?? null,
    email: u.email,
  });

  const session = (identifier, password) =>
    request(app).post('/api/v1/auth/session').send({ identifier, password });

  it('an officer can still sign in to the officer portal afterwards', async () => {
    await seedAdmin(ROLES.OFFICER, 'officer@dgp.local');
    const before = snapshot(
      await User.findOne({ email: 'officer@dgp.local' }).select('+passwordHash'),
    );

    // The villager page authenticates through the shared endpoint first; the UI then sees an
    // administrative role and refuses to start a citizen session.
    const attempt = await session('officer@dgp.local', PASSWORD);
    expect(attempt.status).toBe(200);
    expect(attempt.body.data.user.role).toBe(ROLES.OFFICER);

    const after = snapshot(
      await User.findOne({ email: 'officer@dgp.local' }).select('+passwordHash'),
    );
    expect(after).toEqual(before);

    const login = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: 'officer@dgp.local', password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it('a root admin can still sign in to the officer portal afterwards', async () => {
    await seedAdmin(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const before = snapshot(
      await User.findOne({ email: 'root@dgp.local' }).select('+passwordHash'),
    );

    expect((await session('root@dgp.local', PASSWORD)).status).toBe(200);

    const after = snapshot(await User.findOne({ email: 'root@dgp.local' }).select('+passwordHash'));
    expect(after).toEqual(before);
    // Role, password, active state and ward are all exactly as they were.
    expect(after.role).toBe(ROLES.ROOT_ADMIN);

    const login = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: 'root@dgp.local', password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe(ROLES.ROOT_ADMIN);
  });

  it('a citizen can still sign in to the villager portal afterwards', async () => {
    await citizenToken('9876500009');
    const before = snapshot(await User.findOne({ mobile: '9876500009' }).select('+passwordHash'));

    expect((await session('9876500009', 'Secret@123')).status).toBe(200);

    const after = snapshot(await User.findOne({ mobile: '9876500009' }).select('+passwordHash'));
    expect(after).toEqual(before);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ mobile: '9876500009', password: 'Secret@123' });
    expect(login.status).toBe(200);
  });

  it('a wrong password is still a wrong password, and still changes nothing', async () => {
    await seedAdmin(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const before = snapshot(
      await User.findOne({ email: 'root@dgp.local' }).select('+passwordHash'),
    );

    expect((await session('root@dgp.local', 'not-the-password')).status).toBe(401);

    const after = snapshot(await User.findOne({ email: 'root@dgp.local' }).select('+passwordHash'));
    expect(after).toEqual(before);
    expect(after.isActive).toBe(true);
  });
});

/**
 * Email identity is case-sensitive. `Admin@dgp.local` and `admin@dgp.local` are two different
 * identifiers, and a login has to match the one that was registered.
 */
describe('login identity is case-sensitive', () => {
  const officerLogin = (email) =>
    request(app).post('/api/v1/admin/login').send({ email, password: PASSWORD });
  const sessionLogin = (identifier) =>
    request(app).post('/api/v1/auth/session').send({ identifier, password: PASSWORD });

  it('accepts the exact registered address', async () => {
    await seedAdmin(ROLES.ROOT_ADMIN, 'admin@dgp.local');
    expect((await officerLogin('admin@dgp.local')).status).toBe(200);
    expect((await sessionLogin('admin@dgp.local')).status).toBe(200);
  });

  it.each(['Admin@dgp.local', 'ADMIN@dgp.local', 'admin@DGP.local'])(
    'rejects %s',
    async (variant) => {
      await seedAdmin(ROLES.ROOT_ADMIN, 'admin@dgp.local');
      expect((await officerLogin(variant)).status).toBe(401);
      expect((await sessionLogin(variant)).status).toBe(401);
    },
  );

  it('stores a created officer address exactly as typed', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const res = await create(token, { ...NEW_OFFICER, email: 'Ward.Officer@dgp.local' });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('Ward.Officer@dgp.local');

    const exact = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: 'Ward.Officer@dgp.local', password: NEW_OFFICER.password });
    expect(exact.status).toBe(200);

    const lowered = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: 'ward.officer@dgp.local', password: NEW_OFFICER.password });
    expect(lowered.status).toBe(401);
  });

  it('treats two capitalisations as two separate accounts', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    expect((await create(token, { ...NEW_OFFICER, email: 'a@dgp.local' })).status).toBe(201);
    // Not a duplicate under a case-sensitive rule.
    expect((await create(token, { ...NEW_OFFICER, email: 'A@dgp.local' })).status).toBe(201);
    // The exact same address still is.
    expect((await create(token, { ...NEW_OFFICER, email: 'a@dgp.local' })).status).toBe(409);
  });

  it('leaves the password comparison alone', async () => {
    await seedAdmin(ROLES.OFFICER, 'officer@dgp.local');
    const res = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: 'officer@dgp.local', password: PASSWORD.toUpperCase() });
    expect(res.status).toBe(401);
  });
});

/**
 * Permanent deletion exists for the account created in error. It is refused the moment the
 * officer is named on anything, because a dangling id is a record that can no longer say who
 * acted on it.
 */
describe('permanently deleting an officer account', () => {
  const remove = (token, id) =>
    request(app).delete(`/api/v1/admin/admins/${id}`).set('Authorization', `Bearer ${token}`);

  it('deletes an officer who has done nothing', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);

    const res = await remove(token, created.body.data.id);
    expect(res.status).toBe(200);
    expect(await User.findById(created.body.data.id)).toBeNull();
  });

  it('stops the deleted officer signing in', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);
    await remove(token, created.body.data.id);

    const login = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: NEW_OFFICER.email, password: NEW_OFFICER.password });
    expect(login.status).toBe(401);
  });

  it('refuses when the officer is named on a record, and says what blocks it', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);

    // The officer publishes a notice — now their id is on the record.
    await Notice.create({
      noticeId: 'NOT-2026-000001',
      title: 'Water supply',
      content: 'Supply will be interrupted on Friday.',
      createdBy: created.body.data.id,
    });

    const res = await remove(token, created.body.data.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACCOUNT_HAS_HISTORY');
    expect(res.body.error.fields.notices).toBe(1);

    // Neither the account nor the record went anywhere.
    expect(await User.findById(created.body.data.id)).toBeTruthy();
    expect(await Notice.countDocuments()).toBe(1);
  });

  it('refuses to delete the caller', async () => {
    const { token, user } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const res = await remove(token, String(user._id));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_SELF_DELETE');
  });

  it('refuses to delete another root admin', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const other = await seedAdmin(ROLES.ROOT_ADMIN, 'root2@dgp.local');

    const res = await remove(token, String(other._id));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_DELETE_ROOT_ADMIN');
    expect(await User.findById(other._id)).toBeTruthy();
  });

  it('refuses to reach a citizen', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    await citizenToken('9876500021');
    const citizen = await User.findOne({ role: ROLES.CITIZEN });

    const res = await remove(token, String(citizen._id));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NOT_AN_ADMIN_ACCOUNT');
    expect(await User.findById(citizen._id)).toBeTruthy();
  });

  it('refuses an ordinary officer, a citizen and an anonymous caller', async () => {
    const { token: rootTok } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(rootTok);
    const { token: officerTok } = await adminToken(ROLES.OFFICER, 'officer@dgp.local');
    const cTok = await citizenToken('9876500022');

    expect((await remove(officerTok, created.body.data.id)).status).toBe(403);
    expect((await remove(cTok, created.body.data.id)).status).toBe(403);
    const anon = await request(app).delete(`/api/v1/admin/admins/${created.body.data.id}`);
    expect(anon.status).toBe(401);
    expect(await User.findById(created.body.data.id)).toBeTruthy();
  });

  it('audits the deletion with the target identity, and no secrets', async () => {
    const { token, user: root } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);
    const res = await remove(token, created.body.data.id);

    expect(JSON.stringify(res.body)).not.toContain(NEW_OFFICER.password);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const entry = await AuditLog.findOne({ action: 'admin.account.delete' }).lean();
    expect(entry).toBeTruthy();
    expect(String(entry.actorId)).toBe(String(root._id));
    expect(entry.actorRole).toBe(ROLES.ROOT_ADMIN);
    expect(entry.before.email).toBe(NEW_OFFICER.email);
    expect(entry.at).toBeInstanceOf(Date);
    expect(JSON.stringify(entry)).not.toContain('passwordHash');
  });

  it('leaves deactivate and reactivate working as before', async () => {
    const { token } = await adminToken(ROLES.ROOT_ADMIN, 'root@dgp.local');
    const created = await create(token);

    const off = await setStatus(token, created.body.data.id, 'inactive');
    expect(off.body.data.isActive).toBe(false);
    const on = await setStatus(token, created.body.data.id, 'active');
    expect(on.body.data.isActive).toBe(true);
    expect(await User.findById(created.body.data.id)).toBeTruthy();
  });
});
