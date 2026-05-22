import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;

type HeaderBag = Record<string, string>;

const headersFor = (user: { id: string; role: string }): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerUser = async (
  api: ReturnType<typeof request>,
  runId: string,
  role = 'school_admin',
) => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `pg_phase10_${role}_${runId}_${Math.random().toString(36).slice(2)}@athletiq.local`,
      password: 'password123',
      role,
    })
    .expect(201);

  return { id: response.body.user.id as string, role };
};

const createAndApproveSchool = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  name: string,
) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor(schoolAdmin))
    .send({ name, location: 'Kathmandu' })
    .expect(201);

  await api.post(`/api/schools/${school.body.id}/approve`).set(headersFor(superAdmin)).expect(201);

  return school.body as { id: string };
};

const createApprovedTournament = async (api: ReturnType<typeof request>, name: string) => {
  const tournament = await api
    .post('/api/tournaments')
    .set(headersFor(superAdmin))
    .send({ name, sport: 'football', format: 'league', maxTeams: 8 })
    .expect(201);

  await api
    .post(`/api/tournaments/${tournament.body.id}/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  return tournament.body as { id: string };
};

const createApprovedAthlete = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  schoolId: string,
  fullName: string,
) => {
  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(schoolAdmin))
    .send({ schoolId, fullName, gender: 'female' })
    .expect(201);

  await api
    .post(`/api/athletes/${athlete.body.id}/identity/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  return athlete.body as { id: string };
};

describeDatabase('phase 10 postgres billing and waivers', () => {
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

  it('persists membership invoices, manual payments, refunds, and finance reports', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const schoolAdmin = await registerUser(api, runId);
    const school = await createAndApproveSchool(api, schoolAdmin, `PG Billing School ${runId}`);

    const plan = await api
      .post('/api/billing/membership-plans')
      .set(headersFor(superAdmin))
      .send({
        name: `PG Annual ${runId}`,
        amount: 400000,
        currency: 'NPR',
        durationDays: 365,
      })
      .expect(201);

    await api
      .post('/api/billing/discount-codes')
      .set(headersFor(superAdmin))
      .send({
        code: `PGDISC${runId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}`,
        amount: 100000,
        currency: 'NPR',
      })
      .expect(201);

    const purchase = await api
      .post(`/api/billing/schools/${school.id}/memberships`)
      .set(headersFor(schoolAdmin))
      .send({
        planId: plan.body.id,
        discountCode: `PGDISC${runId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}`,
        installmentCount: 2,
      })
      .expect(201);

    expect(purchase.body.invoice.totalAmount).toBe(300000);
    expect(purchase.body.invoice.installments).toHaveLength(2);

    const payment = await api
      .post(`/api/billing/invoices/${purchase.body.invoice.id}/manual-payments`)
      .set(headersFor(superAdmin))
      .send({ amount: 300000, method: 'manual_bank', reference: `PGPAY-${runId}` })
      .expect(201);
    expect(payment.body.membership.status).toBe('active');

    await api
      .post(`/api/billing/payments/${payment.body.payment.id}/refunds`)
      .set(headersFor(superAdmin))
      .send({ amount: 75000, reason: 'postgres phase10 refund' })
      .expect(201);

    const report = await api
      .get(`/api/billing/reports/finance?schoolId=${school.id}`)
      .set(headersFor(superAdmin))
      .expect(200);

    expect(report.body.paidAmount).toBe(300000);
    expect(report.body.refundedAmount).toBe(75000);
    expect(report.body.netAmount).toBe(225000);
    expect(report.body.payments).toHaveLength(1);
    expect(report.body.refunds).toHaveLength(1);

    await app.close();
  });

  it('enforces paid tournament registration and waiver signatures before team creation', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const schoolAdmin = await registerUser(api, runId);
    const school = await createAndApproveSchool(api, schoolAdmin, `PG Waiver School ${runId}`);
    const tournament = await createApprovedTournament(api, `PG Waiver Cup ${runId}`);
    const athlete = await createApprovedAthlete(api, schoolAdmin, school.id, 'PG Waiver Athlete');

    await api
      .post(`/api/billing/tournaments/${tournament.id}/registration-fee`)
      .set(headersFor(superAdmin))
      .send({ amount: 200000, currency: 'NPR', requiredBeforeApproval: true })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.id })
      .expect(400);

    const invoice = await api
      .post(`/api/billing/tournaments/${tournament.id}/schools/${school.id}/registration-invoice`)
      .set(headersFor(schoolAdmin))
      .send({})
      .expect(201);

    await api
      .post(`/api/billing/invoices/${invoice.body.id}/manual-payments`)
      .set(headersFor(superAdmin))
      .send({ amount: 200000, method: 'manual_cash', reference: `PGCASH-${runId}` })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.id })
      .expect(201);

    const template = await api
      .post('/api/waivers/templates')
      .set(headersFor(superAdmin))
      .send({
        name: `PG Participation ${runId}`,
        body: 'Guardian confirms terms.',
        version: '2026.1',
        expiresAfterDays: 365,
      })
      .expect(201);

    await api
      .post(`/api/waivers/tournaments/${tournament.id}/requirements`)
      .set(headersFor(superAdmin))
      .send({ waiverTemplateId: template.body.id })
      .expect(201);

    await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.id,
        schoolId: school.id,
        name: 'PG U-14',
        athleteIds: [athlete.id],
      })
      .expect(400);

    const signature = await api
      .post('/api/waivers/signatures')
      .set(headersFor(schoolAdmin))
      .set('User-Agent', 'phase-10-postgres-agent')
      .send({
        waiverTemplateId: template.body.id,
        tournamentId: tournament.id,
        athleteId: athlete.id,
        schoolId: school.id,
        guardianName: 'PG Guardian',
        relationship: 'parent',
      })
      .expect(201);
    expect(signature.body.ipAddress).toEqual(expect.any(String));
    expect(signature.body.userAgent).toBe('phase-10-postgres-agent');
    expect(signature.body.waiverTemplateVersion).toBe('2026.1');

    const team = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.id,
        schoolId: school.id,
        name: 'PG U-14',
        athleteIds: [athlete.id],
      })
      .expect(201);
    expect(team.body.status).toBe('approved');

    await app.close();
  });
});
