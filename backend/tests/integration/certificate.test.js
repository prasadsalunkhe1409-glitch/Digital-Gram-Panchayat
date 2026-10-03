import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { CertificateApplication } from '../../src/features/certificates/certificate.model.js';
import { Notification } from '../../src/features/notifications/notification.model.js';
import { AuditLog } from '../../src/features/audit/audit.model.js';
import { generateCertificatePdf } from '../../src/features/certificates/pdf.service.js';
import { hashPassword } from '../../src/utils/password.js';

let mongo;
let app;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

// A minimal but genuine PDF: the upload path verifies the leading bytes, so the issued
// certificate fixture has to actually start with %PDF-.
const PDF = Buffer.from('%PDF-1.4 minimal fixture for upload tests', 'utf8');

const MARRIAGE_DATA = {
  groomName: 'Test Groom',
  brideName: 'Test Bride',
  marriageDate: '2026-02-14',
  marriagePlace: 'Sakharale',
  mobile: '9876500001',
  address: '12 Main Road, Sakharale',
};

// Marriage needs identity for the couple, proof of the marriage, and a self declaration.
// The witness group is optional, so it is deliberately not attached here.
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

async function citizenToken(mobile = '9876500001') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Test Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

function applyMarriage(token, data = MARRIAGE_DATA, withDoc = true) {
  const req = request(app)
    .post('/api/v1/dakhala')
    .set('Authorization', `Bearer ${token}`)
    .field('certificateType', 'Marriage')
    .field('applicationData', JSON.stringify(data));
  if (withDoc) {
    req.field('documentMeta', JSON.stringify(MARRIAGE_DOCS));
    MARRIAGE_DOCS.forEach((d, i) =>
      req.attach('documents', PNG, { filename: `${d.docType}-${i}.png`, contentType: 'image/png' }),
    );
  }
  return req;
}

