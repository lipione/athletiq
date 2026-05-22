import multipart from '@fastify/multipart';
import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

type HeaderBag = Record<string, string>;

const headersFor = (user: { id: string; role: string }): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };

const createApp = async () => {
  delete process.env.ATHLETIQ_DATA_BACKEND;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.register(multipart);
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerUser = async (
  api: ReturnType<typeof request>,
  role: 'school_admin' | 'super_admin' = 'school_admin',
) => {
  const email = `phase11_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;
  const response = await api
    .post('/api/auth/register')
    .send({ email, password: 'password123', role })
    .expect(201);

  return {
    id: response.body.user.id as string,
    role,
    email,
  };
};

const createAndApproveSchool = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  name = 'Phase 11 School',
) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor(schoolAdmin))
    .send({ name, location: 'Kathmandu' })
    .expect(201);

  await api.post(`/api/schools/${school.body.id}/approve`).set(headersFor(superAdmin)).expect(201);

  return school.body as { id: string; name: string };
};

const createAthlete = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  schoolId: string,
  fullName = 'Maya Rai',
) => {
  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(schoolAdmin))
    .send({ schoolId, fullName })
    .expect(201);

  return athlete.body as { id: string; schoolId: string; fullName: string };
};

const uploadDocument = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  athleteId: string,
  documentText: string,
  documentType = 'birth_certificate',
) => {
  return api
    .post(`/api/documents/athletes/${athleteId}/upload`)
    .set(headersFor(schoolAdmin))
    .field('documentType', documentType)
    .attach('file', Buffer.from(documentText), {
      filename: `${athleteId}.pdf`,
      contentType: 'application/pdf',
    })
    .expect(201);
};

describe('phase 11 document OCR and verification pipeline', () => {
  it('uploads private documents and extracts review-required identity fields', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Document School');
    const athlete = await createAthlete(api, schoolAdmin, school.id);
    const documentText =
      'Name: Maya Rai\nDate of Birth: 2012-03-14\nDocument Number: BC-7788\nGender: female';

    const upload = await uploadDocument(api, schoolAdmin, athlete.id, documentText);

    expect(upload.body).toMatchObject({
      athleteId: athlete.id,
      schoolId: school.id,
      documentType: 'birth_certificate',
      status: 'uploaded',
      malwareScanStatus: 'clean',
    });
    expect(upload.body.sha256Hash).toEqual(expect.any(String));
    expect(upload.body.storageKey).toBeUndefined();
    expect(upload.body.filePath).toBeUndefined();

    const extraction = await api
      .post(`/api/documents/${upload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText })
      .expect(201);

    expect(extraction.body.document.status).toBe('review_required');
    expect(extraction.body.extraction.extracted).toMatchObject({
      fullName: 'Maya Rai',
      dateOfBirth: '2012-03-14',
      documentNumber: 'BC-7788',
      gender: 'female',
    });
    expect(extraction.body.extraction.confidence).toBeLessThan(100);
    expect(extraction.body.reviewFlags.length).toBeGreaterThan(0);

    await app.close();
  });

  it('creates expiring review links without exposing token hashes', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const otherAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Review Link School');
    await createAndApproveSchool(api, otherAdmin, 'Other Review School');
    const athlete = await createAthlete(api, schoolAdmin, school.id);
    const documentText = 'Name: Maya Rai\nDate of Birth: 2012-03-14\nDocument Number: BC-7788';
    const upload = await uploadDocument(api, schoolAdmin, athlete.id, documentText);
    await api
      .post(`/api/documents/${upload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText })
      .expect(201);

    const reviewLink = await api
      .post(`/api/documents/${upload.body.id}/review-links`)
      .set(headersFor(superAdmin))
      .send({ ttlMinutes: 30 })
      .expect(201);

    expect(reviewLink.body.token).toEqual(expect.any(String));
    expect(reviewLink.body.reviewUrl).toContain(reviewLink.body.token);
    expect(reviewLink.body.tokenHash).toBeUndefined();

    const resolved = await api
      .get(`/api/documents/review-links/${reviewLink.body.token}`)
      .set(headersFor(schoolAdmin))
      .expect(200);
    expect(resolved.body.document.id).toBe(upload.body.id);
    expect(resolved.body.document.storageKey).toBeUndefined();

    await api
      .get(`/api/documents/review-links/${reviewLink.body.token}`)
      .set(headersFor(otherAdmin))
      .expect(403);

    const expiredLink = await api
      .post(`/api/documents/${upload.body.id}/review-links`)
      .set(headersFor(superAdmin))
      .send({ ttlMinutes: -1 })
      .expect(201);

    await api
      .get(`/api/documents/review-links/${expiredLink.body.token}`)
      .set(headersFor(schoolAdmin))
      .expect(410);

    await app.close();
  });

  it('links duplicate candidates and updates athlete identity only through approval', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Duplicate School');
    const firstAthlete = await createAthlete(api, schoolAdmin, school.id, 'Maya Rai');
    const secondAthlete = await createAthlete(api, schoolAdmin, school.id, 'Maya R.');
    const firstText =
      'Name: Maya Rai\nDate of Birth: 2012-03-14\nDocument Number: BC-7788\nGender: female';
    const secondText =
      'Name: Maya Rai\nDate of Birth: 2012-03-14\nDocument Number: BC-7788\nGender: female\nSchool: Duplicate School';

    const firstUpload = await uploadDocument(api, schoolAdmin, firstAthlete.id, firstText);
    await api
      .post(`/api/documents/${firstUpload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText: firstText })
      .expect(201);

    const secondUpload = await uploadDocument(api, schoolAdmin, secondAthlete.id, secondText);
    const secondExtraction = await api
      .post(`/api/documents/${secondUpload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText: secondText })
      .expect(201);

    expect(secondExtraction.body.duplicateCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          matchedDocumentId: firstUpload.body.id,
          matchedAthleteId: firstAthlete.id,
          score: 100,
        }),
      ]),
    );

    const beforeApproval = await api
      .get(`/api/athletes/${secondAthlete.id}`)
      .set(headersFor(schoolAdmin))
      .expect(200);
    expect(beforeApproval.body.fullName).toBe('Maya R.');

    const review = await api
      .post(`/api/documents/${secondUpload.body.id}/reviews`)
      .set(headersFor(superAdmin))
      .send({ action: 'approve', notes: 'Verified against uploaded certificate' })
      .expect(201);

    expect(review.body.document.status).toBe('verified');
    expect(review.body.athlete.fullName).toBe('Maya Rai');
    expect(review.body.athlete.dateOfBirth).toBe('2012-03-14');

    const audit = await api.get('/api/audit').set(headersFor(superAdmin)).expect(200);
    expect(audit.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'document.identity_approved',
          resourceId: secondUpload.body.id,
        }),
      ]),
    );

    await app.close();
  });

  it('tracks expiring documents and marks expired records without deleting history', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Expiry School');
    const athlete = await createAthlete(api, schoolAdmin, school.id, 'Expiry Athlete');
    const pastText =
      'Name: Expiry Athlete\nDate of Birth: 2012-03-14\nDocument Number: EL-1\nExpiry Date: 2020-01-01';
    const futureText =
      'Name: Expiry Athlete\nDate of Birth: 2012-03-14\nDocument Number: EL-2\nExpiry Date: 2027-01-01';

    const pastUpload = await uploadDocument(
      api,
      schoolAdmin,
      athlete.id,
      pastText,
      'eligibility_form',
    );
    await api
      .post(`/api/documents/${pastUpload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText: pastText })
      .expect(201);
    await api
      .post(`/api/documents/${pastUpload.body.id}/reviews`)
      .set(headersFor(superAdmin))
      .send({ action: 'approve' })
      .expect(201);

    const futureUpload = await uploadDocument(
      api,
      schoolAdmin,
      athlete.id,
      futureText,
      'eligibility_form',
    );
    await api
      .post(`/api/documents/${futureUpload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText: futureText })
      .expect(201);
    await api
      .post(`/api/documents/${futureUpload.body.id}/reviews`)
      .set(headersFor(superAdmin))
      .send({ action: 'approve' })
      .expect(201);

    const expiring = await api
      .get('/api/documents/expiring')
      .query({ before: '2027-12-31T00:00:00.000Z' })
      .set(headersFor(superAdmin))
      .expect(200);

    expect(expiring.body.map((document: { id: string }) => document.id)).toContain(
      futureUpload.body.id,
    );

    const expiryRun = await api
      .post('/api/documents/expiry/run')
      .set(headersFor(superAdmin))
      .send({ before: '2021-01-01T00:00:00.000Z' })
      .expect(201);

    expect(expiryRun.body.expiredDocumentIds).toContain(pastUpload.body.id);

    const queue = await api
      .get('/api/documents/review-queue')
      .query({ schoolId: school.id })
      .set(headersFor(superAdmin))
      .expect(200);
    const expired = queue.body.find(
      (item: { document: { id: string } }) => item.document.id === pastUpload.body.id,
    );
    expect(expired.document.status).toBe('expired');
    expect(expired.extraction.extracted.documentNumber).toBe('EL-1');

    await app.close();
  });

  it('blocks unscoped and foreign school admins from expiring document metadata', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const otherAdmin = await registerUser(api);
    const unscopedAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Expiry Scoped School');
    const otherSchool = await createAndApproveSchool(api, otherAdmin, 'Expiry Foreign School');
    const athlete = await createAthlete(api, schoolAdmin, school.id, 'Scoped Expiry Athlete');
    const documentText =
      'Name: Scoped Expiry Athlete\nDate of Birth: 2012-03-14\nDocument Number: SE-1\nExpiry Date: 2027-01-01';

    const upload = await uploadDocument(
      api,
      schoolAdmin,
      athlete.id,
      documentText,
      'eligibility_form',
    );
    await api
      .post(`/api/documents/${upload.body.id}/extract`)
      .set(headersFor(schoolAdmin))
      .send({ documentText })
      .expect(201);
    await api
      .post(`/api/documents/${upload.body.id}/reviews`)
      .set(headersFor(superAdmin))
      .send({ action: 'approve' })
      .expect(201);

    await api
      .get('/api/documents/expiring')
      .query({ before: '2027-12-31T00:00:00.000Z' })
      .set(headersFor(unscopedAdmin))
      .expect(403);

    await api
      .get('/api/documents/expiring')
      .query({ before: '2027-12-31T00:00:00.000Z', schoolId: otherSchool.id })
      .set(headersFor(schoolAdmin))
      .expect(403);

    const scoped = await api
      .get('/api/documents/expiring')
      .query({ before: '2027-12-31T00:00:00.000Z' })
      .set(headersFor(schoolAdmin))
      .expect(200);

    expect(scoped.body.map((document: { id: string }) => document.id)).toEqual([upload.body.id]);

    await app.close();
  });
});
