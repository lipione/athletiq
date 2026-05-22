import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

type Actor = { id: string; role: string };

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
const headersFor = (user: Actor) => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerUser = async (api: ReturnType<typeof request>, label: string, role: string) => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `phase16_${Date.now()}_${label}_${Math.random().toString(36).slice(2, 8)}@athletiq.local`,
      password: 'password123',
      role,
    })
    .expect(201);
  return { id: response.body.user.id as string, role };
};

const setupFamily = async (api: ReturnType<typeof request>) => {
  const schoolAdmin = await registerUser(api, 'school', 'school_admin');
  const guardian = await registerUser(api, 'guardian', 'guardian');
  const otherGuardian = await registerUser(api, 'other_guardian', 'guardian');

  const school = await api
    .post('/api/schools')
    .set(headersFor(schoolAdmin))
    .send({ name: 'Phase 16 School', location: 'Kathmandu' })
    .expect(201);
  await api.post(`/api/schools/${school.body.id}/approve`).set(headersFor(superAdmin)).expect(201);

  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(schoolAdmin))
    .send({ schoolId: school.body.id, fullName: 'Phase 16 Athlete', gender: 'female' })
    .expect(201);
  const approvedAthlete = await api
    .post(`/api/athletes/${athlete.body.id}/identity/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  await api
    .post('/api/communications/guardian-links')
    .set(headersFor(schoolAdmin))
    .send({
      guardianUserId: guardian.id,
      athleteId: approvedAthlete.body.id,
      relationship: 'mother',
    })
    .expect(201);

  return {
    school: school.body as { id: string },
    athlete: approvedAthlete.body as { id: string },
    guardian,
    otherGuardian,
    schoolAdmin,
  };
};

describe('phase 16 communications and family experience', () => {
  it('scopes family dashboards to linked guardian athletes', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { guardian, otherGuardian } = await setupFamily(api);

    const dashboard = await api
      .get('/api/communications/family-dashboard')
      .set(headersFor(guardian))
      .expect(200);

    expect(dashboard.body.athletes).toHaveLength(1);
    expect(dashboard.body.athletes[0]).toMatchObject({
      fullName: 'Phase 16 Athlete',
      relationship: 'mother',
    });
    expect(JSON.stringify(dashboard.body)).not.toContain('dateOfBirth');

    await api
      .get(`/api/communications/family-dashboard?guardianUserId=${guardian.id}`)
      .set(headersFor(otherGuardian))
      .expect(403);

    await app.close();
  });

  it('renders bilingual templates and suppresses optional delivery by preference', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { guardian } = await setupFamily(api);

    await api
      .post('/api/communications/preferences')
      .set(headersFor(guardian))
      .send({ channel: 'sms', category: 'announcement', enabled: false, locale: 'ne' })
      .expect(201);

    await api
      .post('/api/communications/templates')
      .set(headersFor(superAdmin))
      .send({
        key: 'schedule_change',
        category: 'announcement',
        required: false,
        variants: {
          en: {
            subject: 'Schedule changed for {{athleteName}}',
            body: 'Please review the new fixture time.',
          },
          ne: {
            subject: '{{athleteName}} को तालिका परिवर्तन भयो',
            body: 'कृपया नयाँ खेल समय हेर्नुहोस्।',
          },
        },
      })
      .expect(201);

    const sent = await api
      .post('/api/communications/notifications/send-template')
      .set(headersFor(superAdmin))
      .send({
        templateKey: 'schedule_change',
        recipientUserId: guardian.id,
        channel: 'sms',
        locale: 'ne',
        variables: { athleteName: 'Nima' },
      })
      .expect(201);

    expect(sent.body.notification.subject).toContain('Nima');
    expect(sent.body.notification.body).toContain('नयाँ खेल समय');
    expect(sent.body.delivery.status).toBe('suppressed');
    expect(sent.body.delivery.error).toBe('suppressed_by_preference');

    await app.close();
  });

  it('keeps required compliance notices deliverable even when optional channels are disabled', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { guardian } = await setupFamily(api);

    await api
      .post('/api/communications/preferences')
      .set(headersFor(guardian))
      .send({ channel: 'email', category: 'compliance', enabled: false, locale: 'en' })
      .expect(201);

    await api
      .post('/api/communications/templates')
      .set(headersFor(superAdmin))
      .send({
        key: 'required_waiver',
        category: 'compliance',
        required: true,
        variants: {
          en: { subject: 'Waiver required', body: 'A required waiver needs review.' },
          ne: { subject: 'छुटपत्र आवश्यक छ', body: 'आवश्यक छुटपत्र समीक्षा गर्नुपर्छ।' },
        },
      })
      .expect(201);

    const sent = await api
      .post('/api/communications/notifications/send-template')
      .set(headersFor(superAdmin))
      .send({
        templateKey: 'required_waiver',
        recipientUserId: guardian.id,
        channel: 'email',
        locale: 'en',
      })
      .expect(201);

    expect(sent.body.notification.required).toBe(true);
    expect(sent.body.delivery.status).toBe('queued');

    await app.close();
  });

  it('creates moderated threads and writes audit records', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { guardian, school, schoolAdmin } = await setupFamily(api);

    const thread = await api
      .post('/api/communications/threads')
      .set(headersFor(schoolAdmin))
      .send({
        title: 'Team logistics',
        schoolId: school.id,
        participantUserIds: [guardian.id],
      })
      .expect(201);

    const message = await api
      .post(`/api/communications/threads/${thread.body.id}/messages`)
      .set(headersFor(guardian))
      .send({ body: 'Can we confirm bus timing?' })
      .expect(201);

    const moderated = await api
      .post(`/api/communications/messages/${message.body.id}/hide`)
      .set(headersFor(schoolAdmin))
      .send({ reason: 'Contains private logistics detail' })
      .expect(201);

    expect(moderated.body.message.status).toBe('hidden');
    expect(moderated.body.moderation.reason).toContain('private logistics');

    const audit = await api.get('/api/audit').set(headersFor(superAdmin)).expect(200);
    expect(
      (audit.body as Array<{ action: string; resourceId: string }>).some(
        (entry) =>
          entry.action === 'communications.message_hidden' && entry.resourceId === message.body.id,
      ),
    ).toBe(true);

    await app.close();
  });
});
