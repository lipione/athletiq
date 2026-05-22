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

describe('offline sync queue', () => {
  it('stores sync mutations and returns deduplicated status', async () => {
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

    const schoolA = await createAndApproveSchool(
      api,
      schoolAdminA.id,
      'school_admin',
      'Sync School A',
    );
    const schoolB = await createAndApproveSchool(
      api,
      schoolAdminB.id,
      'school_admin',
      'Sync School B',
    );

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({
        name: 'Offline Cup',
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

    const athleteA = await createAthlete(api, schoolAdminA, schoolA.id, 'Mila Shakya');
    const athleteB = await createAthlete(api, schoolAdminB, schoolB.id, 'Pemba Kc');

    const teamA = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminA))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolA.id,
        name: 'Sync Red',
        athleteIds: [athleteA.id],
      })
      .expect(201);

    const teamB = await api
      .post('/api/teams')
      .set(headersFor(schoolAdminB))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolB.id,
        name: 'Sync Blue',
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
        scheduledAt: '2026-11-30T14:00:00Z',
      })
      .expect(201);

    const prematurePush = await api
      .post('/api/sync/mutations/push')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        clientId: 'phone-1',
        mutations: [
          {
            mutationId: 'm-event-before-result',
            mutationType: 'match_event_submit',
            payload: {
              matchId: match.body.id,
              event: {
                athleteId: athleteA.id,
                teamId: teamA.body.id,
                type: 'goal',
                minute: 12,
              },
            },
          },
        ],
      })
      .expect(201);

    expect(prematurePush.body.mutations[0]).toMatchObject({
      id: 'm-event-before-result',
      status: 'conflict',
      errorReason: 'Match is not ready for stat capture',
    });

    await api
      .post(`/api/matches/${match.body.id}/submit-result`)
      .set(headersFor(superAdmin))
      .send({
        homeScore: 1,
        awayScore: 0,
      })
      .expect(201);

    const firstPush = await api
      .post('/api/sync/mutations/push')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        clientId: 'phone-1',
        mutations: [
          {
            mutationId: 'm-event-1',
            mutationType: 'match_event_submit',
            payload: {
              matchId: match.body.id,
              event: {
                athleteId: athleteA.id,
                teamId: teamA.body.id,
                type: 'goal',
                minute: 44,
              },
            },
          },
        ],
      })
      .expect(201);

    expect(firstPush.body.mutations).toHaveLength(1);
    expect(firstPush.body.mutations[0]).toMatchObject({
      id: 'm-event-1',
      status: 'synced',
      clientId: 'phone-1',
      mutationType: 'match_event_submit',
    });

    const secondPush = await api
      .post('/api/sync/mutations/push')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        clientId: 'phone-1',
        mutations: [
          {
            mutationId: 'm-event-1',
            mutationType: 'match_event_submit',
            payload: {
              matchId: match.body.id,
              event: {
                athleteId: athleteA.id,
                teamId: teamA.body.id,
                type: 'goal',
                minute: 44,
              },
            },
          },
        ],
      })
      .expect(201);
    expect(secondPush.body.mutations[0].status).toBe('synced');

    const list = await api
      .get('/api/sync/mutations/phone-1')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .expect(200);
    expect(list.body).toHaveLength(2);
    expect(list.body.map((mutation: { id: string }) => mutation.id).sort()).toEqual([
      'm-event-1',
      'm-event-before-result',
    ]);

    await app.close();
  });

  it('marks unsupported mutations as conflict', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());

    const response = await api
      .post('/api/sync/mutations/push')
      .set(headersFor({ id: 'usr_super_admin', role: 'super_admin' }))
      .send({
        clientId: 'phone-2',
        mutations: [
          {
            mutationId: 'bad-1',
            mutationType: 'match_event_unknown',
            payload: {},
          },
        ],
      })
      .expect(201);

    expect(response.body.mutations[0]).toMatchObject({
      id: 'bad-1',
      status: 'conflict',
      mutationType: 'match_event_unknown',
      errorReason: 'Unsupported mutation type',
    });

    await app.close();
  });
});
