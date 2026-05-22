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

const uniqueRunId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerSchoolAdmin = async (
  api: ReturnType<typeof request>,
  runId: string,
  label: string,
) => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `pg_${runId}_${label}@athletiq.local`,
      password: 'password123',
      role: 'school_admin',
    })
    .expect(201);

  return {
    id: response.body.user.id as string,
    role: 'school_admin',
  };
};

const createAndApproveSchool = async (
  api: ReturnType<typeof request>,
  admin: { id: string; role: string },
  name: string,
) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor(admin))
    .send({
      name,
      location: 'Kathmandu',
    })
    .expect(201);

  await api
    .post(`/api/schools/${school.body.id}/approve`)
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return school.body;
};

const createAndApproveAthlete = async (
  api: ReturnType<typeof request>,
  schoolAdmin: { id: string; role: string },
  schoolId: string,
  fullName: string,
) => {
  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(schoolAdmin))
    .send({
      schoolId,
      fullName,
      gender: 'female',
    })
    .expect(201);

  const approved = await api
    .post(`/api/athletes/${athlete.body.id}/identity/approve`)
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return approved.body;
};

describeDatabase('phase 8 postgres repositories', () => {
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

  it('persists identity, school approval, athlete approval, and audit records', async () => {
    const email = `pg_${uniqueRunId()}@athletiq.local`;
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };

    let app = await createApp();
    let api = request(app.getHttpServer());

    const registration = await api
      .post('/api/auth/register')
      .send({
        email,
        password: 'password123',
        role: 'school_admin',
      })
      .expect(201);

    await api
      .post('/api/auth/register')
      .send({
        email,
        password: 'password123',
        role: 'school_admin',
      })
      .expect(400);

    const schoolAdmin = { id: registration.body.user.id, role: 'school_admin' };
    const school = await api
      .post('/api/schools')
      .set(headersFor(schoolAdmin))
      .send({ name: `Persistent School ${Date.now()}` })
      .expect(201);

    await api
      .post(`/api/schools/${school.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);

    await app.close();

    app = await createApp();
    api = request(app.getHttpServer());

    const schools = await api.get('/api/schools').set(headersFor(superAdmin)).expect(200);
    expect(
      schools.body.some(
        (candidate: { id: string; status: string }) =>
          candidate.id === school.body.id && candidate.status === 'approved',
      ),
    ).toBe(true);

    const athlete = await api
      .post('/api/athletes/drafts')
      .set(headersFor(schoolAdmin))
      .send({
        schoolId: school.body.id,
        fullName: 'Persistent Athlete',
      })
      .expect(201);

    const beforeAudit = await api.get('/api/audit').set(headersFor(superAdmin)).expect(200);
    const approvedAthlete = await api
      .post(`/api/athletes/${athlete.body.id}/identity/approve`)
      .set(headersFor(superAdmin))
      .expect(201);
    const afterAudit = await api.get('/api/audit').set(headersFor(superAdmin)).expect(200);

    expect(approvedAthlete.body.status).toBe('identity_approved');
    expect(approvedAthlete.body.athletiqId).toMatch(/^ATQ-/);
    expect(afterAudit.body.length).toBeGreaterThan(beforeAudit.body.length);

    await app.close();

    app = await createApp();
    api = request(app.getHttpServer());

    const persistedAthlete = await api
      .get(`/api/athletes/${athlete.body.id}`)
      .set(headersFor(schoolAdmin))
      .expect(200);

    expect(persistedAthlete.body.athletiqId).toBe(approvedAthlete.body.athletiqId);

    await app.close();
  });

  it('exercises the production tournament operations path through postgres repositories', async () => {
    const runId = uniqueRunId();
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
    const referee = { id: 'usr_super_admin', role: 'super_admin' };

    const app = await createApp();
    const api = request(app.getHttpServer());

    const schoolAdminA = await registerSchoolAdmin(api, runId, 'admin_a');
    const schoolAdminB = await registerSchoolAdmin(api, runId, 'admin_b');

    const schoolA = await createAndApproveSchool(
      api,
      schoolAdminA,
      `PG Foundation School A ${runId}`,
    );
    const schoolB = await createAndApproveSchool(
      api,
      schoolAdminB,
      `PG Foundation School B ${runId}`,
    );

    const athleteA = await createAndApproveAthlete(
      api,
      schoolAdminA,
      schoolA.id,
      `PG Athlete A ${runId}`,
    );
    const athleteB = await createAndApproveAthlete(
      api,
      schoolAdminB,
      schoolB.id,
      `PG Athlete B ${runId}`,
    );

    expect(athleteA).toMatchObject({
      schoolId: schoolA.id,
      status: 'identity_approved',
      athletiqId: expect.stringMatching(/^ATQ-/),
    });
    expect(athleteB).toMatchObject({
      schoolId: schoolB.id,
      status: 'identity_approved',
      athletiqId: expect.stringMatching(/^ATQ-/),
    });

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({
        name: `PG Foundation Cup ${runId}`,
        sport: 'football',
        format: 'league',
        maxTeams: 8,
        season: '2026',
      })
      .expect(201);

    const approvedTournament = await api
      .post(`/api/tournaments/${tournament.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);
    expect(approvedTournament.body.status).toBe('approved');

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
        name: `PG Red ${runId}`,
        athleteIds: [athleteA.id],
      })
      .expect(201);
    const teamB = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminB))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolB.id,
        name: `PG Blue ${runId}`,
        athleteIds: [athleteB.id],
      })
      .expect(201);

    await api.post(`/api/teams/${teamA.body.id}/approve`).set(headersFor(superAdmin)).expect(201);
    await api.post(`/api/teams/${teamB.body.id}/approve`).set(headersFor(superAdmin)).expect(201);

    const match = await api
      .post('/api/matches')
      .set(headersFor(superAdmin))
      .send({
        tournamentId: tournament.body.id,
        homeTeamId: teamA.body.id,
        awayTeamId: teamB.body.id,
        scheduledAt: '2026-12-15T10:00:00Z',
      })
      .expect(201);

    await api
      .post(`/api/matches/${match.body.id}/submit-result`)
      .set(headersFor(superAdmin))
      .send({
        homeScore: 2,
        awayScore: 1,
        sportStats: { shotsOnTarget: 6 },
        notes: `postgres e2e ${runId}`,
      })
      .expect(201);

    const goal = await api
      .post(`/api/matches/${match.body.id}/events`)
      .set(headersFor(referee))
      .send({
        athleteId: athleteA.id,
        teamId: teamA.body.id,
        type: 'goal',
        minute: 18,
        quantity: 1,
      })
      .expect(201);
    expect(goal.body).toMatchObject({
      matchId: match.body.id,
      athleteId: athleteA.id,
      teamId: teamA.body.id,
      type: 'goal',
      status: 'active',
    });

    const clientId = `pg-client-${runId}`;
    const mutationId = `pg-sync-assist-${runId}`;
    const mutationBody = {
      clientId,
      schoolId: schoolA.id,
      mutations: [
        {
          mutationId,
          mutationType: 'match_event_submit',
          payload: {
            matchId: match.body.id,
            event: {
              athleteId: athleteA.id,
              teamId: teamA.body.id,
              type: 'assist',
              minute: 19,
              quantity: 1,
            },
          },
        },
      ],
    };

    const [firstPush, secondPush] = await Promise.all([
      api.post('/api/sync/mutations/push').set(headersFor(superAdmin)).send(mutationBody),
      api.post('/api/sync/mutations/push').set(headersFor(superAdmin)).send(mutationBody),
    ]);
    expect(firstPush.status).toBe(201);
    expect(secondPush.status).toBe(201);

    expect(firstPush.body.mutations[0]).toMatchObject({
      id: mutationId,
      tenantId: schoolA.id,
      clientId,
      status: 'synced',
      mutationType: 'match_event_submit',
    });
    expect(secondPush.body.mutations[0]).toMatchObject(firstPush.body.mutations[0]);

    const syncList = await api
      .get(`/api/sync/mutations/${clientId}`)
      .query({ schoolId: schoolA.id })
      .set(headersFor(superAdmin))
      .expect(200);
    expect(syncList.body).toHaveLength(1);
    expect(syncList.body[0]).toMatchObject({
      tenantId: schoolA.id,
      clientId,
      id: mutationId,
    });

    const stats = await api
      .get(`/api/matches/${match.body.id}/stats`)
      .set(headersFor(superAdmin))
      .expect(200);
    expect(stats.body.totals).toMatchObject({
      goals: 1,
      assists: 1,
    });

    const verified = await api
      .post(`/api/matches/${match.body.id}/verify`)
      .set(headersFor(superAdmin))
      .expect(201);
    expect(verified.body.status).toBe('verified');

    const leaderboard = await api
      .get(`/api/tournaments/${tournament.body.id}/leaderboard`)
      .set(headersFor(superAdmin))
      .expect(200);
    expect(leaderboard.body.totalEntries).toBe(1);
    expect(leaderboard.body.leaderboard[0]).toMatchObject({
      athleteId: athleteA.id,
      tournamentId: tournament.body.id,
      matchesPlayed: 1,
      goals: 1,
      assists: 1,
    });

    const overview = await api
      .get('/api/analytics/federation/overview')
      .set(headersFor(superAdmin))
      .expect(200);
    expect(overview.body.schools).toBeGreaterThanOrEqual(2);
    expect(overview.body.tournaments).toBeGreaterThanOrEqual(1);
    expect(overview.body.athletes).toBeGreaterThanOrEqual(2);
    expect(overview.body.verifiedAthletes).toBeGreaterThanOrEqual(2);

    const athleteQr = await api
      .post(`/api/qr/athlete/${athleteA.id}`)
      .set(headersFor(schoolAdminA))
      .expect(201);
    expect(athleteQr.body.code).toEqual(expect.stringMatching(/^qr_[A-F0-9]{32}$/));
    expect(athleteQr.body.code).not.toContain(athleteA.id.toUpperCase());

    const scanned = await api
      .post('/api/qr/scan')
      .set(headersFor(superAdmin))
      .send({ code: athleteQr.body.code })
      .expect(201);
    expect(scanned.body).toEqual({ scanned: true, code: athleteQr.body.code });

    await api
      .post(`/api/privacy/athletes/${athleteA.id}/guardian-consents`)
      .set(headersFor(schoolAdminA))
      .send({
        guardianName: 'PG QR Guardian',
        relationship: 'parent',
        consentType: 'public_profile',
      })
      .expect(201);
    await api
      .post(`/api/privacy/athletes/${athleteA.id}/public-profile`)
      .set(headersFor(schoolAdminA))
      .send({ status: 'public' })
      .expect(201);

    const publicAthlete = await api
      .get(`/api/qr/public/athlete/${athleteQr.body.code}`)
      .expect(200);
    expect(publicAthlete.body).toMatchObject({
      type: 'athlete',
      athleteId: athleteA.id,
      fullName: athleteA.fullName,
      athletiqId: athleteA.athletiqId,
    });
    expect(publicAthlete.body.code).toBeUndefined();

    await app.close();
  });
});
