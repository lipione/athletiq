import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

type HeaderBag = Record<string, string>;
type Api = ReturnType<typeof request>;
type Actor = { id: string; role: string };
type TeamFixture = {
  id: string;
  name: string;
  athleteIds: string[];
  admin: Actor;
  schoolId: string;
};
type BracketNode = {
  id: string;
  matchId?: string;
  round: number;
  position: number;
  bracketSide: string;
  homeTeamId?: string;
  awayTeamId?: string;
  winnerTeamId?: string;
  loserTeamId?: string;
  nextNodeId?: string;
  loserNextNodeId?: string;
  isIfNecessary?: boolean;
  status: string;
};

const headersFor = (user: Actor): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerSchoolAdmin = async (api: Api, label: string): Promise<Actor> => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `bracket_${Date.now()}_${label}_${Math.random().toString(36).slice(2, 8)}@athletiq.local`,
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

  return school.body as { id: string; name: string };
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

const createTournamentWithTeams = async (
  api: Api,
  format: 'knockout' | 'double_elimination' | 'group_stages' = 'knockout',
  count = 4,
) => {
  const tournament = await api
    .post('/api/tournaments')
    .set(headersFor(superAdmin))
    .send({
      name: `Bracket Cup ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`,
      sport: 'football',
      format,
      maxTeams: Math.max(count, 4),
      season: '2026',
    })
    .expect(201);

  await api
    .post(`/api/tournaments/${tournament.body.id}/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  const teams: TeamFixture[] = [];
  for (let index = 0; index < count; index += 1) {
    const admin = await registerSchoolAdmin(api, `admin_${index}`);
    const school = await createAndApproveSchool(api, admin, `Bracket School ${index}`);
    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(admin))
      .send({ schoolId: school.id })
      .expect(201);

    const athlete = await createAndApproveAthlete(
      api,
      admin,
      school.id,
      `Bracket Athlete ${index}`,
    );

    const team = await api
      .post('/api/teams')
      .set(headersFor(admin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: `Team ${index + 1}`,
        athleteIds: [athlete.id],
      })
      .expect(201);

    teams.push({ ...(team.body as TeamFixture), admin, schoolId: school.id });
  }

  return { tournament: tournament.body as { id: string }, teams };
};

const seedPayload = (teams: TeamFixture[], groupKey?: string) => ({
  seeds: teams.map((team, index) => ({
    teamId: team.id,
    seedNumber: index + 1,
    locked: index === 0,
    ...(groupKey ? { groupKey } : {}),
  })),
});

const submitAndVerify = async (
  api: Api,
  matchId: string,
  homeScore: number,
  awayScore: number,
  sportStats?: Record<string, number>,
) => {
  await api
    .post(`/api/matches/${matchId}/submit-result`)
    .set(headersFor(superAdmin))
    .send({ homeScore, awayScore, sportStats: sportStats ?? {} })
    .expect(201);

  return api.post(`/api/matches/${matchId}/verify`).set(headersFor(superAdmin)).expect(201);
};

const findNodeForTeams = (nodes: BracketNode[], firstTeamId: string, secondTeamId: string) => {
  const node = nodes.find(
    (candidate) =>
      candidate.matchId &&
      ((candidate.homeTeamId === firstTeamId && candidate.awayTeamId === secondTeamId) ||
        (candidate.homeTeamId === secondTeamId && candidate.awayTeamId === firstTeamId)),
  );

  if (!node?.matchId) {
    throw new Error(`No bracket node found for teams ${firstTeamId} and ${secondTeamId}`);
  }

  return node;
};

const requireItem = <T>(value: T | undefined, message: string): T => {
  if (!value) {
    throw new Error(message);
  }
  return value;
};

describe('interactive bracketing', () => {
  it('creates and publishes a single elimination bracket and advances verified winners', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'knockout', 4);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        ...seedPayload(teams),
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
    const firstRoundNode = requireItem(firstRoundNodes[0], 'first round node is required');
    const secondRoundNode = requireItem(firstRoundNodes[1], 'second first-round node is required');

    await submitAndVerify(api, firstRoundNode.matchId as string, 2, 0);
    await submitAndVerify(api, secondRoundNode.matchId as string, 1, 3);

    const bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    const finalNode = (bracket.body.nodes as BracketNode[]).find(
      (node) => node.round === 2 && node.bracketSide === 'main',
    );

    expect(requireItem(finalNode, 'final node is required')).toMatchObject({
      homeTeamId: firstRoundNode.homeTeamId,
      awayTeamId: secondRoundNode.awayTeamId,
      status: 'ready',
    });

    const publicView = await api
      .get(`/api/public/brackets/${published.body.bracket.publicSlug}`)
      .expect(200);
    const serializedPublicView = JSON.stringify(publicView.body);
    expect(publicView.body.bracket.id).toBe(created.body.bracket.id);
    expect(serializedPublicView).not.toContain('athleteIds');
    expect(serializedPublicView).not.toContain(
      requireItem(teams[0], 'first team is required').athleteIds[0],
    );

    await app.close();
  });

  it('creates a double elimination bracket with winners and losers paths', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'double_elimination', 4);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'double_elimination',
        ...seedPayload(teams),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const firstWinnersNode = (published.body.nodes as BracketNode[]).find(
      (node) => node.round === 1 && node.bracketSide === 'winners' && node.matchId,
    );
    const winnersNode = requireItem(firstWinnersNode, 'winners node is required');
    expect(winnersNode.loserNextNodeId).toBeTruthy();

    await submitAndVerify(api, winnersNode.matchId as string, 4, 2);

    const bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    const advancedWinnersNode = (bracket.body.nodes as BracketNode[]).find(
      (node) => node.id === winnersNode.nextNodeId,
    );
    const losersNode = (bracket.body.nodes as BracketNode[]).find(
      (node) => node.id === winnersNode.loserNextNodeId,
    );

    expect(advancedWinnersNode?.homeTeamId ?? advancedWinnersNode?.awayTeamId).toBe(
      winnersNode.homeTeamId,
    );
    expect(losersNode?.homeTeamId ?? losersNode?.awayTeamId).toBe(winnersNode.awayTeamId);

    await app.close();
  });

  it('keeps double elimination slots source-ordered and schedules an if-necessary final', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'double_elimination', 4);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'double_elimination',
        ...seedPayload(teams),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const firstRoundNodes = (published.body.nodes as BracketNode[])
      .filter((node) => node.round === 1 && node.bracketSide === 'winners' && node.matchId)
      .sort((first, second) => first.position - second.position);
    const firstWinnersNode = requireItem(firstRoundNodes[0], 'first winners node is required');
    const secondWinnersNode = requireItem(firstRoundNodes[1], 'second winners node is required');

    await submitAndVerify(api, requireItem(firstWinnersNode.matchId, 'match id is required'), 2, 0);
    await submitAndVerify(
      api,
      requireItem(secondWinnersNode.matchId, 'match id is required'),
      2,
      0,
    );

    let bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    const winnersFinal = requireItem(
      (bracket.body.nodes as BracketNode[]).find(
        (node) => node.round === 2 && node.bracketSide === 'winners' && !node.isIfNecessary,
      ),
      'winners final is required',
    );
    const firstLoserNode = requireItem(
      (bracket.body.nodes as BracketNode[]).find(
        (node) => node.round === 1 && node.bracketSide === 'losers',
      ),
      'first loser node is required',
    );

    await submitAndVerify(api, requireItem(winnersFinal.matchId, 'winners final match'), 3, 1);

    bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    let loserFinal = requireItem(
      (bracket.body.nodes as BracketNode[]).find(
        (node) => node.round === 2 && node.bracketSide === 'losers',
      ),
      'loser final is required',
    );
    expect(loserFinal.awayTeamId).toBe(winnersFinal.awayTeamId);
    expect(loserFinal.homeTeamId).toBeUndefined();

    await submitAndVerify(api, requireItem(firstLoserNode.matchId, 'loser match'), 1, 0);

    bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    loserFinal = requireItem(
      (bracket.body.nodes as BracketNode[]).find(
        (node) => node.round === 2 && node.bracketSide === 'losers',
      ),
      'updated loser final is required',
    );
    expect(loserFinal.homeTeamId).toBe(firstLoserNode.homeTeamId);
    expect(loserFinal.awayTeamId).toBe(winnersFinal.awayTeamId);

    await submitAndVerify(api, requireItem(loserFinal.matchId, 'loser final match'), 2, 0);

    bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    const grandFinal = requireItem(
      (bracket.body.nodes as BracketNode[]).find(
        (node) => node.round === 3 && node.bracketSide === 'winners',
      ),
      'grand final is required',
    );
    expect(grandFinal.homeTeamId).toBe(winnersFinal.homeTeamId);
    expect(grandFinal.awayTeamId).toBe(loserFinal.homeTeamId);

    await submitAndVerify(api, requireItem(grandFinal.matchId, 'grand final match'), 0, 1);

    bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    const resetFinal = requireItem(
      (bracket.body.nodes as BracketNode[]).find((node) => node.isIfNecessary),
      'if-necessary final is required',
    );
    expect(resetFinal).toMatchObject({
      homeTeamId: grandFinal.homeTeamId,
      awayTeamId: grandFinal.awayTeamId,
      status: 'ready',
    });
    expect(resetFinal.matchId).toBeTruthy();

    await app.close();
  });

  it('advances byes without creating fake matches', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'knockout', 3);
    const byeTeam = requireItem(teams[0], 'bye team is required');

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        ...seedPayload(teams),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const nodes = published.body.nodes as BracketNode[];
    const firstRoundPlayable = nodes.filter(
      (node) => node.round === 1 && node.bracketSide === 'main' && node.matchId,
    );
    const byeNode = requireItem(
      nodes.find((node) => node.round === 1 && node.status === 'bye'),
      'bye node is required',
    );
    const finalNode = requireItem(
      nodes.find((node) => node.round === 2 && node.bracketSide === 'main'),
      'final node is required',
    );

    expect(firstRoundPlayable).toHaveLength(1);
    expect(byeNode).toMatchObject({
      winnerTeamId: byeTeam.id,
    });
    expect(byeNode.matchId).toBeUndefined();
    expect(finalNode).toMatchObject({
      homeTeamId: byeTeam.id,
      status: 'pending',
    });

    await app.close();
  });

  it('compacts withdrawn seeds so sparse active byes still advance', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'knockout', 4);
    const activeByeTeam = requireItem(teams[1], 'active bye team is required');

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        seeds: teams.map((team, index) => ({
          teamId: team.id,
          seedNumber: index + 1,
          locked: false,
          withdrawn: index === 0,
        })),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const nodes = published.body.nodes as BracketNode[];
    const byeNode = requireItem(
      nodes.find((node) => node.round === 1 && node.status === 'bye'),
      'sparse bye node is required',
    );
    const finalNode = requireItem(
      nodes.find((node) => node.round === 2 && node.bracketSide === 'main'),
      'final node is required',
    );

    expect(byeNode.winnerTeamId).toBe(activeByeTeam.id);
    expect(finalNode.homeTeamId).toBe(activeByeTeam.id);

    await app.close();
  });

  it('scopes private bracket reads and standings to participating schools', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'knockout', 4);
    const participantTeam = requireItem(teams[0], 'participant team is required');

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        ...seedPayload(teams),
      })
      .expect(201);

    await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const outsiderAdmin = await registerSchoolAdmin(api, 'outsider');
    await createAndApproveSchool(api, outsiderAdmin, 'Outsider Bracket School');

    await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(participantTeam.admin))
      .expect(200);

    await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(outsiderAdmin))
      .expect(403);

    await api
      .get(`/api/brackets/${created.body.bracket.id}/standings`)
      .set(headersFor(outsiderAdmin))
      .expect(403);

    await app.close();
  });

  it('rejects tied elimination verification before marking the match verified', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'knockout', 4);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        ...seedPayload(teams),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const tiedNode = requireItem(
      (published.body.nodes as BracketNode[]).find(
        (node) => node.round === 1 && node.bracketSide === 'main' && node.matchId,
      ),
      'playable first-round node is required',
    );

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

  it('routes eight-team double elimination winners and losers into bounded first paths', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'double_elimination', 8);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'double_elimination',
        ...seedPayload(teams),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const firstRoundNodes = (published.body.nodes as BracketNode[])
      .filter((node) => node.round === 1 && node.bracketSide === 'winners' && node.matchId)
      .sort((first, second) => first.position - second.position);
    expect(firstRoundNodes).toHaveLength(4);

    const expectedLosers = firstRoundNodes.map((node) =>
      requireItem(node.awayTeamId, 'away team is required'),
    );
    for (const node of firstRoundNodes) {
      await submitAndVerify(api, requireItem(node.matchId, 'match id is required'), 3, 1);
    }

    const bracket = await api
      .get(`/api/brackets/${created.body.bracket.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    const nodes = bracket.body.nodes as BracketNode[];
    const winnersSemis = nodes.filter((node) => node.round === 2 && node.bracketSide === 'winners');
    const firstLoserNodes = nodes.filter(
      (node) => node.round === 1 && node.bracketSide === 'losers',
    );

    expect(winnersSemis).toHaveLength(2);
    expect(winnersSemis.every((node) => node.homeTeamId && node.awayTeamId && node.matchId)).toBe(
      true,
    );
    expect(firstLoserNodes).toHaveLength(2);
    expect(
      firstLoserNodes.every((node) => node.homeTeamId && node.awayTeamId && node.matchId),
    ).toBe(true);
    const actualLosers = firstLoserNodes.flatMap((node) => [
      requireItem(node.homeTeamId, 'loser home team is required'),
      requireItem(node.awayTeamId, 'loser away team is required'),
    ]);
    expect([...actualLosers].sort()).toEqual([...expectedLosers].sort());

    await app.close();
  });

  it('cleans up scheduled draft bracket matches and blocks reseeding after play starts', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'knockout', 4);
    const unlockedSeeds = seedPayload(teams).seeds.map((seed) => ({ ...seed, locked: false }));

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        seeds: unlockedSeeds,
      })
      .expect(201);

    const oldNode = requireItem(
      (created.body.nodes as BracketNode[]).find((node) => node.round === 1 && node.matchId),
      'draft bracket match is required',
    );
    const oldMatchId = requireItem(oldNode.matchId, 'old match id is required');

    const reseeded = await api
      .post(`/api/brackets/${created.body.bracket.id}/seeds`)
      .set(headersFor(superAdmin))
      .send({
        seeds: seedPayload([...teams].reverse()).seeds.map((seed) => ({ ...seed, locked: false })),
      })
      .expect(201);

    await api.get(`/api/matches/${oldMatchId}`).set(headersFor(superAdmin)).expect(400);

    const newNode = requireItem(
      (reseeded.body.nodes as BracketNode[]).find((node) => node.round === 1 && node.matchId),
      'new draft bracket match is required',
    );
    const newMatchId = requireItem(newNode.matchId, 'new match id is required');

    await api
      .post(`/api/matches/${newMatchId}/submit-result`)
      .set(headersFor(superAdmin))
      .send({ homeScore: 2, awayScore: 1, sportStats: {} })
      .expect(201);

    await api
      .post(`/api/brackets/${created.body.bracket.id}/seeds`)
      .set(headersFor(superAdmin))
      .send({ seeds: unlockedSeeds })
      .expect(400);

    await app.close();
  });

  it('ranks group standings with points, goal difference, head-to-head, and discipline', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'group_stages', 4);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'group_stage_knockout',
        ...seedPayload(teams, 'A'),
      })
      .expect(201);

    const published = await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);
    const nodes = published.body.nodes as BracketNode[];
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const teamC = requireItem(teams[2], 'team C is required');
    const teamD = requireItem(teams[3], 'team D is required');

    const aBeatsB = findNodeForTeams(nodes, teamA.id, teamB.id);
    const cBeatsA = findNodeForTeams(nodes, teamC.id, teamA.id);
    const bBeatsD = findNodeForTeams(nodes, teamB.id, teamD.id);
    const cDrawsD = findNodeForTeams(nodes, teamC.id, teamD.id);

    await submitAndVerify(
      api,
      aBeatsB.matchId as string,
      aBeatsB.homeTeamId === teamA.id ? 1 : 0,
      aBeatsB.homeTeamId === teamA.id ? 0 : 1,
    );
    await submitAndVerify(
      api,
      cBeatsA.matchId as string,
      cBeatsA.homeTeamId === teamC.id ? 1 : 0,
      cBeatsA.homeTeamId === teamC.id ? 0 : 1,
    );
    await submitAndVerify(
      api,
      bBeatsD.matchId as string,
      bBeatsD.homeTeamId === teamB.id ? 1 : 0,
      bBeatsD.homeTeamId === teamB.id ? 0 : 1,
    );
    await submitAndVerify(api, cDrawsD.matchId as string, 0, 0, {
      homeDisciplinaryPoints: cDrawsD.homeTeamId === teamC.id ? 0 : 4,
      awayDisciplinaryPoints: cDrawsD.awayTeamId === teamC.id ? 0 : 4,
    });

    const standings = await api
      .get(`/api/brackets/${created.body.bracket.id}/standings?groupKey=A`)
      .set(headersFor(superAdmin))
      .expect(200);

    const rows = standings.body.rows as Array<{
      teamId: string;
      points: number;
      goalDifference: number;
      headToHeadPoints: number;
      disciplinaryPoints: number;
      rank: number;
    }>;

    expect(rows[0]).toMatchObject({ teamId: teamC.id, points: 4, rank: 1 });
    expect(rows.find((row) => row.teamId === teamA.id)?.headToHeadPoints).toBeGreaterThan(
      rows.find((row) => row.teamId === teamB.id)?.headToHeadPoints ?? -1,
    );
    expect(rows.findIndex((row) => row.teamId === teamA.id)).toBeLessThan(
      rows.findIndex((row) => row.teamId === teamB.id),
    );
    expect(rows.find((row) => row.teamId === teamC.id)?.disciplinaryPoints).toBeLessThan(
      rows.find((row) => row.teamId === teamD.id)?.disciplinaryPoints ?? Number.MAX_SAFE_INTEGER,
    );

    await app.close();
  });

  it('rejects destructive regenerate for a published bracket and creates a new version instead', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());

    const { tournament, teams } = await createTournamentWithTeams(api, 'knockout', 4);

    const created = await api
      .post(`/api/tournaments/${tournament.id}/brackets`)
      .set(headersFor(superAdmin))
      .send({
        format: 'single_elimination',
        ...seedPayload(teams),
      })
      .expect(201);

    await api
      .post(`/api/brackets/${created.body.bracket.id}/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    await api
      .post(`/api/brackets/${created.body.bracket.id}/regenerate`)
      .set(headersFor(superAdmin))
      .send({ createNewVersion: false })
      .expect(400);

    const regenerated = await api
      .post(`/api/brackets/${created.body.bracket.id}/regenerate`)
      .set(headersFor(superAdmin))
      .send({
        createNewVersion: true,
        seeds: seedPayload([...teams].reverse()).seeds,
      })
      .expect(201);

    expect(regenerated.body.version.versionNumber).toBe(2);
    expect(regenerated.body.bracket.activeVersionId).toBe(regenerated.body.version.id);

    const oldVersion = await api
      .get(`/api/brackets/${created.body.bracket.id}?versionId=${created.body.version.id}`)
      .set(headersFor(superAdmin))
      .expect(200);
    expect(oldVersion.body.version.versionNumber).toBe(1);

    await app.close();
  });
});
