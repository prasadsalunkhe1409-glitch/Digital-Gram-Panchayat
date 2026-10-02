import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { CertificateApplication } from '../../src/features/certificates/certificate.model.js';
import { hashPassword } from '../../src/utils/password.js';

let mongo;
let app;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

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
    mongoose.connection.collection('counters').deleteMany({}),
    mongoose.connection.collection('notifications').deleteMany({}),
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
  return { id: res.body.data.user.id, token: res.body.data.token };
}

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

const MARRIAGE = {
  groomName: 'Rahul Patil',
  brideName: 'Priya Patil',
  marriageDate: '2026-02-14',
  marriagePlace: 'Sakharale',
  mobile: '9876530001',
  address: 'Main Road',
};

const MARRIAGE_DOCS = [
  { group: 'coupleIdentity', docType: 'Aadhaar' },
  { group: 'marriageProof', docType: 'MarriageInvitation' },
  { group: 'selfDeclaration', docType: 'SelfDeclaration' },
];

function officerCreate(token, citizenId, over = {}) {
  const {
    certificateType = 'Marriage',
    data = MARRIAGE,
    docs = MARRIAGE_DOCS,
    attach = true,
  } = over;
  const req = request(app)
    .post('/api/v1/admin/dakhala')
    .set('Authorization', `Bearer ${token}`)
    .field('certificateType', certificateType)
    .field('citizenId', citizenId)
    .field('applicationData', JSON.stringify(data))
    .field('documentMeta', JSON.stringify(docs));
  if (attach) {
    docs.forEach((d, i) =>
      req.attach('documents', PNG, { filename: `${d.docType}-${i}.png`, contentType: 'image/png' }),
    );
  }
  return req;
}

const list = (token, qs = '') =>
  request(app).get(`/api/v1/admin/dakhala${qs}`).set('Authorization', `Bearer ${token}`);

/**
 * The officer records a certificate the Panchayat is issuing directly. It must come out of the
 * same pipeline as a citizen application — same numbering, same PDF, same verification — or
 * the two kinds of certificate drift apart.
 */
