import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;

type HeaderBag = Record<string, string>;
type Api = ReturnType<typeof request>;
type Actor = { id: string; role: string };

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
const uniqueRunId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const headersFor = (user: Actor): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerUser = async (
  api: Api,
  runId: string,
  label: string,
  role: 'school_admin' | 'guardian',
): Promise<Actor> => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `pg_comm_${runId}_${label}@athletiq.local`,
      password: 'password123',
      role,
    })
    .expect(201);

  return { id: response.body.user.id as string, role };
};

const setupFamily = async (api: Api, runId: string) => {
  const schoolAdmin = await registerUser(api, runId, 'school_admin', 'school_admin');
  const guardian = await registerUser(api, runId, 'guardian', 'guardian');

  const school = await api
    .post('/api/schools')
    .set(headersFor(schoolAdmin))
    .send({ name: `PG Communications School ${runId}`, location: 'Kathmandu' })
    .expect(201);
  await api.post(`/api/schools/${school.body.id}/approve`).set(headersFor(superAdmin)).expect(201);

  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(schoolAdmin))
    .send({
      schoolId: school.body.id,
      fullName: `PG Communications Athlete ${runId}`,
      gender: 'female',
    })
    .expect(201);
  const approvedAthlete = await api
    .post(`/api/athletes/${athlete.body.id}/identity/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  return {
    school: school.body as { id: string },
    athlete: approvedAthlete.body as { id: string },
    guardian,
    schoolAdmin,
  };
};

describeDatabase('phase 16 postgres communications', () => {
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

  it('persists guardian dashboards, notification delivery, and moderated threads across app restarts', async () => {
    const runId = uniqueRunId();
    const firstApp = await createApp();
    const firstApi = request(firstApp.getHttpServer());
    const { school, athlete, guardian, schoolAdmin } = await setupFamily(firstApi, runId);

    await firstApi
      .post('/api/communications/guardian-links')
      .set(headersFor(schoolAdmin))
      .send({ guardianUserId: guardian.id, athleteId: athlete.id, relationship: 'father' })
      .expect(201);

    await firstApi
      .post('/api/communications/announcements')
      .set(headersFor(schoolAdmin))
      .send({
        title: `Transport Update ${runId}`,
        body: 'Bus pickup has moved to the north gate.',
        category: 'announcement',
        schoolIds: [school.id],
      })
      .expect(201);

    await firstApi
      .post('/api/communications/preferences')
      .set(headersFor(guardian))
      .send({ channel: 'sms', category: 'announcement', enabled: false, locale: 'ne' })
      .expect(201);

    await firstApi
      .post('/api/communications/templates')
      .set(headersFor(superAdmin))
      .send({
        key: `pg_comm_template_${runId}`,
        category: 'announcement',
        variants: {
          en: { subject: 'Update for {{athleteName}}', body: 'Please review the latest update.' },
          ne: { subject: '{{athleteName}} को अपडेट', body: 'कृपया नयाँ अपडेट हेर्नुहोस्।' },
        },
      })
      .expect(201);

    const sent = await firstApi
      .post('/api/communications/notifications/send-template')
      .set(headersFor(superAdmin))
      .send({
        templateKey: `pg_comm_template_${runId}`,
        recipientUserId: guardian.id,
        channel: 'sms',
        locale: 'ne',
        variables: { athleteName: 'Nima' },
      })
      .expect(201);
    expect(sent.body.delivery.status).toBe('suppressed');

    const thread = await firstApi
      .post('/api/communications/threads')
      .set(headersFor(schoolAdmin))
      .send({
        title: `Training logistics ${runId}`,
        schoolId: school.id,
        participantUserIds: [guardian.id],
      })
      .expect(201);
    const message = await firstApi
      .post(`/api/communications/threads/${thread.body.id}/messages`)
      .set(headersFor(guardian))
      .send({ body: 'Please confirm pickup time.' })
      .expect(201);
    await firstApi
      .post(`/api/communications/messages/${message.body.id}/hide`)
      .set(headersFor(schoolAdmin))
      .send({ reason: 'Contains private travel detail' })
      .expect(201);

    await firstApp.close();

    const secondApp = await createApp();
    const secondApi = request(secondApp.getHttpServer());

    const dashboard = await secondApi
      .get('/api/communications/family-dashboard')
      .set(headersFor(guardian))
      .expect(200);
    expect(dashboard.body.athletes).toHaveLength(1);
    expect(dashboard.body.announcements.map((item: { title: string }) => item.title)).toContain(
      `Transport Update ${runId}`,
    );
    expect(dashboard.body.notifications.map((item: { id: string }) => item.id)).toContain(
      sent.body.notification.id,
    );
    expect(dashboard.body.threads.map((item: { id: string }) => item.id)).toContain(thread.body.id);

    const preferences = await secondApi
      .get('/api/communications/preferences')
      .set(headersFor(guardian))
      .expect(200);
    expect(preferences.body.preferences[0]).toMatchObject({
      channel: 'sms',
      category: 'announcement',
      enabled: false,
      locale: 'ne',
    });

    const threadView = await secondApi
      .get(`/api/communications/threads/${thread.body.id}`)
      .set(headersFor(guardian))
      .expect(200);
    expect(threadView.body.messages[0]).toMatchObject({
      id: message.body.id,
      status: 'hidden',
      moderationReason: 'Contains private travel detail',
    });
    expect(threadView.body.moderationActions).toHaveLength(1);

    await secondApp.close();
  });
});
