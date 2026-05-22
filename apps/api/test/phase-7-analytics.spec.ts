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
  };
};

const createAndApproveSchool = async (
  api: ReturnType<typeof request>,
  userId: string,
  schoolName: string,
) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor({ id: userId, role: 'school_admin' }))
    .send({
      name: schoolName,
      location: 'Kathmandu',
    })
    .expect(201);

  await api
    .post(`/api/schools/${school.body.id}/approve`)
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return school.body;
};

const createAthlete = async (
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

  await api
    .post(`/api/athletes/${athlete.body.id}/identity/approve`)
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return athlete.body;
};

describe('analytics APIs', () => {
  it('returns federation overview and participation snapshots', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
    const schoolAdminA = await registerUser(api);
    const schoolAdminB = await registerUser(api);

    const schoolA = await createAndApproveSchool(api, schoolAdminA.id, 'Analytics School A');
    const schoolB = await createAndApproveSchool(api, schoolAdminB.id, 'Analytics School B');

    const athleteA = await createAthlete(api, schoolAdminA, schoolA.id, 'Nima Rai');
    const athleteB = await createAthlete(api, schoolAdminB, schoolB.id, 'Anita Karki');

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({
        name: 'Analytics League',
        sport: 'football',
        format: 'league',
      })
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
        name: 'Analytics Red',
        athleteIds: [athleteA.id],
      })
      .expect(201);

    const teamB = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminB))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolB.id,
        name: 'Analytics Blue',
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
        scheduledAt: '2026-12-01T10:00:00Z',
      })
      .expect(201);

    await api
      .post(`/api/matches/${match.body.id}/submit-result`)
      .set(headersFor(superAdmin))
      .send({
        homeScore: 1,
        awayScore: 0,
      })
      .expect(201);

    await api
      .post(`/api/matches/${match.body.id}/events`)
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        athleteId: athleteA.id,
        teamId: teamA.body.id,
        type: 'goal',
        quantity: 1,
      })
      .expect(201);

    await api.post(`/api/matches/${match.body.id}/verify`).set(headersFor(superAdmin)).expect(201);

    const overview = await api
      .get('/api/analytics/federation/overview')
      .set(headersFor(superAdmin))
      .expect(200);
    expect(overview.body).toMatchObject({
      schools: 2,
      tournaments: 1,
      athletes: 2,
      verifiedAthletes: 2,
    });

    const participation = await api
      .get(`/api/analytics/federation/participation?tournamentId=${tournament.body.id}`)
      .set(headersFor(superAdmin))
      .expect(200);

    expect(participation.body).toMatchObject({
      tournamentId: tournament.body.id,
      schoolsParticipating: 2,
      totalAthletes: 2,
    });

    const exportPayload = await api
      .get(`/api/analytics/tournaments/${tournament.body.id}/export`)
      .set(headersFor(superAdmin))
      .expect(200);

    expect(exportPayload.body.tournamentName).toBe('Analytics League');
    expect(exportPayload.body.totalTeams).toBe(2);
    expect(exportPayload.body.leaderboard.totalEntries).toBe(1);
    expect(exportPayload.body.leaderboard.leaderboard[0]).toMatchObject({
      athleteId: athleteA.id,
      goals: 1,
    });

    const coach = await registerUser(api, 'coach');
    await api.get('/api/analytics/federation/overview').set(headersFor(coach)).expect(403);

    const override = await api
      .post('/api/analytics/federation/overrides')
      .set(headersFor(superAdmin))
      .send({
        scope: 'athlete',
        targetId: athleteB.id,
        field: 'status',
        reason: 'manual correction',
      })
      .expect(201);

    expect(override.body).toMatchObject({
      ok: true,
      scope: 'athlete',
      targetId: athleteB.id,
    });

    await app.close();
  });
});
