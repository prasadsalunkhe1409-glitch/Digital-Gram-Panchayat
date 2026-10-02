import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { ROLES } from '@dgp/shared';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Scheme } from '../../src/features/schemes/scheme.model.js';
import { AuditLog } from '../../src/features/audit/audit.model.js';
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
    Scheme.deleteMany({}),
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
    fullName: 'Citizen',
    mobile,
    password: 'Secret@123',
    village: 'Sakharale',
    address: 'Road',
    ward: 'Ward 1',
  });
  return res.body.data.token;
}

function createScheme(token, overrides = {}) {
  const req = request(app)
    .post('/api/v1/admin/schemes')
    .set('Authorization', `Bearer ${token}`)
    .field('title', overrides.title || 'PM Awas Yojana')
    .field('description', overrides.description || 'Housing subsidy for rural families')
    .field('category', overrides.category || 'Housing')
    .field('officialWebsite', overrides.officialWebsite || 'https://pmaymis.gov.in');
  if (overrides.summary) req.field('summary', overrides.summary);
  return req;
}

describe('officer scheme CRUD', () => {
  test('creates a scheme with an SCH id', async () => {
    const token = await officerToken();
    const res = await createScheme(token, { summary: 'Rural housing' });
    expect(res.status).toBe(201);
    expect(res.body.data.schemeId).toMatch(/^SCH-\d{4}-\d{6}$/);
    expect(res.body.data.isPublished).toBe(false);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.officialWebsite).toBe('https://pmaymis.gov.in');
  });

  test('accepts an optional image', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Scheme with image')
      .field('description', 'Has a banner image')
      .attach('image', PNG, { filename: 's.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.imageUrl).toBeDefined();
  });

  test('parses requiredDocuments from newline string', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Docs scheme')
      .field('description', 'Needs documents')
      .field('requiredDocuments', 'Aadhaar\nRation card\nIncome certificate');
    expect(res.status).toBe(201);
    expect(res.body.data.requiredDocuments).toEqual([
      'Aadhaar',
      'Ration card',
      'Income certificate',
    ]);
  });

  test('rejects an invalid official website (400)', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Bad url scheme')
      .field('description', 'Invalid website')
      .field('officialWebsite', 'not-a-url');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.officialWebsite).toBeDefined();
  });

  test('rejects missing title (400)', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'No title');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('updates a scheme', async () => {
    const token = await officerToken();
    const created = await createScheme(token);
    const res = await request(app)
      .put(`/api/v1/admin/schemes/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'PM Awas Yojana (Gramin)');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('PM Awas Yojana (Gramin)');
  });

  test('publishes then unpublishes', async () => {
    const token = await officerToken();
    const created = await createScheme(token);
    const id = created.body.data.id;

    const pub = await request(app)
      .patch(`/api/v1/admin/schemes/${id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(pub.body.data.isPublished).toBe(true);
    expect(pub.body.data.publishDate).toBeDefined();

    const unpub = await request(app)
      .patch(`/api/v1/admin/schemes/${id}/unpublish`)
      .set('Authorization', `Bearer ${token}`);
    expect(unpub.body.data.isPublished).toBe(false);
  });

  test('soft-deletes a scheme', async () => {
    const token = await officerToken();
    const created = await createScheme(token);
    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/v1/admin/schemes/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const doc = await Scheme.findById(id);
    expect(doc.isActive).toBe(false);

    const list = await request(app)
      .get('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.data.total).toBe(0);
  });

  test('audits create / update / publish / unpublish / delete', async () => {
    const token = await officerToken();
    const created = await createScheme(token);
    const id = created.body.data.id;
    await request(app)
      .put(`/api/v1/admin/schemes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('summary', 'Updated');
    await request(app)
      .patch(`/api/v1/admin/schemes/${id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .patch(`/api/v1/admin/schemes/${id}/unpublish`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .delete(`/api/v1/admin/schemes/${id}`)
      .set('Authorization', `Bearer ${token}`);

    const actions = [
      'scheme.create',
      'scheme.update',
      'scheme.publish',
      'scheme.unpublish',
      'scheme.delete',
    ];
    const counts = await Promise.all(actions.map((action) => AuditLog.countDocuments({ action })));
    counts.forEach((count) => expect(count).toBe(1));
  });
});

describe('authorization', () => {
  test('citizen cannot create a scheme (403)', async () => {
    const token = await citizenToken();
    const res = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Nope')
      .field('description', 'Citizen cannot');
    expect(res.status).toBe(403);
  });

  test('no token cannot list admin schemes (401)', async () => {
    const res = await request(app).get('/api/v1/admin/schemes');
    expect(res.status).toBe(401);
  });
});

describe('public browse', () => {
  test('only published schemes are public; search + category filter work', async () => {
    const token = await officerToken();
    await createScheme(token, { title: 'Draft scheme' }); // stays draft
    const published = await createScheme(token, {
      title: 'Kisan Credit Card',
      category: 'Agriculture',
    });
    await request(app)
      .patch(`/api/v1/admin/schemes/${published.body.data.id}/publish`)
      .set('Authorization', `Bearer ${token}`);

    const list = await request(app).get('/api/v1/schemes');
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.data[0].title).toBe('Kisan Credit Card');

    const search = await request(app).get('/api/v1/schemes?q=kisan');
    expect(search.body.data.total).toBe(1);

    const cat = await request(app).get('/api/v1/schemes?category=Agriculture');
    expect(cat.body.data.total).toBe(1);
    const miss = await request(app).get('/api/v1/schemes?category=Health');
    expect(miss.body.data.total).toBe(0);
  });

  test('public detail 404 for a draft scheme', async () => {
    const token = await officerToken();
    const draft = await createScheme(token);
    const res = await request(app).get(`/api/v1/schemes/${draft.body.data.id}`);
    expect(res.status).toBe(404);
  });
});

describe('scheme editing — attachments, expiry, publish toggle (stabilization)', () => {
  const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

  test('edit updates in place: attachments append/remove, expiry end-of-day, publish toggle works', async () => {
    const token = await officerToken();

    // Create with a banner + one attachment.
    const created = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Solar Pump Subsidy')
      .field('description', 'Subsidy for farm solar pumps')
      .field('category', 'Agriculture')
      .attach('image', PNG, 'banner.png')
      .attach('attachments', PDF, 'form-a.pdf');
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const schemeId = created.body.data.schemeId;
    expect(created.body.data.attachments).toHaveLength(1);
    expect(created.body.data.imageUrl).toMatch(/\/api\/v1\/uploads\//);
    const firstUrl = created.body.data.attachments[0].url;

    // Edit: change title, set a date-only expiry, publish, remove the old
    // attachment, add a new one — all in one save.
    const updated = await request(app)
      .put(`/api/v1/admin/schemes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Solar Pump Subsidy 2.0')
      .field('expiryDate', '2099-01-15')
      .field('isPublished', 'true')
      .field('removeAttachments', firstUrl)
      .attach('attachments', PDF, 'form-b.pdf');
    expect(updated.status).toBe(200);

    // Same document — same schemeId, no duplicate row.
    expect(updated.body.data.schemeId).toBe(schemeId);
    expect(await Scheme.countDocuments({})).toBe(1);

    // Publish toggle from the edit form actually took effect.
    expect(updated.body.data.isPublished).toBe(true);

    // Old attachment gone, new one present.
    expect(updated.body.data.attachments).toHaveLength(1);
    expect(updated.body.data.attachments[0].name).toBe('form-b.pdf');
    expect(updated.body.data.attachments[0].url).not.toBe(firstUrl);

    // Date-only expiry rolled to end of day, so it stays public ON the expiry date.
    expect(new Date(updated.body.data.expiryDate).getUTCHours()).toBe(23);

    // Villagers immediately see the updated content.
    const pub = await request(app).get(`/api/v1/schemes/${id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.title).toBe('Solar Pump Subsidy 2.0');
    expect(pub.body.data.attachments).toHaveLength(1);

    // Banner removal on a later edit.
    const cleared = await request(app)
      .put(`/api/v1/admin/schemes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('removeImage', 'true');
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.imageUrl).toBeUndefined();
  });

  test('non-image banner is rejected', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Bad Banner Scheme')
      .field('description', 'Banner must be an image')
      .attach('image', PDF, 'not-an-image.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });
});

describe('scheme bilingual + asset cleanup (production improvements)', () => {
  test('create auto-translates fields into en+mr', async () => {
    const token = await officerToken();
    const res = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Clean Water Scheme')
      .field('description', 'Piped water for every household')
      .field('category', 'Other');
    expect(res.status).toBe(201);
    expect(res.body.data.i18n).toBeDefined();
    expect(res.body.data.i18n.title.en).toBe('Clean Water Scheme');
    expect(res.body.data.i18n.title.mr).toContain('Clean Water Scheme');
    // both language slots populated
    expect(res.body.data.i18n.description.mr).toBeTruthy();
  });

  test('replacing the banner removes the old mock asset from the store', async () => {
    const token = await officerToken();
    const created = await request(app)
      .post('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Banner Swap Scheme')
      .field('description', 'Testing banner replacement cleanup')
      .field('category', 'Other')
      .attach('image', PNG, 'old-banner.png');
    const id = created.body.data.id;
    const oldUrl = created.body.data.imageUrl;
    expect(oldUrl).toMatch(/\/api\/v1\/uploads\//);
    // old asset currently served
    expect((await request(app).get(new URL(oldUrl).pathname)).status).toBe(200);

    // Replace the banner.
    const updated = await request(app)
      .put(`/api/v1/admin/schemes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', PNG, 'new-banner.png');
    expect(updated.status).toBe(200);
    expect(updated.body.data.imageUrl).not.toBe(oldUrl);

    // Old asset is gone (deleteAsset dropped it from the disk store).
    expect((await request(app).get(new URL(oldUrl).pathname)).status).toBe(404);
    // New one resolves.
    expect((await request(app).get(new URL(updated.body.data.imageUrl).pathname)).status).toBe(200);
  });
});
