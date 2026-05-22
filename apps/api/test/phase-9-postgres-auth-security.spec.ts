import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { USER_REPOSITORY, type UserRepository } from '../src/repositories/repository.types.js';

const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;
const refreshCookieName = 'athletiq_refresh';

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const getRefreshCookie = (response: request.Response) => {
  const cookies = response.headers['set-cookie'];
  const cookieList = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const refreshCookie = cookieList.find((cookie) => cookie.startsWith(`${refreshCookieName}=`));
  expect(refreshCookie).toBeDefined();
  expect(refreshCookie).toContain('HttpOnly');
  return refreshCookie?.split(';')[0] ?? '';
};

describeDatabase('phase 9 postgres auth security', () => {
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

  it('serializes concurrent refresh rotation so one token has only one live descendant', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const email = `pg_session_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;

    await api
      .post('/api/auth/register')
      .send({ email, password: 'password123', role: 'school_admin' })
      .expect(201);

    const login = await api
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);
    const refreshCookie = getRefreshCookie(login);

    const [first, second] = await Promise.all([
      api.post('/api/auth/refresh').set('Cookie', refreshCookie),
      api.post('/api/auth/refresh').set('Cookie', refreshCookie),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 401]);

    const successful = first.status === 201 ? first : second;
    const rotatedCookie = getRefreshCookie(successful);
    await api.post('/api/auth/refresh').set('Cookie', rotatedCookie).expect(201);

    await app.close();
  });

  it('persists password hashes, privacy consent, impersonation audit, and rate limits', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const adminEmail = `pg_phase9_admin_${runId}@athletiq.local`;
    const coachEmail = `pg_phase9_coach_${runId}@athletiq.local`;

    const adminRegistration = await api
      .post('/api/auth/register')
      .send({ email: adminEmail, password: 'password123', role: 'school_admin' })
      .expect(201);
    const admin = { id: adminRegistration.body.user.id as string, role: 'school_admin' };

    const users = app.get<UserRepository>(USER_REPOSITORY);
    const stored = await users.findByEmail(adminEmail);
    expect(stored?.password).toMatch(/^\$argon2id\$/);

    const school = await api
      .post('/api/schools')
      .set({ 'x-athletiq-user-id': admin.id, 'x-athletiq-user-role': admin.role })
      .send({ name: `PG Phase 9 School ${runId}` })
      .expect(201);
    await api
      .post(`/api/schools/${school.body.id}/approve`)
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .expect(201);

    const athlete = await api
      .post('/api/athletes/drafts')
      .set({ 'x-athletiq-user-id': admin.id, 'x-athletiq-user-role': admin.role })
      .send({
        schoolId: school.body.id,
        fullName: 'PG Privacy Athlete',
        dateOfBirth: '2014-01-01',
        gender: 'female',
      })
      .expect(201);
    const approved = await api
      .post(`/api/athletes/${athlete.body.id}/identity/approve`)
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .expect(201);

    const qr = await api
      .post(`/api/qr/athlete/${athlete.body.id}`)
      .set({ 'x-athletiq-user-id': admin.id, 'x-athletiq-user-role': admin.role })
      .expect(201);
    await api.get(`/api/qr/public/athlete/${qr.body.code}`).expect(404);

    await api
      .post(`/api/privacy/athletes/${athlete.body.id}/guardian-consents`)
      .set({ 'x-athletiq-user-id': admin.id, 'x-athletiq-user-role': admin.role })
      .send({ guardianName: 'PG Parent', relationship: 'parent', consentType: 'public_profile' })
      .expect(201);
    await api
      .post(`/api/privacy/athletes/${athlete.body.id}/public-profile`)
      .set({ 'x-athletiq-user-id': admin.id, 'x-athletiq-user-role': admin.role })
      .send({ status: 'public' })
      .expect(201);

    const publicQr = await api.get(`/api/qr/public/athlete/${qr.body.code}`).expect(200);
    expect(publicQr.body).toEqual({
      type: 'athlete',
      athleteId: athlete.body.id,
      fullName: 'PG Privacy Athlete',
      athletiqId: approved.body.athletiqId,
      schoolId: school.body.id,
      publicProfileStatus: 'public',
    });

    const coach = await api
      .post('/api/auth/register')
      .send({ email: coachEmail, password: 'password123', role: 'coach' })
      .expect(201);
    const impersonation = await api
      .post('/api/auth/impersonation')
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .send({ targetUserId: coach.body.user.id, role: 'coach', reason: 'postgres phase9 e2e' })
      .expect(201);
    const impersonatedMe = await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${impersonation.body.accessToken}`)
      .expect(200);
    expect(impersonatedMe.body.impersonatedBy).toBe('usr_super_admin');

    const audit = await api
      .get('/api/audit')
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .expect(200);
    expect(audit.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'auth.impersonation_started',
          actorUserId: 'usr_super_admin',
          resourceId: coach.body.user.id,
          metadata: expect.objectContaining({
            targetUserId: coach.body.user.id,
            reason: 'postgres phase9 e2e',
          }),
        }),
      ]),
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await api
        .post('/api/auth/login')
        .set('x-forwarded-for', `203.0.113.${runId.slice(-2)}`)
        .send({ email: `missing_${runId}@athletiq.local`, password: 'wrong-password' })
        .expect(401);
    }
    await api
      .post('/api/auth/login')
      .set('x-forwarded-for', `203.0.113.${runId.slice(-2)}`)
      .send({ email: `missing_${runId}@athletiq.local`, password: 'wrong-password' })
      .expect(429);

    await app.close();
  });
});
