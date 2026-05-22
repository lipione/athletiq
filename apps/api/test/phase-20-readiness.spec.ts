import { afterEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const savedEnv = {
  NODE_ENV: process.env.NODE_ENV,
  ATHLETIQ_DATA_BACKEND: process.env.ATHLETIQ_DATA_BACKEND,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  ATHLETIQ_RELEASE_SHA: process.env.ATHLETIQ_RELEASE_SHA,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  BACKUP_BUCKET: process.env.BACKUP_BUCKET,
};

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('phase 20 production readiness', () => {
  it('reports dependency readiness and deployment metadata without leaking secrets', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ATHLETIQ_DATA_BACKEND = 'postgres';
    process.env.DATABASE_URL = 'postgres://athletiq:secret-password@db.internal:5432/athletiq';
    process.env.REDIS_URL = 'redis://:redis-secret@redis.internal:6379';
    process.env.ATHLETIQ_RELEASE_SHA = 'abc1234';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://otel.example.com';
    process.env.BACKUP_BUCKET = 's3://athletiq-prod-backups';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const response = await request(app.getHttpServer()).get('/api/health/readiness').expect(200);
    expect(response.body).toMatchObject({
      status: 'ready',
      service: 'athletiq-api',
      environment: 'production',
      releaseSha: 'abc1234',
      checks: {
        database: { configured: true, backend: 'postgres' },
        redis: { configured: true },
        storage: { configured: true },
        observability: { configured: true },
        backups: { configured: true },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('secret-password');
    expect(JSON.stringify(response.body)).not.toContain('redis-secret');

    await app.close();
  });

  it('reports degraded readiness when production dependencies are missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.BACKUP_BUCKET;
    process.env.ATHLETIQ_DATA_BACKEND = 'memory';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const response = await request(app.getHttpServer()).get('/api/health/readiness').expect(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.database).toMatchObject({
      configured: false,
      backend: 'memory',
    });
    expect(response.body.checks.redis.configured).toBe(false);

    await app.close();
  });
});
