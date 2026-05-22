import { afterEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { USER_REPOSITORY, type UserRepository } from '../src/repositories/repository.types.js';
import { AppDataStore, type UserRecord } from '../src/common/store.js';
import { TokenService } from '../src/auth/token.service.js';

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

describe('phase 9 auth security', () => {
  const originalBackend = process.env.ATHLETIQ_DATA_BACKEND;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowTestHeaders = process.env.ATHLETIQ_ALLOW_TEST_HEADERS;
  const originalJwtSecret = process.env.ATHLETIQ_JWT_SECRET;
  const originalAllowInsecureJwt = process.env.ATHLETIQ_ALLOW_INSECURE_DEV_JWT_SECRET;

  afterEach(() => {
    if (originalBackend === undefined) {
      delete process.env.ATHLETIQ_DATA_BACKEND;
    } else {
      process.env.ATHLETIQ_DATA_BACKEND = originalBackend;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalAllowTestHeaders === undefined) {
      delete process.env.ATHLETIQ_ALLOW_TEST_HEADERS;
    } else {
      process.env.ATHLETIQ_ALLOW_TEST_HEADERS = originalAllowTestHeaders;
    }

    if (originalJwtSecret === undefined) {
      delete process.env.ATHLETIQ_JWT_SECRET;
    } else {
      process.env.ATHLETIQ_JWT_SECRET = originalJwtSecret;
    }

    if (originalAllowInsecureJwt === undefined) {
      delete process.env.ATHLETIQ_ALLOW_INSECURE_DEV_JWT_SECRET;
    } else {
      process.env.ATHLETIQ_ALLOW_INSECURE_DEV_JWT_SECRET = originalAllowInsecureJwt;
    }
  });

  it('stores only Argon2 password hashes and never returns password material', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    const app = await createApp();
    const api = request(app.getHttpServer());
    const email = `secure_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;

    const registration = await api
      .post('/api/auth/register')
      .send({ email, password: 'password123', role: 'school_admin' })
      .expect(201);

    expect(registration.body.user.password).toBeUndefined();
    expect(registration.body.user.passwordHash).toBeUndefined();

    const userRepository = app.get<UserRepository>(USER_REPOSITORY);
    const stored = await userRepository.findByEmail(email);
    expect(stored?.password).toMatch(/^\$argon2id\$/);

    const login = await api
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);
    expect(login.body.user.password).toBeUndefined();
    expect(login.body.user.passwordHash).toBeUndefined();

    await app.close();
  });

  it('does not allow the default super admin seed to log in with default credentials', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    const app = await createApp();
    const api = request(app.getHttpServer());

    await api
      .post('/api/auth/login')
      .send({ email: 'admin@athletiq.local', password: 'admin123' })
      .expect(401);

    await api
      .post('/api/auth/login')
      .send({ email: 'admin@athletiq.local', password: 'LOCKED:default-super-admin' })
      .expect(401);

    await app.close();
  });

  it('allows super admins to provision platform role users without leaking password material', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    const app = await createApp();
    const api = request(app.getHttpServer());
    const federationEmail = `federation_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;
    const governmentEmail = `government_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;
    const schoolAdminEmail = `school_user_blocked_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;

    await api
      .post('/api/auth/register')
      .send({ email: federationEmail, password: 'password123', role: 'federation_admin' })
      .expect(403);
    await api
      .post('/api/auth/register')
      .send({ email: governmentEmail, password: 'password123', role: 'government_viewer' })
      .expect(403);
    await api
      .post('/api/auth/register')
      .send({ email: `super_${federationEmail}`, password: 'password123', role: 'super_admin' })
      .expect(403);

    const schoolAdmin = await api
      .post('/api/auth/register')
      .send({ email: schoolAdminEmail, password: 'password123', role: 'school_admin' })
      .expect(201);
    await api
      .post('/api/auth/users')
      .set({
        'x-athletiq-user-id': schoolAdmin.body.user.id,
        'x-athletiq-user-role': 'school_admin',
      })
      .send({ email: federationEmail, roles: ['federation_admin'] })
      .expect(403);
    await api
      .get('/api/auth/users')
      .set({
        'x-athletiq-user-id': schoolAdmin.body.user.id,
        'x-athletiq-user-role': 'school_admin',
      })
      .expect(403);

    const provisionedFederation = await api
      .post('/api/auth/users')
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .send({ email: federationEmail, roles: ['federation_admin'] })
      .expect(201);
    expect(provisionedFederation.body).toMatchObject({
      user: {
        email: federationEmail,
        roles: ['federation_admin'],
        schoolIds: [],
      },
      temporaryPassword: expect.any(String),
    });
    expect(provisionedFederation.body.user.password).toBeUndefined();
    expect(provisionedFederation.body.user.passwordHash).toBeUndefined();

    const whitespacePassword = await api
      .post('/api/auth/users')
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .send({
        email: `whitespace_${federationEmail}`,
        password: '   ',
        roles: ['government_viewer'],
      })
      .expect(201);
    expect(whitespacePassword.body.temporaryPassword).toEqual(expect.any(String));
    await api
      .post('/api/auth/login')
      .send({
        email: `whitespace_${federationEmail}`,
        password: whitespacePassword.body.temporaryPassword,
      })
      .expect(201);

    await api
      .post('/api/auth/users')
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .send({
        email: governmentEmail,
        password: 'password123',
        roles: ['government_viewer'],
        schoolIds: ['school_public_reports'],
      })
      .expect(201);

    await api
      .post('/api/auth/login')
      .send({ email: federationEmail, password: provisionedFederation.body.temporaryPassword })
      .expect(201);
    await api
      .post('/api/auth/login')
      .send({ email: governmentEmail, password: 'password123' })
      .expect(201);

    const users = await api
      .get('/api/auth/users')
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .expect(200);
    expect(users.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: federationEmail,
          roles: ['federation_admin'],
        }),
        expect.objectContaining({
          email: governmentEmail,
          roles: ['government_viewer'],
          schoolIds: ['school_public_reports'],
        }),
      ]),
    );
    expect(users.body.some((user: Record<string, unknown>) => 'password' in user)).toBe(false);
    expect(users.body.some((user: Record<string, unknown>) => 'passwordHash' in user)).toBe(false);

    const audit = await api
      .get('/api/audit')
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .expect(200);
    expect(audit.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorUserId: 'usr_super_admin',
          action: 'auth.user_provisioned',
          resource: 'user',
          metadata: expect.objectContaining({
            email: federationEmail,
            roles: 'federation_admin',
          }),
        }),
      ]),
    );

    await app.close();
  });

  it('migrates legacy plaintext passwords to Argon2 after a successful login', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    const app = await createApp();
    const api = request(app.getHttpServer());
    const email = `legacy_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;
    const now = new Date().toISOString();
    const legacyUser: UserRecord = {
      id: `usr_legacy_${Math.random().toString(36).slice(2)}`,
      email,
      password: 'legacy-password123',
      roles: ['school_admin'],
      schoolIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const store = app.get(AppDataStore) as unknown as { users: Map<string, UserRecord> };
    store.users.set(legacyUser.id, legacyUser);

    await api.post('/api/auth/login').send({ email, password: 'legacy-password123' }).expect(201);

    const userRepository = app.get<UserRepository>(USER_REPOSITORY);
    const migrated = await userRepository.findByEmail(email);
    expect(migrated?.password).toMatch(/^\$argon2id\$/);

    await app.close();
  });

  it('issues bearer access tokens and rotates HttpOnly refresh sessions', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    const app = await createApp();
    const api = request(app.getHttpServer());
    const email = `session_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;

    await api
      .post('/api/auth/register')
      .send({ email, password: 'password123', role: 'school_admin' })
      .expect(201);

    const login = await api
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);
    expect(login.body.accessToken).toEqual(expect.any(String));
    const firstRefreshCookie = getRefreshCookie(login);

    const me = await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(email);

    const bearerWithConflictingHeaders = await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .set({
        'x-athletiq-user-id': 'usr_super_admin',
        'x-athletiq-user-role': 'super_admin',
      })
      .expect(200);
    expect(bearerWithConflictingHeaders.body.email).toBe(email);

    const refresh = await api
      .post('/api/auth/refresh')
      .set('Cookie', firstRefreshCookie)
      .expect(201);
    expect(refresh.body.accessToken).toEqual(expect.any(String));
    const secondRefreshCookie = getRefreshCookie(refresh);
    expect(secondRefreshCookie).not.toBe(firstRefreshCookie);

    await api.post('/api/auth/refresh').set('Cookie', firstRefreshCookie).expect(401);

    await api.post('/api/auth/logout').set('Cookie', secondRefreshCookie).expect(201);
    await api.post('/api/auth/refresh').set('Cookie', secondRefreshCookie).expect(401);

    await app.close();
  });

  it('rejects development test headers in production mode', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    process.env.ATHLETIQ_ALLOW_TEST_HEADERS = '1';
    process.env.NODE_ENV = 'production';
    const app = await createApp();
    const api = request(app.getHttpServer());

    await api
      .get('/api/auth/me')
      .set({
        'x-athletiq-user-id': 'usr_super_admin',
        'x-athletiq-user-role': 'super_admin',
      })
      .expect(401);

    await app.close();
  });

  it('rejects development test headers outside test mode without explicit opt-in', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    delete process.env.ATHLETIQ_ALLOW_TEST_HEADERS;
    process.env.NODE_ENV = 'development';
    const app = await createApp();
    const api = request(app.getHttpServer());

    await api
      .get('/api/auth/me')
      .set({
        'x-athletiq-user-id': 'usr_super_admin',
        'x-athletiq-user-role': 'super_admin',
      })
      .expect(401);

    process.env.ATHLETIQ_ALLOW_TEST_HEADERS = '1';
    await api
      .get('/api/auth/me')
      .set({
        'x-athletiq-user-id': 'usr_super_admin',
        'x-athletiq-user-role': 'super_admin',
      })
      .expect(200);

    await app.close();
  });

  it('enforces role permissions after bearer authentication', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    const app = await createApp();
    const api = request(app.getHttpServer());

    const email = `coach_permission_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;
    await api
      .post('/api/auth/register')
      .send({ email, password: 'password123', role: 'coach' })
      .expect(201);
    const coachLogin = await api
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);

    await api
      .get('/api/analytics/federation/overview')
      .set('Authorization', `Bearer ${coachLogin.body.accessToken}`)
      .expect(403);

    await api
      .get('/api/search')
      .query({ q: 'anything' })
      .set('Authorization', `Bearer ${coachLogin.body.accessToken}`)
      .expect(200);

    await app.close();
  });

  it('gates minor public profiles with guardian consent and filters public athlete data', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    const app = await createApp();
    const api = request(app.getHttpServer());
    const email = `privacy_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;

    const registration = await api
      .post('/api/auth/register')
      .send({ email, password: 'password123', role: 'school_admin' })
      .expect(201);
    const schoolAdmin = { id: registration.body.user.id as string, role: 'school_admin' };

    const school = await api
      .post('/api/schools')
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .send({ name: `Privacy School ${Date.now()}` })
      .expect(201);
    await api
      .post(`/api/schools/${school.body.id}/approve`)
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .expect(201);

    const athlete = await api
      .post('/api/athletes/drafts')
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .send({
        schoolId: school.body.id,
        fullName: 'Privacy Athlete',
        dateOfBirth: '2013-01-01',
        gender: 'female',
      })
      .expect(201);
    await api
      .post(`/api/athletes/${athlete.body.id}/identity/approve`)
      .set({ 'x-athletiq-user-id': 'usr_super_admin', 'x-athletiq-user-role': 'super_admin' })
      .expect(201);

    await api
      .post(`/api/privacy/athletes/${athlete.body.id}/public-profile`)
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .send({ status: 'public' })
      .expect(403);

    await api.get(`/api/privacy/public/athletes/${athlete.body.id}`).expect(404);

    const privateQr = await api
      .post(`/api/qr/athlete/${athlete.body.id}`)
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .expect(201);
    await api.get(`/api/qr/public/athlete/${privateQr.body.code}`).expect(404);

    await api
      .post(`/api/privacy/athletes/${athlete.body.id}/guardian-consents`)
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .send({
        guardianName: 'Parent Guardian',
        relationship: 'parent',
        consentType: 'medical',
      })
      .expect(201);

    await api
      .post(`/api/privacy/athletes/${athlete.body.id}/public-profile`)
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .send({ status: 'public' })
      .expect(403);

    await api
      .post(`/api/privacy/athletes/${athlete.body.id}/guardian-consents`)
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .send({
        guardianName: 'Parent Guardian',
        relationship: 'parent',
        consentType: 'public_profile',
      })
      .expect(201);

    await api
      .post(`/api/privacy/athletes/${athlete.body.id}/public-profile`)
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .send({ status: 'public' })
      .expect(201);

    const publicProfile = await api
      .get(`/api/privacy/public/athletes/${athlete.body.id}`)
      .expect(200);
    expect(publicProfile.body).toEqual({
      type: 'athlete',
      athleteId: athlete.body.id,
      fullName: 'Privacy Athlete',
      athletiqId: expect.any(String),
      schoolId: school.body.id,
      publicProfileStatus: 'public',
    });
    expect(publicProfile.body.dateOfBirth).toBeUndefined();
    expect(publicProfile.body.gender).toBeUndefined();
    expect(publicProfile.body.guardianName).toBeUndefined();

    const qr = await api
      .post(`/api/qr/athlete/${athlete.body.id}`)
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': schoolAdmin.role,
      })
      .expect(201);
    const qrProfile = await api.get(`/api/qr/public/athlete/${qr.body.code}`).expect(200);
    expect(qrProfile.body).toEqual(publicProfile.body);

    await app.close();
  });

  it('rate limits bad logins and audits super admin impersonation', async () => {
    delete process.env.ATHLETIQ_DATA_BACKEND;
    const app = await createApp();
    const api = request(app.getHttpServer());
    const targetEmail = `impersonated_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;

    const target = await api
      .post('/api/auth/register')
      .send({ email: targetEmail, password: 'password123', role: 'coach' })
      .expect(201);

    await api
      .post('/api/auth/impersonation')
      .set({
        'x-athletiq-user-id': 'usr_super_admin',
        'x-athletiq-user-role': 'super_admin',
      })
      .send({ targetUserId: target.body.user.id, role: 'coach' })
      .expect(400);

    await api
      .post('/api/auth/impersonation')
      .set({
        'x-athletiq-user-id': target.body.user.id,
        'x-athletiq-user-role': 'coach',
      })
      .send({ targetUserId: 'usr_super_admin', role: 'super_admin', reason: 'support check' })
      .expect(403);

    const impersonation = await api
      .post('/api/auth/impersonation')
      .set({
        'x-athletiq-user-id': 'usr_super_admin',
        'x-athletiq-user-role': 'super_admin',
      })
      .send({ targetUserId: target.body.user.id, role: 'coach', reason: 'support case 42' })
      .expect(201);
    expect(impersonation.body).toMatchObject({
      impersonatedBy: 'usr_super_admin',
      user: {
        id: target.body.user.id,
        email: targetEmail,
      },
      accessToken: expect.any(String),
    });

    const impersonatedMe = await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${impersonation.body.accessToken}`)
      .expect(200);
    expect(impersonatedMe.body).toMatchObject({
      id: target.body.user.id,
      email: targetEmail,
      role: 'coach',
      impersonatedBy: 'usr_super_admin',
    });

    const audit = await api
      .get('/api/audit')
      .set({
        'x-athletiq-user-id': 'usr_super_admin',
        'x-athletiq-user-role': 'super_admin',
      })
      .expect(200);
    expect(audit.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorUserId: 'usr_super_admin',
          action: 'auth.impersonation_started',
          resource: 'user',
          resourceId: target.body.user.id,
          metadata: expect.objectContaining({
            targetUserId: target.body.user.id,
            targetRole: 'coach',
            reason: 'support case 42',
            startedAt: expect.any(String),
          }),
        }),
      ]),
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await api
        .post('/api/auth/login')
        .set('x-forwarded-for', '198.51.100.9')
        .send({ email: 'missing-rate-limit@athletiq.local', password: 'wrong-password' })
        .expect(401);
    }
    await api
      .post('/api/auth/login')
      .set('x-forwarded-for', '198.51.100.9')
      .send({ email: 'missing-rate-limit@athletiq.local', password: 'wrong-password' })
      .expect(429);

    await app.close();
  });

  it('requires explicit JWT secrets outside test or opted-in local development', async () => {
    const tokens = new TokenService();
    const user: Omit<UserRecord, 'password'> = {
      id: 'usr_secret_check',
      email: 'secret.check@athletiq.local',
      roles: ['school_admin'],
      schoolIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    delete process.env.ATHLETIQ_JWT_SECRET;
    delete process.env.ATHLETIQ_ALLOW_INSECURE_DEV_JWT_SECRET;
    process.env.NODE_ENV = 'development';
    await expect(tokens.signAccessToken(user)).rejects.toThrow(/ATHLETIQ_JWT_SECRET is required/);

    process.env.ATHLETIQ_ALLOW_INSECURE_DEV_JWT_SECRET = '1';
    await expect(tokens.signAccessToken(user)).resolves.toEqual(expect.any(String));

    process.env.NODE_ENV = 'production';
    process.env.ATHLETIQ_JWT_SECRET = 'short';
    await expect(tokens.signAccessToken(user)).rejects.toThrow(/at least 32 characters/);
  });
});
