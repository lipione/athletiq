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
  userRole: string,
  schoolName: string,
) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor({ id: userId, role: userRole }))
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
  name: string,
) => {
  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(schoolAdmin))
    .send({
      schoolId,
      fullName: name,
      gender: 'female',
    })
    .expect(201);

  await api
    .post(`/api/athletes/${athlete.body.id}/identity/approve`)
    .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
    .expect(201);

  return athlete.body;
};

const setupVerifiedMatchWithTeams = async (
  api: ReturnType<typeof request>,
  superAdmin: { id: string; role: string },
) => {
  const schoolAdminA = await registerUser(api);
  const schoolAdminB = await registerUser(api);

  const schoolA = await createAndApproveSchool(
    api,
    schoolAdminA.id,
    'school_admin',
    'River Valley School',
  );
  const schoolB = await createAndApproveSchool(
    api,
    schoolAdminB.id,
    'school_admin',
    'Himalayan School',
  );

  const tournament = await api
    .post('/api/tournaments')
    .set(headersFor(superAdmin))
    .send({
      name: 'Stats Cup',
      sport: 'football',
      format: 'league',
      maxTeams: 8,
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

  const athleteA = await createAthlete(api, schoolAdminA, schoolA.id, 'Amina Rai');
  const athleteB = await createAthlete(api, schoolAdminB, schoolB.id, 'Rajan Thapa');

  const teamA = await api
    .post('/api/teams')
    .set(headersFor(schoolAdminA))
    .send({
      tournamentId: tournament.body.id,
      schoolId: schoolA.id,
      name: 'Red',
      athleteIds: [athleteA.id],
    })
    .expect(201);

  const teamB = await api
    .post('/api/teams')
    .set(headersFor(schoolAdminB))
    .send({
      tournamentId: tournament.body.id,
      schoolId: schoolB.id,
      name: 'Blue',
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
      scheduledAt: '2026-11-20T14:00:00Z',
    })
    .expect(201);

  await api
    .post(`/api/matches/${match.body.id}/submit-result`)
    .set(headersFor(superAdmin))
    .send({
      homeScore: 2,
      awayScore: 1,
      sportStats: {},
    })
    .expect(201);

  return {
    athleteA,
    athleteB,
    teamA: teamA.body,
    teamB: teamB.body,
    match: match.body,
    tournament: tournament.body,
  };
};

describe('match stats engine', () => {
  it('captures events and produces match + athlete stats', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
    const referee = await registerUser(api, 'referee');

    const { athleteA, teamA, match, tournament } = await setupVerifiedMatchWithTeams(
      api,
      superAdmin,
    );

    const goal = await api
      .post(`/api/matches/${match.id}/events`)
      .set(headersFor(referee))
      .send({
        athleteId: athleteA.id,
        teamId: teamA.id,
        type: 'goal',
        minute: 12,
      })
      .expect(201);

    await api
      .post(`/api/matches/${match.id}/events`)
      .set(headersFor(referee))
      .send({
        athleteId: athleteA.id,
        teamId: teamA.id,
        type: 'assist',
        minute: 25,
        quantity: 1,
      })
      .expect(201);

    const corrected = await api
      .post(`/api/matches/${match.id}/events/${goal.body.id}/correct`)
      .set(headersFor(referee))
      .send({
        athleteId: athleteA.id,
        teamId: teamA.id,
        type: 'goal',
        minute: 13,
        quantity: 2,
        reason: 'score correction',
      })
      .expect(201);

    const events = await api
      .get(`/api/matches/${match.id}/events`)
      .set(headersFor(referee))
      .expect(200);
    const currentGoal = events.body.find(
      (event: { id: string; status: string }) => event.id === corrected.body.id,
    );
    const supersededGoal = events.body.find(
      (event: { id: string; status: string }) => event.id === goal.body.id,
    );
    expect(currentGoal?.status).toBe('active');
    expect(supersededGoal?.status).toBe('superseded');

    const stats = await api
      .get(`/api/matches/${match.id}/stats`)
      .set(headersFor(referee))
      .expect(200);
    expect(stats.body.totals).toMatchObject({
      goals: 2,
      assists: 1,
    });

    const athleteRow = stats.body.athleteStats.find(
      (row: { athleteId: string }) => row.athleteId === athleteA.id,
    );
    expect(athleteRow?.goals).toBe(2);
    expect(athleteRow?.assists).toBe(1);

    await api.post(`/api/matches/${match.id}/verify`).set(headersFor(superAdmin)).expect(201);

    const leaderboard = await api
      .get(`/api/tournaments/${tournament.id}/leaderboard`)
      .set(headersFor(superAdmin))
      .expect(200);
    expect(leaderboard.body.totalEntries).toBe(1);
    expect(leaderboard.body.leaderboard[0]).toMatchObject({
      athleteId: athleteA.id,
      goals: 2,
      assists: 1,
      matchesPlayed: 1,
    });

    await app.close();
  });

  it('prevents event capture before match is played', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
    const referee = await registerUser(api, 'referee');
    const schoolAdminA = await registerUser(api);
    const schoolAdminB = await registerUser(api);
    const schoolA = await createAndApproveSchool(
      api,
      schoolAdminA.id,
      'school_admin',
      'Early Bird School A',
    );
    const schoolB = await createAndApproveSchool(
      api,
      schoolAdminB.id,
      'school_admin',
      'Early Bird School B',
    );

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({
        name: 'Scheduled Match Cup',
        sport: 'football',
        format: 'league',
        maxTeams: 8,
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

    const athleteA = await createAthlete(api, schoolAdminA, schoolA.id, 'Match Prep A');
    const athleteB = await createAthlete(api, schoolAdminB, schoolB.id, 'Match Prep B');

    const teamA = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminA))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolA.id,
        name: 'Eagle',
        athleteIds: [athleteA.id],
      })
      .expect(201);

    const teamB = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminB))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolB.id,
        name: 'Falcon',
        athleteIds: [athleteB.id],
      })
      .expect(201);

    const scheduledMatch = await api
      .post('/api/matches')
      .set(headersFor(superAdmin))
      .send({
        tournamentId: tournament.body.id,
        homeTeamId: teamA.body.id,
        awayTeamId: teamB.body.id,
        scheduledAt: '2026-11-21T14:00:00Z',
      })
      .expect(201);

    await api
      .post(`/api/matches/${scheduledMatch.body.id}/events`)
      .set(headersFor(referee))
      .send({
        athleteId: athleteA.id,
        teamId: teamA.body.id,
        type: 'goal',
        minute: 3,
      })
      .expect(400);

    await app.close();
  });
});
