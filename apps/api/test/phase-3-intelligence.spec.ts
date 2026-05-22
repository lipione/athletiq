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

const registerUser = async (
  api: ReturnType<typeof request>,
  role: 'super_admin' | 'school_admin' | 'coach' | 'referee' = 'school_admin',
) => {
  const email = `user_${Math.random().toString(36).slice(2, 10)}@athletiq.local`;
  const password = 'password123';

  const response = await api
    .post('/api/auth/register')
    .send({
      email,
      password,
      role,
    })
    .expect(201);

  return {
    id: response.body.user.id,
    role,
    email,
    password,
  };
};

const createAndApproveSchool = async (
  api: ReturnType<typeof request>,
  userId: string,
  schoolName: string,
) => {
  const headers = headersFor({ id: userId, role: 'school_admin' });
  const school = await api
    .post('/api/schools')
    .set(headers)
    .send({
      name: schoolName,
      location: 'Pokhara',
    })
    .expect(201);

  await api
    .post(`/api/schools/${school.body.id}/approve`)
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return school.body;
};

describe('AI and search services', () => {
  it('extracts documents from structured text input', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);

    const response = await api
      .post('/api/documents/ocr/extract')
      .set(headersFor({ ...schoolAdmin }))
      .send({
        documentType: 'birth_certificate',
        documentText:
          'Name: Maya Rai\nDate of Birth: 2012-03-14\nFather: Sunil Rai\nMother: Mina Rai\nAddress: Kathmandu\nGender: female\nSchool: Mountain Academy',
      })
      .expect(201);

    expect(response.body.documentType).toBe('birth_certificate');
    expect(response.body.extracted).toMatchObject({
      fullName: 'Maya Rai',
      dateOfBirth: '2012-03-14',
      fatherName: 'Sunil Rai',
      motherName: 'Mina Rai',
      address: 'Kathmandu',
      gender: 'female',
      schoolName: 'Mountain Academy',
    });
    expect(response.body.confidence).toBeGreaterThan(50);

    await app.close();
  });

  it('returns global search hits across schools and athletes', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin.id, 'Glacier High School');

    await api
      .post('/api/athletes/drafts')
      .set(headersFor(schoolAdmin))
      .send({
        schoolId: school.id,
        fullName: 'Nabin Gurung',
      })
      .expect(201);

    const result = await api
      .get('/api/search')
      .query({ q: 'Glacier' })
      .set(headersFor(schoolAdmin))
      .expect(200);

    expect(result.body.schools.length).toBe(1);
    expect(result.body.schools[0].name).toBe('Glacier High School');

    const athleteResult = await api
      .get('/api/search')
      .query({ q: 'Nabin' })
      .set(headersFor(schoolAdmin))
      .expect(200);

    expect(athleteResult.body.athletes.length).toBe(1);
    expect(athleteResult.body.athletes[0].fullName).toBe('Nabin Gurung');

    await app.close();
  });
});