describe('pdf.service (unit)', () => {
  test('generates a PDF buffer', async () => {
    const buffer = await generateCertificatePdf({
      application: {
        applicationId: 'DKH-2026-000001',
        certificateType: 'Marriage',
        applicationData: MARRIAGE_DATA,
      },
      citizen: { fullName: 'Test Citizen', mobile: '9876500001', village: 'Sakharale' },
      officer: { fullName: 'Officer' },
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('citizen apply', () => {
  test('applies with documents and gets a DKH id', async () => {
    const token = await citizenToken();
    const res = await applyMarriage(token);
    expect(res.status).toBe(201);
    expect(res.body.data.applicationId).toMatch(/^DKH-\d{4}-\d{6}$/);
    expect(res.body.data.status).toBe('Submitted');
    expect(res.body.data.uploadedDocuments).toHaveLength(3);
    expect(res.body.data.uploadedDocuments[0]).toMatchObject({
      group: 'coupleIdentity',
      docType: 'Aadhaar',
    });
    expect(res.body.data.history).toHaveLength(1);
  });

  test('rejects missing required field for the type (400)', async () => {
    const token = await citizenToken();
    const res = await applyMarriage(token, { groomName: 'X', mobile: '9876500001' }, false);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.address).toBeDefined();
  });

  test('rejects an application missing a required document group (400)', async () => {
    const token = await citizenToken();
    const res = await request(app)
      .post('/api/v1/dakhala')
      .set('Authorization', `Bearer ${token}`)
      .field('certificateType', 'Marriage')
      .field('applicationData', JSON.stringify(MARRIAGE_DATA))
      .field('documentMeta', JSON.stringify([{ group: 'coupleIdentity', docType: 'Aadhaar' }]))
      .attach('documents', PNG, { filename: 'id.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields['documents.marriageProof']).toBeDefined();
    expect(res.body.error.fields['documents.selfDeclaration']).toBeDefined();
  });

  test('rejects an unauthenticated apply (401)', async () => {
    const res = await request(app)
      .post('/api/v1/dakhala')
      .field('certificateType', 'Marriage')
      .field('applicationData', JSON.stringify(MARRIAGE_DATA));
    expect(res.status).toBe(401);
  });

  test('officer cannot apply (403)', async () => {
    const token = await officerToken();
    const res = await applyMarriage(token, MARRIAGE_DATA, false);
    expect(res.status).toBe(403);
  });
});

describe('officer issues a prepared certificate', () => {
  test('issuance stores the document the officer attached, notifies, audits', async () => {
    const cToken = await citizenToken();
    const oToken = await officerToken();
    const created = await applyMarriage(cToken);
    const id = created.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/approve`)
      .set('Authorization', `Bearer ${oToken}`)
      .attach('certificate', PDF, { filename: 'issued.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Approved');
    // The stored document is the one the officer attached; nothing was generated for them.
    expect(res.body.data.pdfUrl).toBeDefined();

    const notifs = await Notification.countDocuments({ purpose: 'dakhalaUpdate' });
    expect(notifs).toBe(1);
    const audits = await AuditLog.countDocuments({ action: 'dakhala.approve' });
    expect(audits).toBe(1);
  });

  test('refuses a non-PDF as the issued certificate', async () => {
    const cToken = await citizenToken();
    const oToken = await officerToken();
    const id = (await applyMarriage(cToken)).body.data.id;

    // An image of a certificate is not a certificate. Supporting documents may be photos;
    // the issued artefact may not.
    const res = await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/approve`)
      .set('Authorization', `Bearer ${oToken}`)
      .attach('certificate', PNG, { filename: 'issued.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  test('refuses a non-PDF wearing a PDF name and type', async () => {
    const cToken = await citizenToken();
    const oToken = await officerToken();
    const id = (await applyMarriage(cToken)).body.data.id;

    // Declared application/pdf, actually PNG bytes — caught by the magic-byte check, not by
    // trusting the client's content type.
    const res = await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/approve`)
      .set('Authorization', `Bearer ${oToken}`)
      .attach('certificate', PNG, { filename: 'issued.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
  });

  test('refuses a citizen trying to issue their own certificate', async () => {
    const cToken = await citizenToken();
    const id = (await applyMarriage(cToken)).body.data.id;

    const res = await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/approve`)
      .set('Authorization', `Bearer ${cToken}`)
      .attach('certificate', PDF, { filename: 'issued.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(403);
  });

  test('refuses an anonymous caller trying to issue a certificate', async () => {
    const cToken = await citizenToken();
    const id = (await applyMarriage(cToken)).body.data.id;

    const res = await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/approve`)
      .attach('certificate', PDF, { filename: 'issued.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(401);
  });

  test('stores the issued certificate against the application the officer acted on', async () => {
    const cToken = await citizenToken();
    const oToken = await officerToken();
    const a = (await applyMarriage(cToken)).body.data.id;
    const b = (await applyMarriage(cToken)).body.data.id;

    await request(app)
      .patch(`/api/v1/admin/dakhala/${a}/approve`)
      .set('Authorization', `Bearer ${oToken}`)
      .attach('certificate', PDF, { filename: 'issued.pdf', contentType: 'application/pdf' });

    const issued = await request(app)
      .get(`/api/v1/admin/dakhala/${a}`)
      .set('Authorization', `Bearer ${oToken}`);
    const untouched = await request(app)
      .get(`/api/v1/admin/dakhala/${b}`)
      .set('Authorization', `Bearer ${oToken}`);

    expect(issued.body.data.pdfUrl).toBeDefined();
    expect(issued.body.data.status).toBe('Approved');
    // The other application must be entirely unaffected by the issuance.
    expect(untouched.body.data.pdfUrl).toBeUndefined();
    expect(untouched.body.data.status).not.toBe('Approved');
  });

  test('records who issued it and when, through the existing audit trail', async () => {
    const cToken = await citizenToken();
    const oToken = await officerToken();
    const id = (await applyMarriage(cToken)).body.data.id;

    await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/approve`)
      .set('Authorization', `Bearer ${oToken}`)
      .attach('certificate', PDF, { filename: 'issued.pdf', contentType: 'application/pdf' });

    const entry = await AuditLog.findOne({ action: 'dakhala.approve' }).lean();
    expect(entry).toBeTruthy();
    expect(entry.actorRole).toBe('officer');
    expect(entry.actorId).toBeTruthy();
    expect(entry.at).toBeInstanceOf(Date); // the audit log's own timestamp field
  });

  test('refuses to issue without the prepared certificate attached', async () => {
    const cToken = await citizenToken();
    const oToken = await officerToken();
    const created = await applyMarriage(cToken);
    const id = created.body.data.id;

    // This is the behaviour that replaced "Generate & approve": the system does not author a
    // certificate, so an approve carrying no document has nothing to issue.
    const res = await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/approve`)
      .set('Authorization', `Bearer ${oToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CERTIFICATE_REQUIRED');

    // And nothing was half-issued: no number, no verification id, still awaiting a decision.
    const after = await request(app)
      .get(`/api/v1/admin/dakhala/${id}`)
      .set('Authorization', `Bearer ${oToken}`);
    expect(after.body.data.status).not.toBe('Approved');
    expect(after.body.data.certificateNumber).toBeUndefined();
    expect(after.body.data.pdfUrl).toBeUndefined();
  });

  test('citizen can download own approved certificate; others cannot', async () => {
    const cToken = await citizenToken('9876500001');
    const otherToken = await citizenToken('9876500002');
    const oToken = await officerToken();
    const created = await applyMarriage(cToken);
    const id = created.body.data.id;

    // not ready before approval
    const early = await request(app)
      .get(`/api/v1/dakhala/${id}/certificate`)
      .set('Authorization', `Bearer ${cToken}`);
    expect(early.status).toBe(404);

    await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/approve`)
      .set('Authorization', `Bearer ${oToken}`)
      .attach('certificate', PDF, { filename: 'issued.pdf', contentType: 'application/pdf' });

    const own = await request(app)
      .get(`/api/v1/dakhala/${id}/certificate`)
      .set('Authorization', `Bearer ${cToken}`);
    expect(own.status).toBe(200);
    expect(own.body.data.pdfUrl).toBeDefined();

    const other = await request(app)
      .get(`/api/v1/dakhala/${id}/certificate`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(other.status).toBe(403);
  });
});

describe('officer reject', () => {
  test('reject requires a reason (400) then rejects + notifies', async () => {
    const cToken = await citizenToken();
    const oToken = await officerToken();
    const created = await applyMarriage(cToken);
    const id = created.body.data.id;

    const noReason = await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/reject`)
      .set('Authorization', `Bearer ${oToken}`)
      .send({});
    expect(noReason.status).toBe(400);

    const res = await request(app)
      .patch(`/api/v1/admin/dakhala/${id}/reject`)
      .set('Authorization', `Bearer ${oToken}`)
      .send({ reason: 'Documents illegible' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Rejected');
    expect(res.body.data.rejectionReason).toBe('Documents illegible');

    const notifs = await Notification.countDocuments({ purpose: 'dakhalaUpdate' });
    expect(notifs).toBe(1);
  });
});

describe('ownership + authorization', () => {
  test('citizen cannot read another citizen application (403)', async () => {
    const aToken = await citizenToken('9876500001');
    const bToken = await citizenToken('9876500002');
    const created = await applyMarriage(aToken);
    const res = await request(app)
      .get(`/api/v1/dakhala/${created.body.data.id}`)
      .set('Authorization', `Bearer ${bToken}`);
    expect(res.status).toBe(403);
  });

  test('citizen cannot reach the admin list (403)', async () => {
    const cToken = await citizenToken();
    const res = await request(app)
      .get('/api/v1/admin/dakhala')
      .set('Authorization', `Bearer ${cToken}`);
    expect(res.status).toBe(403);
  });

  test('officer lists + filters by status', async () => {
    const cToken = await citizenToken();
    const oToken = await officerToken();
    await applyMarriage(cToken);
    const all = await request(app)
      .get('/api/v1/admin/dakhala')
      .set('Authorization', `Bearer ${oToken}`);
    expect(all.body.data.total).toBe(1);
    const submitted = await request(app)
      .get('/api/v1/admin/dakhala?status=Submitted')
      .set('Authorization', `Bearer ${oToken}`);
    expect(submitted.body.data.total).toBe(1);
    const approved = await request(app)
      .get('/api/v1/admin/dakhala?status=Approved')
      .set('Authorization', `Bearer ${oToken}`);
    expect(approved.body.data.total).toBe(0);
  });
});
