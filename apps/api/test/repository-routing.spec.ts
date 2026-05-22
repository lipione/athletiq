import { afterEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import {
  PostgresSchoolRepository,
  PostgresUserRepository,
} from '../src/repositories/postgres-repositories.js';

describe('repository backend routing', () => {
  const originalBackend = process.env.ATHLETIQ_DATA_BACKEND;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalBackend === undefined) {
      delete process.env.ATHLETIQ_DATA_BACKEND;
    } else {
      process.env.ATHLETIQ_DATA_BACKEND = originalBackend;
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('routes API requests through postgres repositories when postgres backend is selected', async () => {
    process.env.ATHLETIQ_DATA_BACKEND = 'postgres';
    process.env.DATABASE_URL = 'postgres://athletiq:athletiq@127.0.0.1:1/athletiq';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PostgresUserRepository)
      .useValue({
        findById: () =>
          Promise.resolve({
            id: 'usr_super_admin',
            email: 'admin@athletiq.local',
            password: 'admin123',
            roles: ['super_admin'],
            schoolIds: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
      })
      .overrideProvider(PostgresSchoolRepository)
      .useValue({
        list: () =>
          Promise.resolve([
            {
              id: 'sch_postgres_route',
              name: 'Postgres Route School',
              status: 'approved',
              createdBy: 'usr_super_admin',
              adminUserIds: [],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ]),
      })
      .compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    try {
      app.setGlobalPrefix('api');
      await app.init();
      await app.getHttpAdapter().getInstance().ready();

      const response = await request(app.getHttpServer())
        .get('/api/schools')
        .set({
          'x-athletiq-user-id': 'usr_super_admin',
          'x-athletiq-user-role': 'super_admin',
        })
        .expect(200);

      expect(response.body).toEqual([
        expect.objectContaining({
          id: 'sch_postgres_route',
          name: 'Postgres Route School',
        }),
      ]);
    } finally {
      await app.close();
    }
  });
});
