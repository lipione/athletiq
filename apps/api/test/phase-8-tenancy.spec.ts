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

const registerSchoolAdmin = async (api: ReturnType<typeof request>) => {
  const email = `school_admin_${Math.random().toString(36).slice(2, 10)}@athletiq.local`;
  const response = await api
    .post('/api/auth/register')
    .send({
      email,
      password: 'password123',
      role: 'school_admin',
    })
    .expect(201);

  return {
    id: response.body.user.id,
    role: 'school_admin',
  };
};

const createAndApproveSchool = async (
  api: ReturnType<typeof request>,
  admin: { id: string; role: string },
  name: string,
) => {
  const school = await api.post('/api/schools').set(headersFor(admin)).send({ name }).expect(201);

  await api
    .post(`/api/schools/${school.body.id}/approve`)
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return school.body;
};

describe('phase 8 tenancy isolation', () => {
  it('prevents a school admin from creating a team for another school', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
    const schoolAdminA = await registerSchoolAdmin(api);
    const schoolAdminB = await registerSchoolAdmin(api);
    await createAndApproveSchool(api, schoolAdminA, 'Tenant A School');
    const schoolB = await createAndApproveSchool(api, schoolAdminB, 'Tenant B School');

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({
        name: 'Tenant Cup',
        sport: 'football',
        format: 'league',
      })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(schoolAdminB))
      .send({ schoolId: schoolB.id })
      .expect(201);

    const response = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminA))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolB.id,
        name: 'Illegal Team',
        athleteIds: ['ath_missing'],
      })
      .expect(403);

    expect(response.body.message).toContain('Only school admin can create teams');

    await app.close();
  });

  it('scopes offline sync mutation idempotency by actor tenant', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };

    const schoolAdminA = await registerSchoolAdmin(api);
    const schoolAdminB = await registerSchoolAdmin(api);

    const schoolA = await createAndApproveSchool(api, schoolAdminA, 'Sync Tenant A School');
    const schoolB = await createAndApproveSchool(api, schoolAdminB, 'Sync Tenant B School');

    const pushBody = {
      clientId: 'shared-client',
      mutations: [
        {
          mutationId: 'same-local-id',
          mutationType: 'match_event_unknown',
          payload: {},
        },
      ],
    };

    const firstTenantPush = await api
      .post('/api/sync/mutations/push')
      .set(headersFor(schoolAdminA))
      .send(pushBody)
      .expect(201);

    const secondTenantPush = await api
      .post('/api/sync/mutations/push')
      .set(headersFor(schoolAdminB))
      .send(pushBody)
      .expect(201);

    expect(firstTenantPush.body.mutations[0]).toMatchObject({
      id: 'same-local-id',
      clientId: 'shared-client',
      status: 'conflict',
      tenantId: schoolA.id,
    });
    expect(secondTenantPush.body.mutations[0]).toMatchObject({
      id: 'same-local-id',
      clientId: 'shared-client',
      status: 'conflict',
      tenantId: schoolB.id,
    });

    await api
      .post('/api/sync/mutations/push')
      .set(headersFor(schoolAdminA))
      .send({
        ...pushBody,
        mutations: [
          {
            mutationId: 'same-local-id',
            mutationType: 'match_event_unknown',
            payload: { ignored: true },
          },
        ],
      })
      .expect(201);

    const tenantAList = await api
      .get('/api/sync/mutations/shared-client')
      .set(headersFor(schoolAdminA))
      .expect(200);
    const tenantBList = await api
      .get('/api/sync/mutations/shared-client')
      .set(headersFor(schoolAdminB))
      .expect(200);

    expect(tenantAList.body).toHaveLength(1);
    expect(tenantAList.body[0].tenantId).toBe(schoolA.id);
    expect(tenantBList.body).toHaveLength(1);
    expect(tenantBList.body[0].tenantId).toBe(schoolB.id);

    await api
      .get('/api/sync/mutations/shared-client')
      .set(headersFor(superAdmin))
      .expect(200)
      .expect([]);

    await app.close();
  });

  it('requires an explicit school tenant for multi-school sync actors', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerSchoolAdmin(api);
    const schoolA = await createAndApproveSchool(api, schoolAdmin, 'Multi Sync A');
    const schoolB = await createAndApproveSchool(api, schoolAdmin, 'Multi Sync B');

    const pushBody = {
      clientId: 'multi-school-client',
      mutations: [
        {
          mutationId: 'same-local-id',
          mutationType: 'match_event_unknown',
          payload: {},
        },
      ],
    };

    const missingTenant = await api
      .post('/api/sync/mutations/push')
      .set(headersFor(schoolAdmin))
      .send(pushBody)
      .expect(400);

    expect(missingTenant.body.message).toContain(
      'schoolId is required for users linked to multiple school tenants',
    );

    const schoolAPush = await api
      .post('/api/sync/mutations/push')
      .set(headersFor(schoolAdmin))
      .send({ ...pushBody, schoolId: schoolA.id })
      .expect(201);
    const schoolBPush = await api
      .post('/api/sync/mutations/push')
      .set(headersFor(schoolAdmin))
      .send({ ...pushBody, schoolId: schoolB.id })
      .expect(201);

    expect(schoolAPush.body.mutations[0].tenantId).toBe(schoolA.id);
    expect(schoolBPush.body.mutations[0].tenantId).toBe(schoolB.id);

    const schoolAList = await api
      .get('/api/sync/mutations/multi-school-client')
      .query({ schoolId: schoolA.id })
      .set(headersFor(schoolAdmin))
      .expect(200);
    const schoolBList = await api
      .get('/api/sync/mutations/multi-school-client')
      .query({ schoolId: schoolB.id })
      .set(headersFor(schoolAdmin))
      .expect(200);

    expect(schoolAList.body).toHaveLength(1);
    expect(schoolAList.body[0].tenantId).toBe(schoolA.id);
    expect(schoolBList.body).toHaveLength(1);
    expect(schoolBList.body[0].tenantId).toBe(schoolB.id);

    await app.close();
  });

  it('allows super admins to target a school sync tenant explicitly', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
    const schoolAdmin = await registerSchoolAdmin(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Super Sync School');

    const push = await api
      .post('/api/sync/mutations/push')
      .set(headersFor(superAdmin))
      .send({
        clientId: 'super-admin-client',
        schoolId: school.id,
        mutations: [
          {
            mutationId: 'super-school-id',
            mutationType: 'match_event_unknown',
            payload: {},
          },
        ],
      })
      .expect(201);

    expect(push.body.mutations[0].tenantId).toBe(school.id);

    const list = await api
      .get('/api/sync/mutations/super-admin-client')
      .query({ schoolId: school.id })
      .set(headersFor(superAdmin))
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].tenantId).toBe(school.id);

    await app.close();
  });
});
