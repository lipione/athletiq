import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AppDataStore, type WaiverTemplateRecord } from '../src/common/store.js';

type HeaderBag = Record<string, string>;

const headersFor = (user: { id: string; role: string }): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };

const createApp = async () => {
  delete process.env.ATHLETIQ_DATA_BACKEND;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerUser = async (api: ReturnType<typeof request>, role = 'school_admin') => {
  const email = `phase10_${Date.now()}_${Math.random().toString(36).slice(2)}@athletiq.local`;
  const response = await api
    .post('/api/auth/register')
    .send({ email, password: 'password123', role })
    .expect(201);

  return {
    id: response.body.user.id as string,
    role,
    email,
  };
};

const createAndApproveSchool = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  name = 'Phase 10 School',
) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor(schoolAdmin))
    .send({ name, location: 'Kathmandu' })
    .expect(201);

  await api.post(`/api/schools/${school.body.id}/approve`).set(headersFor(superAdmin)).expect(201);

  return school.body as { id: string; name: string };
};

const createApprovedTournament = async (api: ReturnType<typeof request>, name = 'Phase 10 Cup') => {
  const tournament = await api
    .post('/api/tournaments')
    .set(headersFor(superAdmin))
    .send({
      name,
      sport: 'football',
      format: 'league',
      maxTeams: 8,
    })
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
  fullName = 'Amina Rai',
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

describe('phase 10 registration, payments, memberships, and waivers', () => {
  it('school membership purchase stays pending until manual payment approval activates it', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Membership School');

    const plan = await api
      .post('/api/billing/membership-plans')
      .set(headersFor(superAdmin))
      .send({
        name: 'School Annual',
        amount: 350000,
        currency: 'NPR',
        durationDays: 365,
      })
      .expect(201);

    const purchase = await api
      .post(`/api/billing/schools/${school.id}/memberships`)
      .set(headersFor(schoolAdmin))
      .send({ planId: plan.body.id })
      .expect(201);

    expect(purchase.body.membership.status).toBe('pending');
    expect(purchase.body.invoice.status).toBe('open');
    expect(purchase.body.invoice.balanceAmount).toBe(350000);

    const payment = await api
      .post(`/api/billing/invoices/${purchase.body.invoice.id}/manual-payments`)
      .set(headersFor(superAdmin))
      .send({
        amount: 350000,
        method: 'manual_bank',
        reference: 'BANK-123',
      })
      .expect(201);

    expect(payment.body.invoice.status).toBe('paid');
    expect(payment.body.membership.status).toBe('active');

    const report = await api
      .get(`/api/billing/reports/finance?schoolId=${school.id}`)
      .set(headersFor(superAdmin))
      .expect(200);

    expect(report.body.paidAmount).toBe(350000);
    expect(report.body.netAmount).toBe(350000);
    expect(report.body.outstandingAmount).toBe(0);

    await app.close();
  });

  it('tournament registration fee blocks registration until the invoice is paid', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Paid Tournament School');
    const tournament = await createApprovedTournament(api, 'Paid Cup');

    await api
      .post(`/api/billing/tournaments/${tournament.id}/registration-fee`)
      .set(headersFor(superAdmin))
      .send({
        amount: 250000,
        currency: 'NPR',
        requiredBeforeApproval: true,
      })
      .expect(201);

    const blocked = await api
      .post(`/api/tournaments/${tournament.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.id })
      .expect(400);
    expect(blocked.body.message).toContain('payment required');

    const invoice = await api
      .post(`/api/billing/tournaments/${tournament.id}/schools/${school.id}/registration-invoice`)
      .set(headersFor(schoolAdmin))
      .send({})
      .expect(201);

    await api
      .post(`/api/billing/invoices/${invoice.body.id}/manual-payments`)
      .set(headersFor(superAdmin))
      .send({
        amount: 250000,
        method: 'manual_cash',
        reference: 'CASH-1',
      })
      .expect(201);

    const registered = await api
      .post(`/api/tournaments/${tournament.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.id })
      .expect(201);

    expect(registered.body.schoolIds).toContain(school.id);
    expect(registered.body.exists).toBe(false);

    await app.close();
  });

  it('discount codes and installment schedules compute correct balances', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Installment School');

    const plan = await api
      .post('/api/billing/membership-plans')
      .set(headersFor(superAdmin))
      .send({
        name: 'Installment Plan',
        amount: 350000,
        currency: 'NPR',
        durationDays: 365,
      })
      .expect(201);

    await api
      .post('/api/billing/discount-codes')
      .set(headersFor(superAdmin))
      .send({
        code: 'SCHOLAR500',
        amount: 50000,
        currency: 'NPR',
      })
      .expect(201);

    const purchase = await api
      .post(`/api/billing/schools/${school.id}/memberships`)
      .set(headersFor(schoolAdmin))
      .send({
        planId: plan.body.id,
        discountCode: 'SCHOLAR500',
        installmentCount: 2,
      })
      .expect(201);

    expect(purchase.body.invoice.subtotalAmount).toBe(350000);
    expect(purchase.body.invoice.discountAmount).toBe(50000);
    expect(purchase.body.invoice.totalAmount).toBe(300000);
    expect(purchase.body.invoice.balanceAmount).toBe(300000);
    expect(purchase.body.invoice.installments).toHaveLength(2);
    expect(
      purchase.body.invoice.installments.map((item: { amount: number }) => item.amount),
    ).toEqual([150000, 150000]);

    await app.close();
  });

  it('refunds create separate records and reduce report net revenue without deleting payment history', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Refund School');
    const plan = await api
      .post('/api/billing/membership-plans')
      .set(headersFor(superAdmin))
      .send({
        name: 'Refundable Plan',
        amount: 300000,
        currency: 'NPR',
        durationDays: 365,
      })
      .expect(201);

    const purchase = await api
      .post(`/api/billing/schools/${school.id}/memberships`)
      .set(headersFor(schoolAdmin))
      .send({ planId: plan.body.id })
      .expect(201);

    const payment = await api
      .post(`/api/billing/invoices/${purchase.body.invoice.id}/manual-payments`)
      .set(headersFor(superAdmin))
      .send({
        amount: 300000,
        method: 'manual_bank',
        reference: 'PAY-REFUND',
      })
      .expect(201);

    const refund = await api
      .post(`/api/billing/payments/${payment.body.payment.id}/refunds`)
      .set(headersFor(superAdmin))
      .send({ amount: 50000, reason: 'partial scholarship adjustment' })
      .expect(201);

    expect(refund.body.refund.amount).toBe(50000);
    expect(refund.body.invoice.refundedAmount).toBe(50000);

    const report = await api
      .get(`/api/billing/reports/finance?schoolId=${school.id}`)
      .set(headersFor(superAdmin))
      .expect(200);

    expect(report.body.payments).toHaveLength(1);
    expect(report.body.refunds).toHaveLength(1);
    expect(report.body.paidAmount).toBe(300000);
    expect(report.body.refundedAmount).toBe(50000);
    expect(report.body.netAmount).toBe(250000);

    await app.close();
  });

  it('waiver requirement blocks team creation until each athlete has a valid signature', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(api, schoolAdmin, 'Waiver School');
    const tournament = await createApprovedTournament(api, 'Waiver Cup');

    await api
      .post(`/api/tournaments/${tournament.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.id })
      .expect(201);

    const athlete = await createApprovedAthlete(api, schoolAdmin, school.id);

    const template = await api
      .post('/api/waivers/templates')
      .set(headersFor(superAdmin))
      .send({
        name: 'Tournament Participation Waiver',
        body: 'Guardian confirms participation terms.',
        version: '2026.1',
        expiresAfterDays: 365,
      })
      .expect(201);

    await api
      .post(`/api/waivers/tournaments/${tournament.id}/requirements`)
      .set(headersFor(superAdmin))
      .send({ waiverTemplateId: template.body.id })
      .expect(201);

    const blocked = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.id,
        schoolId: school.id,
        name: 'U-14 A',
        athleteIds: [athlete.id],
      })
      .expect(400);
    expect(blocked.body.message).toContain(athlete.id);

    const signature = await api
      .post('/api/waivers/signatures')
      .set(headersFor(schoolAdmin))
      .set('User-Agent', 'phase-10-test-agent')
      .send({
        waiverTemplateId: template.body.id,
        tournamentId: tournament.id,
        athleteId: athlete.id,
        schoolId: school.id,
        guardianName: 'Maya Rai',
        relationship: 'mother',
      })
      .expect(201);
    expect(signature.body.ipAddress).toEqual(expect.any(String));
    expect(signature.body.userAgent).toBe('phase-10-test-agent');
    expect(signature.body.waiverTemplateVersion).toBe('2026.1');

    const store = app.get(AppDataStore) as unknown as {
      waiverTemplates: Map<string, WaiverTemplateRecord>;
    };
    const storedTemplate = store.waiverTemplates.get(template.body.id);
    expect(storedTemplate).toBeDefined();
    store.waiverTemplates.set(template.body.id, {
      ...storedTemplate!,
      version: '2026.2',
      updatedAt: new Date().toISOString(),
    });

    await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.id,
        schoolId: school.id,
        name: 'U-14 A',
        athleteIds: [athlete.id],
      })
      .expect(400);

    await api
      .post('/api/waivers/signatures')
      .set(headersFor(schoolAdmin))
      .set('User-Agent', 'phase-10-test-agent')
      .send({
        waiverTemplateId: template.body.id,
        tournamentId: tournament.id,
        athleteId: athlete.id,
        schoolId: school.id,
        guardianName: 'Maya Rai',
        relationship: 'mother',
      })
      .expect(201);

    const team = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.id,
        schoolId: school.id,
        name: 'U-14 A',
        athleteIds: [athlete.id],
      })
      .expect(201);

    expect(team.body.status).toBe('approved');

    await app.close();
  });
});
