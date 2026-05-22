import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;

type HeaderBag = Record<string, string>;
type Api = ReturnType<typeof request>;
type Actor = { id: string; role: string };
type TeamFixture = { id: string; name: string; athleteIds: string[] };
type BracketNode = {
  id: string;
  matchId?: string;
  round: number;
  position: number;
  bracketSide: string;
  homeTeamId?: string;
  awayTeamId?: string;
  winnerTeamId?: string;
  status: string;
};

const headersFor = (user: Actor): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
const uniqueRunId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerSchoolAdmin = async (api: Api, runId: string, label: string): Promise<Actor> => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `pg_bracket_${runId}_${label}@athletiq.local`,
      password: 'password123',
      role: 'school_admin',
    })
    .expect(201);

  return { id: response.body.user.id as string, role: 'school_admin' };
};

const createAndApproveSchool = async (api: Api, admin: Actor, name: string) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor(admin))
    .send({ name, location: 'Kathmandu' })
    .expect(201);

  await api.post(`/api/schools/${school.body.id}/approve`).set(headersFor(superAdmin)).expect(201);

  return school.body as { id: string };
};

const createAndApproveAthlete = async (
  api: Api,
  admin: Actor,
  schoolId: string,
  fullName: string,
) => {
  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(admin))
    .send({ schoolId, fullName, gender: 'female' })
    .expect(201);

  const approved = await api
    .post(`/api/athletes/${athlete.body.id}/identity/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  return approved.body as { id: string };
};

const setupTournamentTeams = async (api: Api, runId: string) => {
  const tournament = await api
    .post('/api/tournaments')
    .set(headersFor(superAdmin))
    .send({
      name: `PG Bracket Cup ${runId}`,
      sport: 'football',
      format: 'knockout',
      maxTeams: 4,
      season: '2026',
    })
    .expect(201);

  await api
    .post(`/api/tournaments/${tournament.body.id}/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  const teams: TeamFixture[] = [];
  for (let index = 0; index < 4; index += 1) {
    const admin = await registerSchoolAdmin(api, runId, `admin_${index}`);
    const school = await createAndApproveSchool(api, admin, `PG Bracket School ${runId} ${index}`);
    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(admin))
      .send({ schoolId: school.id })
      .expect(201);

    const athlete = await createAndApproveAthlete(
      api,
      admin,
      school.id,
      `PG Bracket Athlete ${runId} ${index}`,
    );

    const team = await api
      .post('/api/teams')
      .set(headersFor(admin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: `PG Team ${runId} ${index}`,
        athleteIds: [athlete.id],
      })
      .expect(201);
    teams.push(team.body as TeamFixture);
  }

  return { tournament: tournament.body as { id: string }, teams };
};

const submitAndVerify = async (api: Api, matchId: string, homeScore: number, awayScore: number) => {
  await api
    .post(`/api/matches/${matchId}/submit-result`)
    .set(headersFor(superAdmin))
    .send({ homeScore, awayScore, sportStats: {} })
    .expect(201);
  await api.post(`/api/matches/${matchId}/verify`).set(headersFor(superAdmin)).expect(201);
};

describeDatabase('phase 12 postgres bracketing', () => {
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

  it('persists published brackets, verified advancement, and public-safe views', async () => {
    const runId = uniqueRunId();
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, runId);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        seeds: teams.map((team, index) => ({
          teamId: team.id,
          seedNumber: index + 1,
          locked: index === 0,
        })),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);
    const firstRoundNodes = (published.body.nodes as BracketNode[]).filter(
      (node) => node.round === 1 && node.bracketSide === 'main' && node.matchId,
    );
    expect(firstRoundNodes).toHaveLength(2);

    const first = firstRoundNodes[0];
    const second = firstRoundNodes[1];
    if (!first?.matchId || !second?.matchId) {
      throw new Error('Expected two playable first-round bracket matches');
    }
    await submitAndVerify(api, first.matchId, 2, 0);
    await submitAndVerify(api, second.matchId, 1, 3);

    const bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    const finalNode = (bracket.body.nodes as BracketNode[]).find(
      (node) => node.round === 2 && node.bracketSide === 'main',
    );
    expect(finalNode).toMatchObject({
      homeTeamId: first.homeTeamId,
      awayTeamId: second.awayTeamId,
      status: 'ready',
    });

    const publicView = await api
      .get(`/api/public/brackets/${published.body.bracket.publicSlug}`)
      .expect(200);
    const serialized = JSON.stringify(publicView.body);
    expect(publicView.body.bracket.id).toBe(created.body.bracket.id);
    expect(serialized).not.toContain('athleteIds');
    expect(serialized).not.toContain(teams[0]?.athleteIds[0] ?? 'missing-athlete');

    await app.close();
  });

  it('rejects tied elimination verification without committing verified state', async () => {
    const runId = uniqueRunId();
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, runId);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        seeds: teams.map((team, index) => ({
          teamId: team.id,
          seedNumber: index + 1,
        })),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);
    const tiedNode = (published.body.nodes as BracketNode[]).find(
      (node) => node.round === 1 && node.bracketSide === 'main' && node.matchId,
    );
    if (!tiedNode?.matchId) {
      throw new Error('Expected playable first-round bracket match');
    }

    await api
      .post(`/api/matches/${tiedNode.matchId}/submit-result`)
      .set(headersFor(superAdmin))
      .send({ homeScore: 1, awayScore: 1, sportStats: {} })
      .expect(201);

    await api
      .post(`/api/matches/${tiedNode.matchId}/verify`)
      .set(headersFor(superAdmin))
      .expect(400);

    const match = await api
      .get(`/api/matches/${tiedNode.matchId}`)
      .set(headersFor(superAdmin))
      .expect(200);
    expect(match.body.status).toBe('played');

    const bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    const unchangedNode = (bracket.body.nodes as BracketNode[]).find(
      (node) => node.id === tiedNode.id,
    );
    expect(unchangedNode?.winnerTeamId).toBeUndefined();

    await app.close();
  });
});
