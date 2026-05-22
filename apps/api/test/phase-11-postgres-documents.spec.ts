import multipart from '@fastify/multipart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;

type HeaderBag = Record<string, string>;

const headersFor = (user: { id: string; role: string }): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.register(multipart);
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerUser = async (api: ReturnType<typeof request>, runId: string) => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `pg_phase11_${runId}_${Math.random().toString(36).slice(2)}@athletiq.local`,
      password: 'password123',
      role: 'school_admin',
    })
    .expect(201);

  return { id: response.body.user.id as string, role: 'school_admin' };
};

const createAndApproveSchool = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  name: string,
) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor(schoolAdmin))
    .send({ name, location: 'Kathmandu' })
    .expect(201);

  await api.post(`/api/schools/${school.body.id}/approve`).set(headersFor(superAdmin)).expect(201);

  return school.body as { id: string };
};

const createAthlete = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  schoolId: string,
  fullName: string,
) => {
  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(schoolAdmin))
    .send({ schoolId, fullName })
    .expect(201);

  return athlete.body as { id: string };
};

const uploadDocument = (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  athleteId: string,
  documentText: string,
  documentType = 'birth_certificate',
) =>
  api
    .post(`/api/documents/athletes/${athleteId}/upload`)
    .set(headersFor(schoolAdmin))
    .field('documentType', documentType)
    .attach('file', Buffer.from(documentText), {
      filename: `${athleteId}.pdf`,
      contentType: 'application/pdf',
    })
    .expect(201);

describeDatabase('phase 11 postgres documents and verification', () => {
  const originalBackend = process.env.ATHLETIQ_DATA_BACKEND;

  beforeEach(() => {
    process.env.ATHLETIQ_DATA_BACKEND = 'postgres';
  });

  afterEach(() => {
    if (originalBackend === undefined) {
      delete process.env.ATHLETIQ_DATA_BACKEND;
    } else {
      process.env.ATHLETIQ_DATA_BACKEND = originalBackend;
    }
  });

  it('persists private documents, extraction, duplicates, reviews, links, and expiry state', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const schoolAdmin = await registerUser(api, runId);
    const school = await createAndApproveSchool(api, schoolAdmin, `PG Documents ${runId}`);
    const firstAthlete = await createAthlete(api, schoolAdmin, school.id, 'PG Maya Rai');
    const secondAthlete = await createAthlete(api, schoolAdmin, school.id, 'PG Maya R.');
    const firstText =
      'Name: PG Maya Rai\nDate of Birth: 2012-03-14\nDocument Number: PG-BC-7788\nGender: female';
    const secondText =
      'Name: PG Maya Rai\nDate of Birth: 2012-03-14\nDocument Number: PG-BC-7788\nGender: female\nExpiry Date: 2020-01-01';

    const firstUpload = await uploadDocument(api, schoolAdmin, firstAthlete.id, firstText);
    expect(firstUpload.body.storageKey).toBeUndefined();
    await api
      .post(`/api/documents/${firstUpload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText: firstText })
      .expect(201);

    const secondUpload = await uploadDocument(api, schoolAdmin, secondAthlete.id, secondText);
    const extraction = await api
      .post(`/api/documents/${secondUpload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText: secondText })
      .expect(201);
    expect(extraction.body.duplicateCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          matchedDocumentId: firstUpload.body.id,
          matchedAthleteId: firstAthlete.id,
          score: 100,
        }),
      ]),
    );

    const reviewLink = await api
      .post(`/api/documents/${secondUpload.body.id}/review-links`)
      .set(headersFor(superAdmin))
      .send({ ttlMinutes: 30 })
      .expect(201);
    expect(reviewLink.body.tokenHash).toBeUndefined();

    const resolved = await api
      .get(`/api/documents/review-links/${reviewLink.body.token}`)
      .set(headersFor(schoolAdmin))
      .expect(200);
    expect(resolved.body.document.storageKey).toBeUndefined();
    expect(resolved.body.document.id).toBe(secondUpload.body.id);

    const review = await api
      .post(`/api/documents/${secondUpload.body.id}/reviews`)
      .set(headersFor(superAdmin))
      .send({ action: 'approve', notes: 'Postgres verified' })
      .expect(201);
    expect(review.body.document.status).toBe('verified');
    expect(review.body.athlete.fullName).toBe('PG Maya Rai');
    expect(review.body.athlete.status).toBe('identity_approved');

    const expiryRun = await api
      .post('/api/documents/expiry/run')
      .set(headersFor(superAdmin))
      .send({ before: '2021-01-01T00:00:00.000Z' })
      .expect(201);
    expect(expiryRun.body.expiredDocumentIds).toContain(secondUpload.body.id);

    const queue = await api
      .get('/api/documents/review-queue')
      .query({ schoolId: school.id })
      .set(headersFor(superAdmin))
      .expect(200);
    const expired = queue.body.find(
      (item: { document: { id: string } }) => item.document.id === secondUpload.body.id,
    );
    expect(expired.document.status).toBe('expired');
    expect(expired.extraction.extracted.documentNumber).toBe('PG-BC-7788');

    await app.close();
  });
});
