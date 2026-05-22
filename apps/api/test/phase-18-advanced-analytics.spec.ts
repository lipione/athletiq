import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

type Api = ReturnType<typeof request>;
type HeaderBag = Record<string, string>;

const headersFor = (user: { id: string; role: string }): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const registerUser = async (api: Api, role: 'school_admin' | 'coach' = 'school_admin') => {
  const email = `phase18_${role}_${Math.random().toString(36).slice(2, 10)}@athletiq.local`;
  const response = await api
    .post('/api/auth/register')
    .send({ email, password: 'password123', role })
    .expect(201);
  return { id: response.body.user.id as string, role };
};

const createSchool = async (api: Api, schoolAdmin: { id: string; role: string }, name: string) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor(schoolAdmin))
    .send({ name, location: 'Kathmandu' })
    .expect(201);

  await api
    .post(`/api/schools/${school.body.id}/approve`)
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return school.body as { id: string; name: string };
};

const createAthlete = async (
  api: Api,
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
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return athlete.body as { id: string; fullName: string };
};

describe('phase 18 advanced analytics and AI report drafts', () => {
  it('publishes longitudinal analytics, rankings, quality checks, exports and approved report drafts', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
    const schoolAdminA = await registerUser(api);
    const schoolAdminB = await registerUser(api);
    const schoolA = await createSchool(api, schoolAdminA, 'Phase 18 School A');
    const schoolB = await createSchool(api, schoolAdminB, 'Phase 18 School B');
    const athleteA = await createAthlete(api, schoolAdminA, schoolA.id, 'Mina Tamang');
    const athleteB = await createAthlete(api, schoolAdminB, schoolB.id, 'Sita Rai');

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({ name: 'Phase 18 League', sport: 'football', format: 'league', season: '2026' })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(schoolAdminA))
      .send({ schoolId: schoolA.id })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(schoolAdminB))
      .send({ schoolId: schoolB.id })
      .expect(201);

    const teamA = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminA))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolA.id,
        name: 'Phase 18 Green',
        athleteIds: [athleteA.id],
      })
      .expect(201);

    const teamB = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminB))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolB.id,
        name: 'Phase 18 Blue',
        athleteIds: [athleteB.id],
      })
      .expect(201);

    const match = await api
      .post('/api/matches')
      .set(headersFor(superAdmin))
      .send({
        tournamentId: tournament.body.id,
        homeTeamId: teamA.body.id,
        awayTeamId: teamB.body.id,
        scheduledAt: '2026-12-02T10:00:00Z',
      })
      .expect(201);

    await api
      .post(`/api/matches/${match.body.id}/submit-result`)
      .set(headersFor(superAdmin))
      .send({ homeScore: 2, awayScore: 1 })
      .expect(201);

    await api
      .post(`/api/matches/${match.body.id}/events`)
      .set(headersFor(superAdmin))
      .send({ athleteId: athleteA.id, teamId: teamA.body.id, type: 'goal', quantity: 2 })
      .expect(201);

    await api
      .post(`/api/matches/${match.body.id}/events`)
      .set(headersFor(superAdmin))
      .send({ athleteId: athleteB.id, teamId: teamB.body.id, type: 'goal', quantity: 1 })
      .expect(201);

    await api.post(`/api/matches/${match.body.id}/verify`).set(headersFor(superAdmin)).expect(201);

    const athleteDevelopment = await api
      .get(`/api/analytics/athletes/${athleteA.id}/development`)
      .set(headersFor(superAdmin))
      .expect(200);

    expect(athleteDevelopment.body).toMatchObject({
      athleteId: athleteA.id,
      athleteName: 'Mina Tamang',
      verifiedMatches: 1,
      totalGoals: 2,
      seasons: [{ season: '2026', tournaments: 1, goals: 2 }],
    });
    expect(athleteDevelopment.body.trend).toBe('rising');

    const rankings = await api
      .get('/api/analytics/rankings?scope=federation&sport=football&metric=goals')
      .set(headersFor(superAdmin))
      .expect(200);
    expect(rankings.body.entries[0]).toMatchObject({
      rank: 1,
      athleteId: athleteA.id,
      metric: 'goals',
      value: 2,
    });

    const quality = await api
      .get('/api/analytics/data-quality')
      .set(headersFor(superAdmin))
      .expect(200);
    expect(quality.body.score).toBeGreaterThanOrEqual(80);
    expect(quality.body.checks.map((check: { key: string }) => check.key)).toContain(
      'identityVerification',
    );

    const catalog = await api
      .get('/api/analytics/data-products/exports')
      .set(headersFor(superAdmin))
      .expect(200);
    expect(catalog.body.exports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'athlete-development-json', format: 'json' }),
        expect.objectContaining({ key: 'rankings-csv', format: 'csv' }),
      ]),
    );

    const draft = await api
      .post('/api/analytics/reports/drafts')
      .set(headersFor(superAdmin))
      .send({ reportType: 'federation_summary', scope: 'football', locale: 'en' })
      .expect(201);
    expect(draft.body).toMatchObject({
      status: 'draft',
      reportType: 'federation_summary',
      requiresApproval: true,
    });
    expect(draft.body.sections[0].title).toContain('Participation');

    const approved = await api
      .post(`/api/analytics/reports/drafts/${draft.body.id}/approve`)
      .set(headersFor(superAdmin))
      .send({ note: 'Approved for federation review' })
      .expect(201);
    expect(approved.body).toMatchObject({
      id: draft.body.id,
      status: 'approved',
      approvedBy: superAdmin.id,
    });

    const coach = await registerUser(api, 'coach');
    await api.get('/api/analytics/data-quality').set(headersFor(coach)).expect(403);

    await app.close();
  });
});
