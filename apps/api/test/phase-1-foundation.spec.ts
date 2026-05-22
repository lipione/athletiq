import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module.js';
import { athletiqIdPattern } from '../src/common/athletiq-id.js';

type HeaderBag = Record<string, string>;

const headersFor = (user: { id: string; role: string }): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const registerUser = async (api: ReturnType<typeof request>) => {
  const email = `user_${Math.random().toString(36).slice(2, 10)}@athletiq.local`;
  const password = 'password123';

  const response = await api
    .post('/api/auth/register')
    .send({
      email,
      password,
      role: 'school_admin',
    })
    .expect(201);

  return {
    id: response.body.user.id,
    email,
    password,
    role: 'school_admin',
  };
};

describe('identity and schools foundation', () => {
  it('super admin can create and approve a school', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = headersFor({ id: 'usr_super_admin', role: 'super_admin' });

    const createSchool = await api
      .post('/api/schools')
      .set(superAdmin)
      .send({
        name: 'Riverside High',
        location: 'Kathmandu',
      })
      .expect(201);

    const approvedSchool = await api
      .post(`/api/schools/${createSchool.body.id}/approve`)
      .set(superAdmin)
      .expect(201);

    expect(approvedSchool.body.status).toBe('approved');

    await app.close();
  });

  it('school admin can invite a coach', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const schoolAdminHeaders = headersFor({ id: schoolAdmin.id, role: 'school_admin' });

    const createSchool = await api
      .post('/api/schools')
      .set(schoolAdminHeaders)
      .send({
        name: 'Oak Valley Academy',
        location: 'Lalitpur',
      })
      .expect(201);

    const superAdminHeaders = headersFor({ id: 'usr_super_admin', role: 'super_admin' });
    await api
      .post(`/api/schools/${createSchool.body.id}/approve`)
      .set(superAdminHeaders)
      .expect(201);

    const invited = await api
      .post(`/api/schools/${createSchool.body.id}/invite`)
      .set(schoolAdminHeaders)
      .send({
        email: 'coach@oakvalley.local',
      })
      .expect(201);

    expect(invited.body).toMatchObject({
      email: 'coach@oakvalley.local',
      role: 'coach',
      schoolId: createSchool.body.id,
    });

    await app.close();
  });

  it('school admin can create a draft athlete record', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const schoolAdminHeaders = headersFor({ id: schoolAdmin.id, role: 'school_admin' });

    const createSchool = await api
      .post('/api/schools')
      .set(schoolAdminHeaders)
      .send({
        name: 'Green Hills School',
        location: 'Pokhara',
      })
      .expect(201);

    const superAdminHeaders = headersFor({ id: 'usr_super_admin', role: 'super_admin' });
    await api
      .post(`/api/schools/${createSchool.body.id}/approve`)
      .set(superAdminHeaders)
      .expect(201);

    const draft = await api
      .post('/api/athletes/drafts')
      .set(schoolAdminHeaders)
      .send({
        schoolId: createSchool.body.id,
        fullName: 'Rita Karki',
      })
      .expect(201);

    expect(draft.body.status).toBe('draft');
    await app.close();
  });

  it('user without permission cannot approve a school', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const schoolAdminHeaders = headersFor({ id: schoolAdmin.id, role: 'school_admin' });

    const createSchool = await api
      .post('/api/schools')
      .set(schoolAdminHeaders)
      .send({
        name: 'West View School',
        location: 'Damak',
      })
      .expect(201);

    await api
      .post(`/api/schools/${createSchool.body.id}/approve`)
      .set(schoolAdminHeaders)
      .expect(403);

    await app.close();
  });

  it('approved athletiq ids do not expose sensitive fields', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const schoolAdminHeaders = headersFor({ id: schoolAdmin.id, role: 'school_admin' });

    const createSchool = await api
      .post('/api/schools')
      .set(schoolAdminHeaders)
      .send({
        name: 'Riverbank School',
        location: 'Butwal',
      })
      .expect(201);

    const superAdminHeaders = headersFor({ id: 'usr_super_admin', role: 'super_admin' });
    await api
      .post(`/api/schools/${createSchool.body.id}/approve`)
      .set(superAdminHeaders)
      .expect(201);

    const draft = await api
      .post('/api/athletes/drafts')
      .set(schoolAdminHeaders)
      .send({
        schoolId: createSchool.body.id,
        fullName: 'Aayush Sharma',
        dateOfBirth: '2010-01-10',
        gender: 'male',
      })
      .expect(201);

    const approved = await api
      .post(`/api/athletes/${draft.body.id}/identity/approve`)
      .set(superAdminHeaders)
      .expect(201);

    expect(athletiqIdPattern.test(approved.body.athletiqId)).toBe(true);
    expect(approved.body.athletiqId).not.toContain('2010');
    expect(approved.body.athletiqId).not.toContain('male');
    await app.close();
  });

  it('each approval writes audit logs', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = headersFor({ id: 'usr_super_admin', role: 'super_admin' });

    const school = await api
      .post('/api/schools')
      .set(superAdmin)
      .send({
        name: 'National Academy',
        location: 'Bhaktapur',
      })
      .expect(201);

    const approvedSchool = await api
      .post(`/api/schools/${school.body.id}/approve`)
      .set(superAdmin)
      .expect(201);

    const schoolAdmin = await registerUser(api);
    const schoolAdminHeaders = headersFor({ id: schoolAdmin.id, role: 'school_admin' });

    await api
      .post(`/api/schools/${approvedSchool.body.id}/invite`)
      .set(superAdmin)
      .send({ email: schoolAdmin.email })
      .expect(201);

    const draft = await api
      .post('/api/athletes/drafts')
      .set(schoolAdminHeaders)
      .send({
        schoolId: approvedSchool.body.id,
        fullName: 'Nisha KC',
      })
      .expect(201);

    await api.post(`/api/athletes/${draft.body.id}/identity/approve`).set(superAdmin).expect(201);

    const logs = await api.get('/api/audit').set(superAdmin).expect(200);

    const hasSchoolApproval = logs.body.some(
      (log: { action: string }) => log.action === 'school.approved',
    );
    const hasAthleteApproval = logs.body.some(
      (log: { action: string }) => log.action === 'athlete.identity_approved',
    );

    expect(hasSchoolApproval).toBe(true);
    expect(hasAthleteApproval).toBe(true);

    await app.close();
  });

  it('blocks public signup as super_admin', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const email = `admin_${Math.random().toString(36).slice(2, 10)}@athletiq.local`;

    await api
      .post('/api/auth/register')
      .send({
        email,
        password: 'password123',
        role: 'super_admin',
      })
      .expect(403);

    await app.close();
  });

  it('rejects invalid role header values', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);

    await api
      .post('/api/schools')
      .set({
        'x-athletiq-user-id': schoolAdmin.id,
        'x-athletiq-user-role': 'not_a_role',
      })
      .send({
        name: 'Bad Header School',
        location: 'Kathmandu',
      })
      .expect(401);

    await app.close();
  });

  it('prevents school admins from inviting super_admin users', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const headers = headersFor(schoolAdmin);

    const createSchool = await api
      .post('/api/schools')
      .set(headers)
      .send({
        name: 'Privilege School',
        location: 'Kathmandu',
      })
      .expect(201);

    await api
      .post(`/api/schools/${createSchool.body.id}/approve`)
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .expect(201);

    await api
      .post(`/api/schools/${createSchool.body.id}/invite`)
      .set(headers)
      .send({
        email: `future_admin_${Math.random().toString(36).slice(2, 10)}@athletiq.local`,
        role: 'super_admin',
      })
      .expect(403);

    await app.close();
  });
});
