import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;

type HeaderBag = Record<string, string>;
type Api = ReturnType<typeof request>;
type Actor = { id: string; role: string };
type TeamFixture = { id: string; schoolId: string };
type ScheduleRow = { id: string; matchId: string; startsAt: string; status: string };

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
const uniqueRunId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const headersFor = (user: Actor): HeaderBag => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerUser = async (
  api: Api,
  runId: string,
  label: string,
  role: 'school_admin' | 'referee' = 'school_admin',
): Promise<Actor> => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `pg_schedule_${runId}_${label}@athletiq.local`,
      password: 'password123',
      role,
    })
    .expect(201);

  return { id: response.body.user.id as string, role };
};

const createAndApproveSchool = async (api: Api, admin: Actor, runId: string, index: number) => {
  const school = await api
    .post('/api/schools')
    .set(headersFor(admin))
    .send({ name: `PG Schedule School ${runId} ${index}`, location: 'Kathmandu' })
    .expect(201);

  await api.post(`/api/schools/${school.body.id}/approve`).set(headersFor(superAdmin)).expect(201);
  return school.body as { id: string };
};

const createAndApproveAthlete = async (
  api: Api,
  admin: Actor,
  schoolId: string,
  runId: string,
  index: number,
) => {
  const athlete = await api
    .post('/api/athletes/drafts')
    .set(headersFor(admin))
    .send({ schoolId, fullName: `PG Schedule Athlete ${runId} ${index}`, gender: 'female' })
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
      name: `PG Schedule Cup ${runId}`,
      sport: 'football',
      format: 'league',
      maxTeams: 4,
      season: '2026',
    })
    .expect(201);

  await api
    .post(`/api/tournaments/${tournament.body.id}/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  const teams: TeamFixture[] = [];
  for (let index = 0; index < 2; index += 1) {
    const admin = await registerUser(api, runId, `admin_${index}`);
    const school = await createAndApproveSchool(api, admin, runId, index);
    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(admin))
      .send({ schoolId: school.id })
      .expect(201);

    const athlete = await createAndApproveAthlete(api, admin, school.id, runId, index);
    const team = await api
      .post('/api/teams')
      .set(headersFor(admin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: `PG Schedule Team ${runId} ${index}`,
        athleteIds: [athlete.id],
      })
      .expect(201);
    teams.push(team.body as TeamFixture);
  }

  return { tournament: tournament.body as { id: string }, teams };
};

const createMatch = async (api: Api, tournamentId: string, teams: TeamFixture[]) => {
  const [home, away] = teams;
  if (!home || !away) {
    throw new Error('Expected two teams');
  }
  const match = await api
    .post('/api/matches')
    .set(headersFor(superAdmin))
    .send({
      tournamentId,
      homeTeamId: home.id,
      awayTeamId: away.id,
      scheduledAt: '2026-11-01T08:00:00.000Z',
    })
    .expect(201);

  return match.body as { id: string };
};

const createVenueUnit = async (api: Api, runId: string) => {
  const facility = await api
    .post('/api/facilities')
    .set(headersFor(superAdmin))
    .send({
      name: `PG Schedule Facility ${runId}`,
      location: 'Kathmandu',
      timezone: 'Asia/Kathmandu',
    })
    .expect(201);

  const unit = await api
    .post(`/api/facilities/${facility.body.id}/units`)
    .set(headersFor(superAdmin))
    .send({ name: `Main Field ${runId}`, unitType: 'field', sports: ['football'] })
    .expect(201);

  return unit.body as { id: string };
};

const generateSchedule = async (api: Api, tournamentId: string, venueUnitId: string) => {
  const response = await api
    .post(`/api/tournaments/${tournamentId}/schedule/generate`)
    .set(headersFor(superAdmin))
    .send({
      venueUnitIds: [venueUnitId],
      startsAt: '2026-11-01T08:00:00.000Z',
      slotMinutes: 60,
      matchDurationMinutes: 60,
      minRestMinutes: 0,
    })
    .expect(201);

  return response.body.schedules as ScheduleRow[];
};

describeDatabase('phase 13 postgres scheduling', () => {
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

  it('persists venue-unit blackout scheduling and idempotent regeneration', async () => {
    const runId = uniqueRunId();
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, runId);
    await createMatch(api, tournament.id, teams);
    const venueUnitId = await createVenueUnit(api, runId);

    await api
      .post('/api/scheduling/availability')
      .set(headersFor(superAdmin))
      .send({
        resourceType: 'venue_unit',
        resourceId: venueUnitId.id,
        tournamentId: tournament.id,
        startsAt: '2026-11-01T08:00:00.000Z',
        endsAt: '2026-11-01T09:00:00.000Z',
        status: 'blackout',
      })
      .expect(201);

    const firstRun = await generateSchedule(api, tournament.id, venueUnitId.id);
    expect(firstRun[0]?.startsAt).toBe('2026-11-01T09:00:00.000Z');

    const secondRun = await generateSchedule(api, tournament.id, venueUnitId.id);
    expect(secondRun[0]?.startsAt).toBe(firstRun[0]?.startsAt);

    const unpublished = await api
      .post(`/api/tournaments/${tournament.id}/schedule/unpublish`)
      .set(headersFor(superAdmin))
      .expect(201);
    expect(
      (unpublished.body.schedules as ScheduleRow[]).every(
        (schedule) => schedule.status === 'unpublished',
      ),
    ).toBe(true);

    await app.close();
  });

  it('persists official assignments, availability checks, scoped reads, and notifications', async () => {
    const runId = uniqueRunId();
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, runId);
    const match = await createMatch(api, tournament.id, teams);
    const venueUnit = await createVenueUnit(api, `${runId}_officials`);
    await generateSchedule(api, tournament.id, venueUnit.id);

    const firstReferee = await registerUser(api, runId, 'referee_one', 'referee');
    const secondReferee = await registerUser(api, runId, 'referee_two', 'referee');
    const blockedReferee = await registerUser(api, runId, 'referee_blocked', 'referee');
    const firstProfile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({
        userId: firstReferee.id,
        displayName: 'PG Referee One',
        sports: ['football'],
        homeSchoolId: teams[0]?.schoolId,
      })
      .expect(201);
    const secondProfile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({ userId: secondReferee.id, displayName: 'PG Referee Two', sports: ['football'] })
      .expect(201);
    const blockedProfile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({ userId: blockedReferee.id, displayName: 'PG Blocked Referee', sports: ['football'] })
      .expect(201);

    await api
      .post('/api/scheduling/availability')
      .set(headersFor(superAdmin))
      .send({
        resourceType: 'official',
        resourceId: blockedProfile.body.id,
        tournamentId: tournament.id,
        startsAt: '2026-11-01T08:00:00.000Z',
        endsAt: '2026-11-01T09:00:00.000Z',
        status: 'blackout',
      })
      .expect(201);
    await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: blockedProfile.body.id, role: 'assistant_referee' })
      .expect(400);

    const firstAssignment = await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: firstProfile.body.id, role: 'referee' })
      .expect(201);
    await api
      .post(`/api/official-assignments/${firstAssignment.body.id}/check-in`)
      .set(headersFor(firstReferee))
      .expect(400);
    await api
      .post(`/api/official-assignments/${firstAssignment.body.id}/respond`)
      .set(headersFor(firstReferee))
      .send({ status: 'accepted' })
      .expect(201);
    await api
      .post(`/api/official-assignments/${firstAssignment.body.id}/check-in`)
      .set(headersFor(firstReferee))
      .expect(201);
    await api
      .post(`/api/official-assignments/${firstAssignment.body.id}/respond`)
      .set(headersFor(firstReferee))
      .send({ status: 'declined' })
      .expect(400);
    const secondAssignment = await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: secondProfile.body.id, role: 'scorer' })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.id}/schedule/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const refereeView = await api
      .get(`/api/tournaments/${tournament.id}/schedule`)
      .set(headersFor(firstReferee))
      .expect(200);
    const visibleAssignmentIds = (refereeView.body.assignments as Array<{ id: string }>).map(
      (assignment) => assignment.id,
    );
    expect(visibleAssignmentIds).toContain(firstAssignment.body.id);
    expect(visibleAssignmentIds).not.toContain(secondAssignment.body.id);

    const notifications = await api
      .get('/api/scheduling/notifications')
      .set(headersFor(firstReferee))
      .expect(200);
    expect(
      (notifications.body.notifications as Array<{ tournamentId: string; type: string }>).some(
        (notification) =>
          notification.tournamentId === tournament.id && notification.type === 'schedule_published',
      ),
    ).toBe(true);

    await app.close();
  });
});