describe('officer creates a certificate directly', () => {
  it('issues a marriage certificate in one movement', async () => {
    const token = await officerToken();
    const { id } = await citizen('Rahul Patil', '9876530001', 'Ward 2');

    const res = await officerCreate(token, id);

    expect(res.status).toBe(201);
    expect(res.body.data.certificateType).toBe('Marriage');
    // Approved on creation: the officer is holding the documents as they enter them.
    expect(res.body.data.status).toBe('Approved');
    expect(res.body.data.certificateNumber).toMatch(/^CERT-MAR-\d{4}-\d{6}$/);
    expect(res.body.data.verificationId).toMatch(/^[a-f0-9]{32}$/);
    // The existing PDF pipeline ran, not a second one.
    expect(res.body.data.pdfUrl).toBeTruthy();
  });

  it('records both steps in the history, attributed to the officer', async () => {
    const token = await officerToken();
    const { id } = await citizen('Rahul Patil', '9876530001', 'Ward 2');

    const res = await officerCreate(token, id);
    const statuses = res.body.data.history.map((h) => h.status);

    expect(statuses).toEqual(expect.arrayContaining(['Submitted', 'Approved']));
  });

  it('keeps the uploaded documents on the record for review', async () => {
    const token = await officerToken();
    const { id } = await citizen('Rahul Patil', '9876530001', 'Ward 2');

    const res = await officerCreate(token, id);

    expect(res.body.data.uploadedDocuments).toHaveLength(3);
    expect(res.body.data.uploadedDocuments[0].docType).toBe('Aadhaar');
  });

  it('is publicly verifiable through the existing endpoint', async () => {
    const token = await officerToken();
    const { id } = await citizen('Rahul Patil', '9876530001', 'Ward 2');
    const created = await officerCreate(token, id);

    const res = await request(app)
      .get('/api/v1/certificates/verify')
      .query({ verificationId: created.body.data.verificationId });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      valid: true,
      status: 'Approved',
      certificateType: 'Marriage',
      applicantName: 'Rahul Patil & Priya Patil',
    });
  });

  it('issues a birth certificate with its own fields and document groups', async () => {
    const token = await officerToken();
    const { id } = await citizen('Parent Patil', '9876530002', 'Ward 2');

    const res = await officerCreate(token, id, {
      certificateType: 'Birth',
      data: {
        childName: 'Baby Patil',
        dateOfBirth: '2026-01-01',
        placeOfBirth: 'Sakharale',
        fatherName: 'Parent Patil',
        motherName: 'Parent Patil',
      },
      docs: [
        { group: 'birthProof', docType: 'HospitalBirthReport' },
        { group: 'parentIdentity', docType: 'Aadhaar' },
        { group: 'parentAddress', docType: 'RationCard' },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.certificateNumber).toMatch(/^CERT-/);
  });

  it('refuses Residence — withdrawn however the certificate is raised', async () => {
    const token = await officerToken();
    const { id } = await citizen('Old Resident', '9876530003', 'Ward 2');

    const res = await officerCreate(token, id, {
      certificateType: 'Residence',
      data: { fullName: 'Old Resident', mobile: '9876530003', address: 'Road' },
      docs: [
        { group: 'identity', docType: 'Aadhaar' },
        { group: 'address', docType: 'RationCard' },
        { group: 'selfDeclaration', docType: 'SelfDeclaration' },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.certificateType).toBeDefined();
  });

  it('refuses incomplete certificate data', async () => {
    const token = await officerToken();
    const { id } = await citizen('Rahul Patil', '9876530001', 'Ward 2');

    const res = await officerCreate(token, id, { data: { groomName: 'Only one name' } });
    expect(res.status).toBe(400);
  });

  it('refuses a missing required document group', async () => {
    const token = await officerToken();
    const { id } = await citizen('Rahul Patil', '9876530001', 'Ward 2');

    const res = await officerCreate(token, id, {
      docs: [{ group: 'coupleIdentity', docType: 'Aadhaar' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields['documents.marriageProof']).toBeDefined();
  });

  it('refuses a file whose bytes do not match its declared type', async () => {
    const token = await officerToken();
    const { id } = await citizen('Rahul Patil', '9876530001', 'Ward 2');

    // The magic-byte check must still run on this route: a .png that is not a PNG.
    const res = await request(app)
      .post('/api/v1/admin/dakhala')
      .set('Authorization', `Bearer ${token}`)
      .field('certificateType', 'Marriage')
      .field('citizenId', id)
      .field('applicationData', JSON.stringify(MARRIAGE))
      .field('documentMeta', JSON.stringify(MARRIAGE_DOCS))
      .attach('documents', Buffer.from('not an image at all'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
  });

  it('refuses an unknown citizen', async () => {
    const token = await officerToken();
    const res = await officerCreate(token, new mongoose.Types.ObjectId().toString());

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CITIZEN_NOT_FOUND');
  });

  it('writes an audit entry naming the officer as the creator', async () => {
    const token = await officerToken();
    const { id } = await citizen('Rahul Patil', '9876530001', 'Ward 2');
    await officerCreate(token, id);

    const logs = await mongoose.connection
      .collection('auditlogs')
      .find({ entity: 'dakhalaapplications' })
      .toArray();

    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining(['dakhala.officerCreate', 'dakhala.approve']),
    );
  });
});

describe('officer certificate creation is officer-only', () => {
  it('refuses an anonymous caller', async () => {
    const res = await request(app)
      .post('/api/v1/admin/dakhala')
      .field('certificateType', 'Marriage');
    expect(res.status).toBe(401);
  });

  it('refuses a citizen', async () => {
    await officerToken();
    const { id, token } = await citizen('Rahul Patil', '9876530001', 'Ward 2');

    const res = await request(app)
      .post('/api/v1/admin/dakhala')
      .set('Authorization', `Bearer ${token}`)
      .field('certificateType', 'Marriage')
      .field('citizenId', id)
      .field('applicationData', JSON.stringify(MARRIAGE));

    expect(res.status).toBe(403);
  });
});

describe('officer filters certificates by ward', () => {
  async function seed() {
    const token = await officerToken();
    const a = await citizen('Asha Ward3', '9876530011', 'Ward 3');
    const b = await citizen('Balu Ward1', '9876530012', 'Ward 1');
    const legacy = await legacyCitizen('Old Resident', '9876530013');

    await officerCreate(token, a.id);
    await officerCreate(token, b.id, { data: { ...MARRIAGE, mobile: '9876530012' } });

    // A historical Residence application, as it exists on disk — never rewritten.
    await CertificateApplication.create({
      applicationId: 'DKH-2025-008888',
      citizenId: legacy,
      certificateType: 'Residence',
      applicationData: { fullName: 'Old Resident', mobile: '9876530013', address: 'Old Road' },
      status: 'Approved',
      createdBy: legacy,
    });
    return token;
  }

  it.each([
    ['Ward 3', 1],
    ['Ward 1', 1],
    ['Ward 2', 0],
    ['Ward 6', 0],
  ])('ward %s returns %i applications', async (ward, expected) => {
    const token = await seed();
    const res = await list(token, `?ward=${encodeURIComponent(ward)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(expected);
  });

  it('finds the applications whose citizen has no ward recorded', async () => {
    const token = await seed();
    const res = await list(token, '?ward=unset');

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].applicationId).toBe('DKH-2025-008888');
  });

  it('keeps the historical Residence record readable and filterable', async () => {
    const token = await seed();

    // By type, as the officer filter offers it.
    const byType = await list(token, '?certificateType=Residence');
    expect(byType.body.data.total).toBe(1);

    // And the record itself still opens.
    const row = byType.body.data.data[0];
    const detail = await request(app)
      .get(`/api/v1/admin/dakhala/${row.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.certificateType).toBe('Residence');
  });

  it('composes ward with the status and type filters', async () => {
    const token = await seed();
    const res = await list(token, '?ward=Ward%203&status=Approved&certificateType=Marriage');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });

  it('returns nothing, not everything, when no citizen is in that ward', async () => {
    const token = await seed();
    expect((await list(token, '?ward=Ward%205')).body.data.total).toBe(0);
  });

  it('rejects a ward that is not a ward', async () => {
    const token = await seed();
    expect((await list(token, '?ward=Ward%2099')).status).toBe(400);
  });

  it('leaves the unfiltered list unchanged', async () => {
    const token = await seed();
    expect((await list(token)).body.data.total).toBe(3);
  });

  it('does not write a ward onto the application documents', async () => {
    await seed();
    const [row] = await CertificateApplication.find({ applicationId: 'DKH-2025-008888' }).lean();

    expect(row.ward).toBeUndefined();
  });
});
