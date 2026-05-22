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
  const headers = headersFor({ id: userId, role: userRole });
  const school = await api
    .post('/api/schools')
    .set(headers)
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

describe('tournament management', () => {
  it('super admin can create and approve a tournament', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());

    const created = await api
      .post('/api/tournaments')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        name: 'Spring Cup',
        sport: 'football',
        format: 'knockout',
        maxTeams: 12,
      })
      .expect(201);

    const approved = await api
      .post(`/api/tournaments/${created.body.id}/approve`)
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .expect(201);

    expect(approved.body.status).toBe('approved');

    await app.close();
  });

  it('school can register and create a team for an approved tournament', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(
      api,
      schoolAdmin.id,
      'school_admin',
      'Hill Valley School',
    );

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        name: 'Summer Tournament',
        sport: 'football',
        format: 'league',
        maxTeams: 8,
      })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/approve`)
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({
        schoolId: school.id,
      })
      .expect(201);

    const athlete = await createAthlete(
      api,
      { ...schoolAdmin, role: 'school_admin' },
      school.id,
      'Amina Rai',
    );

    const team = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: 'U-14 A',
        athleteIds: [athlete.id],
      })
      .expect(201);

    expect(team.body.status).toBe('approved');

    await app.close();
  });

  it('authorized referee can submit results and super admin can verify match', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const school = await createAndApproveSchool(
      api,
      schoolAdmin.id,
      'school_admin',
      'Riverbank School',
    );
    const secondSchoolAdmin = await registerUser(api);
    const secondSchool = await createAndApproveSchool(
      api,
      secondSchoolAdmin.id,
      'school_admin',
      'Pine Crest School',
    );

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        name: 'Inter District Cup',
        sport: 'football',
        format: 'round_robin',
      })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/approve`)
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.id })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(secondSchoolAdmin))
      .send({ schoolId: secondSchool.id })
      .expect(201);

    const athlete1 = await createAthlete(
      api,
      { ...schoolAdmin, role: 'school_admin' },
      school.id,
      'Rajan Shrestha',
    );
    const athlete2 = await createAthlete(
      api,
      { ...secondSchoolAdmin, role: 'school_admin' },
      secondSchool.id,
      'Asha Lama',
    );

    const team1 = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: 'Blue',
        athleteIds: [athlete1.id],
      })
      .expect(201);

    const team2 = await api
      .post('/api/teams')
      .set(headersFor(secondSchoolAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: secondSchool.id,
        name: 'Red',
        athleteIds: [athlete2.id],
      })
      .expect(201);

    const match = await api
      .post('/api/matches')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        tournamentId: tournament.body.id,
        homeTeamId: team1.body.id,
        awayTeamId: team2.body.id,
        scheduledAt: '2026-11-01T14:00:00Z',
      })
      .expect(201);

    const referee = await registerUser(api, 'referee');
    await api
      .post(`/api/matches/${match.body.id}/submit-result`)
      .set(headersFor({ id: referee.id, role: 'referee' }))
      .send({
        homeScore: 2,
        awayScore: 1,
        sportStats: {
          goals_home: 2,
          goals_away: 1,
          fouls_home: 3,
        },
        notes: 'Fast game',
      })
      .expect(201);

    const verified = await api
      .post(`/api/matches/${match.body.id}/verify`)
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .expect(201);

    expect(verified.body.status).toBe('verified');

    await app.close();
  });

  it('coach cannot verify match results', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const referee = await registerUser(api, 'referee');
    const coach = await registerUser(api, 'coach');
    const school = await createAndApproveSchool(
      api,
      schoolAdmin.id,
      'school_admin',
      'East Park School',
    );
    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        name: 'Access Control Tournament',
        sport: 'football',
        format: 'knockout',
      })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/approve`)
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.id })
      .expect(201);

    const athlete = await createAthlete(
      api,
      { ...schoolAdmin, role: 'school_admin' },
      school.id,
      'Sarita Rai',
    );
    const otherAthlete = await createAthlete(
      api,
      { ...schoolAdmin, role: 'school_admin' },
      school.id,
      'Puja Bhandari',
    );

    const team = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: 'East',
        athleteIds: [athlete.id],
      })
      .expect(201);

    const match = await api
      .post('/api/matches')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        tournamentId: tournament.body.id,
        homeTeamId: team.body.id,
        awayTeamId: '',
        scheduledAt: '2026-11-02T14:00:00Z',
      })
      .expect(400);

    expect(match.body.message).toContain('Both homeTeamId and awayTeamId');

    const team2 = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: 'East B',
        athleteIds: [otherAthlete.id],
      })
      .expect(201);

    const createdMatch = await api
      .post('/api/matches')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        tournamentId: tournament.body.id,
        homeTeamId: team.body.id,
        awayTeamId: team2.body.id,
        scheduledAt: '2026-11-02T14:00:00Z',
      })
      .expect(201);

    await api
      .post(`/api/matches/${createdMatch.body.id}/submit-result`)
      .set(headersFor({ id: referee.id, role: 'referee' }))
      .send({
        homeScore: 3,
        awayScore: 2,
      })
      .expect(201);

    await api
      .post(`/api/matches/${createdMatch.body.id}/verify`)
      .set(headersFor(coach))
      .send()
      .expect(403);

    await app.close();
  });
});
