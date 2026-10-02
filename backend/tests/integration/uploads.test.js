import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/features/auth/user.model.js';
import { Complaint } from '../../src/features/complaints/complaint.model.js';

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
    Complaint.deleteMany({}),
    mongoose.connection.collection('counters').deleteMany({}),
    mongoose.connection.collection('notifications').deleteMany({}),
  ]);
});

async function citizen(mobile = '9876500099') {
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

describe('mock-mode uploads are served as real bytes', () => {
  test('a complaint image URL resolves to the uploaded file', async () => {
    const token = await citizen();
    const created = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Road')
      .field('title', 'Pothole with photo')
      .field('description', 'A pothole that needs a photo')
      .attach('images', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(created.status).toBe(201);
    const url = created.body.data.images[0];
    expect(url).toMatch(/\/api\/v1\/uploads\//);

    // Fetch the served path (strip the absolute origin).
    const path = url.slice(url.indexOf('/api/v1'));
    const file = await request(app).get(path);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toMatch(/image\/png/);
    expect(file.headers['cache-control']).toMatch(/max-age/);
    expect(Buffer.from(file.body).length).toBe(PNG.length);
  });

  test('unknown upload key returns 404', async () => {
    const res = await request(app).get('/api/v1/uploads/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
