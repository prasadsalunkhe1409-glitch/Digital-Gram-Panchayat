import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { CertificateApplication } from '../../src/features/certificates/certificate.model.js';
import { Notification } from '../../src/features/notifications/notification.model.js';
import { AuditLog } from '../../src/features/audit/audit.model.js';
import { VillageProfile } from '../../src/features/village/village.model.js';
import { hashPassword } from '../../src/utils/password.js';

let mongo;
let app;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const MARRIAGE_DATA = {
  groomName: 'Amit Patil',
  brideName: 'Sneha Patil',
  marriageDate: '2026-02-14',
  marriagePlace: 'Sakharale',
  mobile: '9876500001',
  address: '5 Market Rd',
};
const MARRIAGE_DOCS = [
  { group: 'coupleIdentity', docType: 'Aadhaar' },
  { group: 'marriageProof', docType: 'MarriageInvitation' },
  { group: 'selfDeclaration', docType: 'SelfDeclaration' },
];

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
    CertificateApplication.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    VillageProfile.deleteMany({}),
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

async function citizenToken() {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Amit Patil',
    mobile: '9876500001',
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
  });
  return res.body.data.token;
}

/** Apply → officer review → approve (with optional edits). Returns the approved application. */
async function issueCertificate(edits) {
  const cToken = await citizenToken();
  const applyRes = await request(app)
    .post('/api/v1/dakhala')
    .set('Authorization', `Bearer ${cToken}`)
    .field('certificateType', 'Marriage')
    .field('applicationData', JSON.stringify(MARRIAGE_DATA))
    .field('documentMeta', JSON.stringify(MARRIAGE_DOCS))
    .attach('documents', PNG, { filename: 'a.png', contentType: 'image/png' })
    .attach('documents', PNG, { filename: 'b.png', contentType: 'image/png' })
    .attach('documents', PNG, { filename: 'c.png', contentType: 'image/png' });
  const id = applyRes.body.data.id;

  const oToken = await officerToken();
  await request(app)
    .patch(`/api/v1/admin/dakhala/${id}/review`)
    .set('Authorization', `Bearer ${oToken}`);
  const approveRes = await request(app)
    .patch(`/api/v1/admin/dakhala/${id}/approve`)
    .set('Authorization', `Bearer ${oToken}`)
    .send(edits || {});
  return approveRes.body.data;
}

describe('certificate issuance', () => {
  test('approval mints a certificate number, verification id and issue date', async () => {
    const cert = await issueCertificate();
    expect(cert.status).toBe('Approved');
    expect(cert.certificateNumber).toMatch(/^CERT-MAR-\d{4}-\d{6}$/);
    expect(cert.verificationId).toMatch(/^[a-f0-9]{32}$/);
    expect(cert.issuedAt).toBeTruthy();
    expect(cert.pdfUrl).toBeTruthy();
  });

  test('officer edits (applicationData + remarks) are applied before generation', async () => {
    const cert = await issueCertificate({
      applicationData: { address: '99 New Colony' },
      officerRemarks: 'Issued for school admission',
    });
    expect(cert.applicationData.address).toBe('99 New Colony');
    expect(cert.applicationData.groomName).toBe('Amit Patil'); // untouched field preserved
    expect(cert.officerRemarks).toBe('Issued for school admission');
  });
});

describe('public verification', () => {
  test('verifies a genuine certificate by verification id (no auth)', async () => {
    const cert = await issueCertificate();
    const res = await request(app)
      .get('/api/v1/certificates/verify')
      .query({ verificationId: cert.verificationId });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      valid: true,
      status: 'Approved',
      certificateType: 'Marriage',
      certificateNumber: cert.certificateNumber,
      applicantName: 'Amit Patil & Sneha Patil',
    });
  });

  test('verifies by certificate number', async () => {
    const cert = await issueCertificate();
    const res = await request(app)
      .get('/api/v1/certificates/verify')
      .query({ certificateNumber: cert.certificateNumber });
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
  });

  test('unknown certificate returns valid:false (no leak)', async () => {
    const res = await request(app)
      .get('/api/v1/certificates/verify')
      .query({ verificationId: 'deadbeef'.repeat(4) });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ valid: false });
  });

  test('missing query params returns 400', async () => {
    const res = await request(app).get('/api/v1/certificates/verify');
    expect(res.status).toBe(400);
  });
});
