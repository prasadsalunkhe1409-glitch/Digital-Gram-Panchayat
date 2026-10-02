import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Complaint } from '../../src/features/complaints/complaint.model.js';
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
    Complaint.deleteMany({}),
    TaxRecord.deleteMany({}),
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
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      fullName: `Citizen ${mobile}`,
      mobile,
      password: 'Secret@123',
      village: 'Sakharale',
      address: 'Road',
      ward: 'Ward 1',
    });
  const u = await User.findOne({ mobile });
  return { token: res.body.data.token, id: u.id };
}

async function seedComplaint(citizenId, category, status) {
  await Complaint.create({
    complaintId: `CMP-2026-${Math.floor(Math.random() * 1e6)}`,
    citizenId,
    category,
    title: 'x complaint',
    description: 'desc',
    status,
    statusHistory: [{ status: 'Pending', by: citizenId, at: new Date() }],
  });
}

describe('dashboard metrics', () => {
  test('returns accurate aggregated counts + outstanding tax', async () => {
    const o = await officer();
    const c1 = await citizen('9876500001');
    const c2 = await citizen('9876500002');

    await seedComplaint(c1.id, 'Road', 'Pending');
    await seedComplaint(c1.id, 'WaterSupply', 'Resolved');
    await seedComplaint(c2.id, 'Road', 'InProgress');

    await TaxRecord.create({
      taxRecordId: 'TAX-2026-000001',
      citizenId: c1.id,
      propertyNumber: 'P1',
      taxType: 'Property',
      financialYear: '2025-2026',
      amount: 5000,
      amountPaid: 2000,
      balance: 3000,
      paymentStatus: 'Partial',
      createdBy: o.id,
    });
    await TaxRecord.create({
      taxRecordId: 'TAX-2026-000002',
      citizenId: c2.id,
      propertyNumber: 'P2',
      taxType: 'Water',
      financialYear: '2025-2026',
      amount: 1000,
      amountPaid: 0,
      balance: 1000,
      paymentStatus: 'Unpaid',
      createdBy: o.id,
    });

    const res = await request(app)
      .get('/api/v1/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${o.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalCitizens).toBe(2);
    expect(res.body.data.totalComplaints).toBe(3);
    expect(res.body.data.pendingComplaints).toBe(1);
    expect(res.body.data.resolvedComplaints).toBe(1);
    expect(res.body.data.totalTaxRecords).toBe(2);
    expect(res.body.data.outstandingTax).toBe(4000);
  });

  test('empty system returns zeros', async () => {
    const o = await officer();
    const res = await request(app)
      .get('/api/v1/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${o.token}`);
    expect(res.body.data.totalCitizens).toBe(0);
    expect(res.body.data.outstandingTax).toBe(0);
  });

  test('charts aggregate complaints by category + status', async () => {
    const o = await officer();
    const c = await citizen();
    await seedComplaint(c.id, 'Road', 'Pending');
    await seedComplaint(c.id, 'Road', 'Pending');
    await seedComplaint(c.id, 'WaterSupply', 'Resolved');

    const res = await request(app)
      .get('/api/v1/admin/dashboard/charts')
      .set('Authorization', `Bearer ${o.token}`);
    expect(res.status).toBe(200);
    const road = res.body.data.complaintsByCategory.find((d) => d.label === 'Road');
    expect(road.value).toBe(2);
    const pending = res.body.data.complaintsByStatus.find((d) => d.label === 'Pending');
    expect(pending.value).toBe(2);
  });

  test('activity feed returns recent audit entries', async () => {
    const o = await officer();
    const c = await citizen();
    // trigger an audited action (deactivate)
    await request(app)
      .patch(`/api/v1/admin/users/${c.id}/status`)
      .set('Authorization', `Bearer ${o.token}`)
      .send({ status: 'inactive' });

    const res = await request(app)
      .get('/api/v1/admin/dashboard/activity')
      .set('Authorization', `Bearer ${o.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((a) => a.action === 'user.status.update')).toBe(true);
  });

  test('citizen cannot access the dashboard (403)', async () => {
    const c = await citizen();
    const res = await request(app)
      .get('/api/v1/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${c.token}`);
    expect(res.status).toBe(403);
  });
});

describe('user management', () => {
  test('lists + searches citizens', async () => {
    const o = await officer();
    await citizen('9876500001');
    await citizen('9876500002');

    const all = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${o.token}`);
    expect(all.body.data.total).toBe(2);

    const search = await request(app)
      .get('/api/v1/admin/users?q=9876500001')
      .set('Authorization', `Bearer ${o.token}`);
    expect(search.body.data.total).toBe(1);
  });

  test('filters by status', async () => {
    const o = await officer();
    const c = await citizen('9876500001');
    await citizen('9876500002');
    await request(app)
      .patch(`/api/v1/admin/users/${c.id}/status`)
      .set('Authorization', `Bearer ${o.token}`)
      .send({ status: 'inactive' });

    const inactive = await request(app)
      .get('/api/v1/admin/users?status=inactive')
      .set('Authorization', `Bearer ${o.token}`);
    expect(inactive.body.data.total).toBe(1);
  });

  test('deactivate blocks the citizen on the next request + audits', async () => {
    const o = await officer();
    const c = await citizen();

    await request(app)
      .patch(`/api/v1/admin/users/${c.id}/status`)
      .set('Authorization', `Bearer ${o.token}`)
      .send({ status: 'inactive' });

    // that citizen's existing token is now rejected
    const blocked = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${c.token}`);
    expect(blocked.status).toBe(401);

    const audits = await AuditLog.countDocuments({ action: 'user.status.update' });
    expect(audits).toBe(1);
  });

  test('officer cannot deactivate themselves (400)', async () => {
    const o = await officer();
    const res = await request(app)
      .patch(`/api/v1/admin/users/${o.id}/status`)
      .set('Authorization', `Bearer ${o.token}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_SELF_DEACTIVATE');
  });

  test('view a citizen profile', async () => {
    const o = await officer();
    const c = await citizen();
    const res = await request(app)
      .get(`/api/v1/admin/users/${c.id}`)
      .set('Authorization', `Bearer ${o.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  test('citizen cannot reach user management (403)', async () => {
    const c = await citizen();
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${c.token}`);
    expect(res.status).toBe(403);
  });
});
