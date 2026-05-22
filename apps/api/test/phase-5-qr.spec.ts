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

describe('qr infrastructure', () => {
  it('generates and resolves public QR resources', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerUser(api);
    const coach = await registerUser(api, 'coach');
    const school = await createAndApproveSchool(api, schoolAdmin.id, 'Summit School');
    const opponentAdmin = await registerUser(api);
    const schoolOpponent = await createAndApproveSchool(api, opponentAdmin.id, 'Valley School');
    const athleteA = await createAthlete(api, schoolAdmin, school.id, 'Amina Rai');
    const athleteB = await createAthlete(api, opponentAdmin, schoolOpponent.id, 'Rajan Lama');

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        name: 'QR League',
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

    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(opponentAdmin))
      .send({ schoolId: schoolOpponent.id })
      .expect(201);

    const teamA = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: 'Summit United',
        athleteIds: [athleteA.id],
      })
      .expect(201);

    const teamB = await api
      .post('/api/teams')
      .set(headersFor(opponentAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolOpponent.id,
        name: 'Valley FC',
        athleteIds: [athleteB.id],
      })
      .expect(201);

    const match = await api
      .post('/api/matches')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        tournamentId: tournament.body.id,
        homeTeamId: teamA.body.id,
        awayTeamId: teamB.body.id,
        scheduledAt: '2026-11-22T14:00:00Z',
      })
      .expect(201);

    const athleteQr = await api
      .post(`/api/qr/athlete/${athleteA.id}`)
      .set(headersFor(schoolAdmin))
      .expect(201);
    expect(athleteQr.body.code).not.toContain(athleteA.id.toUpperCase());

    await api
      .post(`/api/privacy/athletes/${athleteA.id}/guardian-consents`)
      .set(headersFor(schoolAdmin))
      .send({
        guardianName: 'Maya Rai',
        relationship: 'parent',
        consentType: 'public_profile',
      })
      .expect(201);

    await api
      .post(`/api/privacy/athletes/${athleteA.id}/public-profile`)
      .set(headersFor(schoolAdmin))
      .send({ status: 'public' })
      .expect(201);

    const teamQr = await api
      .post('/api/qr/team')
      .set(headersFor(coach))
      .send({ teamId: teamA.body.id })
      .expect(201);

    const matchQr = await api
      .post(`/api/qr/match/${match.body.id}`)
      .set(headersFor(schoolAdmin))
      .expect(201);

    const scanned = await api
      .post('/api/qr/scan')
      .set(headersFor(coach))
      .send({ code: athleteQr.body.code })
      .expect(201);

    expect(scanned.body).toEqual({ scanned: true, code: athleteQr.body.code });

    const publicAthlete = await api
      .get(`/api/qr/public/athlete/${athleteQr.body.code}`)
      .expect(200);
    expect(publicAthlete.body).toMatchObject({
      type: 'athlete',
      athleteId: athleteA.id,
      fullName: athleteA.fullName,
      athletiqId: expect.any(String),
    });
    expect(publicAthlete.body.code).toBeUndefined();

    const publicTeam = await api.get(`/api/qr/public/team/${teamQr.body.code}`).expect(200);
    expect(publicTeam.body).toMatchObject({
      type: 'team',
      teamId: teamA.body.id,
      name: 'Summit United',
    });
    expect(publicTeam.body.code).toBeUndefined();
    expect(publicTeam.body.athleteIds).toBeUndefined();

    const publicMatch = await api.get(`/api/qr/public/match/${matchQr.body.code}`).expect(200);
    expect(publicMatch.body).toMatchObject({
      type: 'match',
      matchId: match.body.id,
      tournamentId: tournament.body.id,
      homeTeamId: teamA.body.id,
      awayTeamId: teamB.body.id,
    });
    expect(publicMatch.body.code).toBeUndefined();

    const missing = await api.get('/api/qr/public/athlete/not-found').expect(404);
    expect(missing.body.message).toContain('QR code not found');

    await app.close();
  });
});
