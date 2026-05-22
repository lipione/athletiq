import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

type HeaderBag = Record<string, string>;
type Api = ReturnType<typeof request>;
type Actor = { id: string; role: string };
type TeamFixture = { id: string; schoolId: string; athleteIds: string[]; admin: Actor };
type MatchFixture = { id: string; homeTeamId: string; awayTeamId: string; scheduledAt: string };
type ScheduleRow = {
  id: string;
  matchId: string;
  venueUnitId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  conflictWarnings: string[];
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

const registerUser = async (
  api: Api,
  label: string,
  role: 'school_admin' | 'referee' = 'school_admin',
): Promise<Actor> => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `schedule_${Date.now()}_${label}_${Math.random().toString(36).slice(2, 8)}@athletiq.local`,
      password: 'password123',
      role,
    })
    .expect(201);

  return { id: response.body.user.id as string, role };
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
    .send({ schoolId, fullName, gender: 'male' })
    .expect(201);

  const approved = await api
    .post(`/api/athletes/${athlete.body.id}/identity/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  return approved.body as { id: string };
};

const setupTournamentTeams = async (api: Api, teamCount = 4) => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tournament = await api
    .post('/api/tournaments')
    .set(headersFor(superAdmin))
    .send({
      name: `Scheduling Cup ${runId}`,
      sport: 'football',
      format: 'league',
      maxTeams: Math.max(teamCount, 4),
      season: '2026',
    })
    .expect(201);

  await api
    .post(`/api/tournaments/${tournament.body.id}/approve`)
    .set(headersFor(superAdmin))
    .expect(201);

  const teams: TeamFixture[] = [];
  for (let index = 0; index < teamCount; index += 1) {
    const admin = await registerUser(api, `school_${runId}_${index}`);
    const school = await createAndApproveSchool(api, admin, `Scheduling School ${runId} ${index}`);
    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(admin))
      .send({ schoolId: school.id })
      .expect(201);

    const athlete = await createAndApproveAthlete(
      api,
      admin,
      school.id,
      `Scheduling Athlete ${index}`,
    );
    const team = await api
      .post('/api/teams')
      .set(headersFor(admin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.id,
        name: `Scheduling Team ${index + 1}`,
        athleteIds: [athlete.id],
      })
      .expect(201);

    teams.push({
      id: team.body.id as string,
      schoolId: school.id,
      athleteIds: [athlete.id],
      admin,
    });
  }

  return { tournament: tournament.body as { id: string }, teams };
};

const createMatch = async (
  api: Api,
  tournamentId: string,
  homeTeamId: string,
  awayTeamId: string,
  scheduledAt = '2026-11-01T08:00:00.000Z',
) => {
  const match = await api
    .post('/api/matches')
    .set(headersFor(superAdmin))
    .send({ tournamentId, homeTeamId, awayTeamId, scheduledAt })
    .expect(201);

  return match.body as MatchFixture;
};

const createVenueUnit = async (api: Api, label: string) => {
  const facility = await api
    .post('/api/facilities')
    .set(headersFor(superAdmin))
    .send({
      name: `Dasharath ${label}`,
      location: 'Kathmandu',
      timezone: 'Asia/Kathmandu',
    })
    .expect(201);

  const unit = await api
    .post(`/api/facilities/${facility.body.id}/units`)
    .set(headersFor(superAdmin))
    .send({
      name: `Field ${label}`,
      unitType: 'field',
      sports: ['football'],
    })
    .expect(201);

  return { facility: facility.body as { id: string }, unit: unit.body as { id: string } };
};

const requireItem = <T>(value: T | undefined, message: string): T => {
  if (!value) {
    throw new Error(message);
  }
  return value;
};

const minutesBetween = (first: string, second: string) =>
  (new Date(second).getTime() - new Date(first).getTime()) / 60_000;

describe('phase 13 facilities, officials, and scheduling', () => {
  it('generates non-overlapping field schedules', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 4);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const teamC = requireItem(teams[2], 'team C is required');
    const teamD = requireItem(teams[3], 'team D is required');
    await createMatch(api, tournament.id, teamA.id, teamB.id);
    await createMatch(api, tournament.id, teamC.id, teamD.id);
    const { unit } = await createVenueUnit(api, 'A');

    const generated = await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);

    const schedules = generated.body.schedules as ScheduleRow[];
    expect(schedules).toHaveLength(2);
    expect(schedules.every((row) => row.venueUnitId === unit.id)).toBe(true);
    expect(Date.parse(schedules[0]?.endsAt ?? '')).toBeLessThanOrEqual(
      Date.parse(schedules[1]?.startsAt ?? ''),
    );

    await app.close();
  });

  it('respects school blackout windows and minimum rest rules', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 3);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const teamC = requireItem(teams[2], 'team C is required');
    const firstMatch = await createMatch(api, tournament.id, teamA.id, teamB.id);
    const secondMatch = await createMatch(api, tournament.id, teamA.id, teamC.id);
    const { unit } = await createVenueUnit(api, 'B');

    await api
      .post('/api/scheduling/availability')
      .set(headersFor(superAdmin))
      .send({
        resourceType: 'school',
        resourceId: teamA.schoolId,
        tournamentId: tournament.id,
        startsAt: '2026-11-01T08:00:00.000Z',
        endsAt: '2026-11-01T09:00:00.000Z',
        status: 'blackout',
        reason: 'Exam morning',
      })
      .expect(201);

    const generated = await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 120,
      })
      .expect(201);

    const schedules = (generated.body.schedules as ScheduleRow[]).filter((row) =>
      [firstMatch.id, secondMatch.id].includes(row.matchId),
    );
    expect(schedules).toHaveLength(2);
    expect(schedules.every((row) => row.startsAt !== '2026-11-01T08:00:00.000Z')).toBe(true);
    const ordered = [...schedules].sort((first, second) =>
      first.startsAt.localeCompare(second.startsAt),
    );
    expect(
      minutesBetween(ordered[0]?.endsAt ?? '', ordered[1]?.startsAt ?? ''),
    ).toBeGreaterThanOrEqual(120);

    await app.close();
  });

  it('respects venue unit blackouts and keeps regeneration idempotent', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 2);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    await createMatch(api, tournament.id, teamA.id, teamB.id);
    const { unit } = await createVenueUnit(api, 'VenueBlackout');

    await api
      .post('/api/scheduling/availability')
      .set(headersFor(superAdmin))
      .send({
        resourceType: 'venue_unit',
        resourceId: unit.id,
        tournamentId: tournament.id,
        startsAt: '2026-11-01T08:00:00.000Z',
        endsAt: '2026-11-01T09:00:00.000Z',
        status: 'blackout',
        reason: 'Pitch maintenance',
      })
      .expect(201);

    const firstRun = await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);
    const firstSchedule = requireItem(
      (firstRun.body.schedules as ScheduleRow[])[0],
      'first schedule is required',
    );
    expect(firstSchedule.startsAt).toBe('2026-11-01T09:00:00.000Z');

    const secondRun = await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);
    const regenerated = requireItem(
      (secondRun.body.schedules as ScheduleRow[])[0],
      'regenerated schedule is required',
    );
    expect(regenerated.startsAt).toBe(firstSchedule.startsAt);

    await app.close();
  });

  it('prevents overlapping official assignments', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 4);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const teamC = requireItem(teams[2], 'team C is required');
    const teamD = requireItem(teams[3], 'team D is required');
    const firstMatch = await createMatch(api, tournament.id, teamA.id, teamB.id);
    const secondMatch = await createMatch(api, tournament.id, teamC.id, teamD.id);
    const firstUnit = await createVenueUnit(api, 'C1');
    const secondUnit = await createVenueUnit(api, 'C2');
    const referee = await registerUser(api, 'overlap_referee', 'referee');
    const profile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({
        userId: referee.id,
        displayName: 'Overlap Referee',
        sports: ['football'],
      })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [firstUnit.unit.id, secondUnit.unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);

    await api
      .post(`/api/matches/${firstMatch.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: profile.body.id, role: 'referee' })
      .expect(201);

    await api
      .post(`/api/matches/${secondMatch.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: profile.body.id, role: 'referee' })
      .expect(400);

    await app.close();
  });

  it('requires override reason when rescheduling assigned officials into conflicts', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 4);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const teamC = requireItem(teams[2], 'team C is required');
    const teamD = requireItem(teams[3], 'team D is required');
    const firstMatch = await createMatch(api, tournament.id, teamA.id, teamB.id);
    const secondMatch = await createMatch(api, tournament.id, teamC.id, teamD.id);
    const { unit } = await createVenueUnit(api, 'OfficialOverride');
    const referee = await registerUser(api, 'override_referee', 'referee');
    const profile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({
        userId: referee.id,
        displayName: 'Override Referee',
        sports: ['football'],
      })
      .expect(201);

    const generated = await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);
    const firstSchedule = requireItem(
      (generated.body.schedules as ScheduleRow[]).find(
        (schedule) => schedule.matchId === firstMatch.id,
      ),
      'first schedule is required',
    );
    const secondSchedule = requireItem(
      (generated.body.schedules as ScheduleRow[]).find(
        (schedule) => schedule.matchId === secondMatch.id,
      ),
      'second schedule is required',
    );

    await api
      .post(`/api/matches/${firstMatch.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: profile.body.id, role: 'referee' })
      .expect(201);
    await api
      .post(`/api/matches/${secondMatch.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: profile.body.id, role: 'referee' })
      .expect(201);

    await api
      .post(`/api/matches/${secondMatch.id}/schedule/override`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitId: unit.id,
        startsAt: firstSchedule.startsAt,
        endsAt: firstSchedule.endsAt,
        allowConflicts: true,
      })
      .expect(400);

    const override = await api
      .post(`/api/matches/${secondMatch.id}/schedule/override`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitId: unit.id,
        startsAt: firstSchedule.startsAt,
        endsAt: firstSchedule.endsAt,
        allowConflicts: true,
        reason: 'Federation approved crew movement',
      })
      .expect(201);

    expect(override.body.conflictWarnings).toContain('official_assignment_overlap');
    expect(secondSchedule.startsAt).not.toBe(firstSchedule.startsAt);

    await app.close();
  });

  it('prevents assignments during official blackout windows', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 2);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const match = await createMatch(api, tournament.id, teamA.id, teamB.id);
    const { unit } = await createVenueUnit(api, 'OfficialBlackout');
    const referee = await registerUser(api, 'blackout_referee', 'referee');
    const profile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({
        userId: referee.id,
        displayName: 'Blackout Referee',
        sports: ['football'],
      })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);
    await api
      .post('/api/scheduling/availability')
      .set(headersFor(superAdmin))
      .send({
        resourceType: 'official',
        resourceId: profile.body.id,
        tournamentId: tournament.id,
        startsAt: '2026-11-01T08:00:00.000Z',
        endsAt: '2026-11-01T09:00:00.000Z',
        status: 'blackout',
        reason: 'Already committed',
      })
      .expect(201);

    await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: profile.body.id, role: 'referee' })
      .expect(400);

    await app.close();
  });

  it('enforces official assignment lifecycle and duplicate assignment rules', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 2);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const match = await createMatch(api, tournament.id, teamA.id, teamB.id);
    const { unit } = await createVenueUnit(api, 'Lifecycle');
    const referee = await registerUser(api, 'lifecycle_referee', 'referee');
    const scorer = await registerUser(api, 'lifecycle_scorer', 'referee');
    const refereeProfile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({ userId: referee.id, displayName: 'Lifecycle Referee', sports: ['football'] })
      .expect(201);
    const scorerProfile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({ userId: scorer.id, displayName: 'Lifecycle Scorer', sports: ['football'] })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);

    const refereeAssignment = await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: refereeProfile.body.id, role: 'referee' })
      .expect(201);
    await api
      .post(`/api/official-assignments/${refereeAssignment.body.id}/check-in`)
      .set(headersFor(referee))
      .expect(400);
    await api
      .post(`/api/official-assignments/${refereeAssignment.body.id}/respond`)
      .set(headersFor(referee))
      .send({ status: 'accepted' })
      .expect(201);
    await api
      .post(`/api/official-assignments/${refereeAssignment.body.id}/check-in`)
      .set(headersFor(referee))
      .expect(201);
    await api
      .post(`/api/official-assignments/${refereeAssignment.body.id}/respond`)
      .set(headersFor(referee))
      .send({ status: 'declined' })
      .expect(400);

    const scorerAssignment = await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: scorerProfile.body.id, role: 'scorer' })
      .expect(201);
    await api
      .post(`/api/official-assignments/${scorerAssignment.body.id}/respond`)
      .set(headersFor(scorer))
      .send({ status: 'declined' })
      .expect(201);
    await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: scorerProfile.body.id, role: 'scorer' })
      .expect(400);

    await app.close();
  });

  it('requires reason for conflict override and audits accepted override', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 4);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const teamC = requireItem(teams[2], 'team C is required');
    const teamD = requireItem(teams[3], 'team D is required');
    await createMatch(api, tournament.id, teamA.id, teamB.id);
    await createMatch(api, tournament.id, teamC.id, teamD.id);
    const { unit } = await createVenueUnit(api, 'D');

    const generated = await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);
    const orderedSchedules = (generated.body.schedules as ScheduleRow[]).sort((first, second) =>
      first.startsAt.localeCompare(second.startsAt),
    );
    const occupiedSlot = requireItem(orderedSchedules[0], 'occupied slot is required');
    const overrideTarget = requireItem(orderedSchedules[1], 'override target is required');

    await api
      .post(`/api/matches/${overrideTarget.matchId}/schedule/override`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitId: unit.id,
        startsAt: occupiedSlot.startsAt,
        endsAt: occupiedSlot.endsAt,
        allowConflicts: true,
      })
      .expect(400);

    const override = await api
      .post(`/api/matches/${overrideTarget.matchId}/schedule/override`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitId: unit.id,
        startsAt: occupiedSlot.startsAt,
        endsAt: occupiedSlot.endsAt,
        allowConflicts: true,
        reason: 'Federation broadcast window',
      })
      .expect(201);

    expect(override.body.conflictWarnings).toContain('venue_unit_overlap');
    expect(override.body.overrideReason).toBe('Federation broadcast window');

    const audit = await api.get('/api/audit').set(headersFor(superAdmin)).expect(200);
    expect(
      (audit.body as Array<{ action: string; resourceId: string }>).some(
        (entry) =>
          entry.action === 'schedule.override' && entry.resourceId === occupiedSlot.matchId,
      ),
    ).toBe(false);
    expect(
      (audit.body as Array<{ action: string; resourceId: string }>).some(
        (entry) =>
          entry.action === 'schedule.override' && entry.resourceId === overrideTarget.matchId,
      ),
    ).toBe(true);

    await app.close();
  });

  it('published schedule changes create notifications', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 2);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const match = await createMatch(api, tournament.id, teamA.id, teamB.id);
    const { unit } = await createVenueUnit(api, 'E');
    const referee = await registerUser(api, 'notify_referee', 'referee');
    const profile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({
        userId: referee.id,
        displayName: 'Notify Referee',
        sports: ['football'],
      })
      .expect(201);
    await api.get('/api/officials/profiles').set(headersFor(referee)).expect(403);
    await api.get('/api/scheduling/availability').set(headersFor(referee)).expect(403);

    await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);
    await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: profile.body.id, role: 'referee' })
      .expect(201);
    await api
      .post(`/api/tournaments/${tournament.id}/schedule/publish`)
      .set(headersFor(superAdmin))
      .expect(201);

    const notifications = await api
      .get('/api/scheduling/notifications')
      .set(headersFor(referee))
      .expect(200);

    expect(
      (notifications.body.notifications as Array<{ type: string; tournamentId: string }>).some(
        (notification) =>
          notification.tournamentId === tournament.id && notification.type === 'schedule_published',
      ),
    ).toBe(true);

    await app.close();
  });

  it('scopes referee schedule reads and returns unpublished statuses', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 2);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    const match = await createMatch(api, tournament.id, teamA.id, teamB.id);
    const { unit } = await createVenueUnit(api, 'Scope');
    const firstReferee = await registerUser(api, 'scope_referee_one', 'referee');
    const secondReferee = await registerUser(api, 'scope_referee_two', 'referee');
    const firstProfile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({ userId: firstReferee.id, displayName: 'Scope Referee One', sports: ['football'] })
      .expect(201);
    const secondProfile = await api
      .post('/api/officials/profiles')
      .set(headersFor(superAdmin))
      .send({ userId: secondReferee.id, displayName: 'Scope Referee Two', sports: ['football'] })
      .expect(201);

    await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: '2026-11-01T08:00:00.000Z',
        slotMinutes: 60,
        matchDurationMinutes: 60,
        minRestMinutes: 0,
      })
      .expect(201);
    const firstAssignment = await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: firstProfile.body.id, role: 'referee' })
      .expect(201);
    const secondAssignment = await api
      .post(`/api/matches/${match.id}/officials`)
      .set(headersFor(superAdmin))
      .send({ officialProfileId: secondProfile.body.id, role: 'scorer' })
      .expect(201);
    await api
      .post(`/api/tournaments/${tournament.id}/schedule/publish`)
      .set(headersFor(superAdmin))
      .expect(201);
    const unpublished = await api
      .post(`/api/tournaments/${tournament.id}/schedule/unpublish`)
      .set(headersFor(superAdmin))
      .expect(201);
    expect(
      (unpublished.body.schedules as ScheduleRow[]).every(
        (schedule) => schedule.status === 'unpublished',
      ),
    ).toBe(true);

    const refereeView = await api
      .get(`/api/tournaments/${tournament.id}/schedule`)
      .set(headersFor(firstReferee))
      .expect(200);
    const assignmentIds = (refereeView.body.assignments as Array<{ id: string }>).map(
      (assignment) => assignment.id,
    );
    expect(assignmentIds).toContain(firstAssignment.body.id);
    expect(assignmentIds).not.toContain(secondAssignment.body.id);

    await app.close();
  });

  it('returns 400 for invalid scheduling payload enums and dates', async () => {
    const app = await createApp();
    const api = request(app.getHttpServer());
    const { tournament, teams } = await setupTournamentTeams(api, 2);
    const teamA = requireItem(teams[0], 'team A is required');
    const teamB = requireItem(teams[1], 'team B is required');
    await createMatch(api, tournament.id, teamA.id, teamB.id);
    const { facility, unit } = await createVenueUnit(api, 'Validation');

    await api
      .post(`/api/facilities/${facility.id}/units`)
      .set(headersFor(superAdmin))
      .send({ name: 'Blank Sports', unitType: 'field', sports: ['   '] })
      .expect(400);
    await api
      .post(`/api/facilities/${facility.id}/units`)
      .set(headersFor(superAdmin))
      .send({ name: 'Bad Type', unitType: 'pool', sports: ['football'] })
      .expect(400);
    await api
      .post('/api/scheduling/availability')
      .set(headersFor(superAdmin))
      .send({
        resourceType: 'bus',
        resourceId: unit.id,
        startsAt: '2026-11-01T08:00:00.000Z',
        endsAt: '2026-11-01T09:00:00.000Z',
        status: 'blackout',
      })
      .expect(400);
    await api
      .post(`/api/tournaments/${tournament.id}/schedule/generate`)
      .set(headersFor(superAdmin))
      .send({
        venueUnitIds: [unit.id],
        startsAt: 'not-a-date',
        slotMinutes: 60,
        matchDurationMinutes: 60,
      })
      .expect(400);

    await app.close();
  });
});
