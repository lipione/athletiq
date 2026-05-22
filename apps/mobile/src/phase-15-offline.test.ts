import { describe, expect, it } from 'vitest';
import {
  buildLoginRequest,
  buildPushMutationsRequest,
  buildSubmitResultRequest,
  createLocalDatabaseDescriptor,
  createQrScannerDescriptor,
} from './offline/match-day-api.js';
import { matchDayPacketFixture, qrFixtures } from './offline/match-day-fixtures.js';
import {
  classifyQrPayload,
  createInitialMatchDayState,
  downloadMatchPacket,
  logout,
  markMutationConflict,
  markMutationSynced,
  recordCheckIn,
  recordMatchEvent,
  retryPendingMutations,
  storeToken,
} from './offline/match-day-store.js';

describe('phase 15 mobile offline match-day operations', () => {
  it('stores and clears the secure session token in the local session model', () => {
    const authenticated = storeToken(createInitialMatchDayState(), {
      token: 'access-token',
      userId: 'usr_referee',
      role: 'referee',
    });

    expect(authenticated.session).toMatchObject({
      token: 'access-token',
      userId: 'usr_referee',
      role: 'referee',
      secureStorage: 'stored',
    });

    const loggedOut = logout(authenticated);
    expect(loggedOut.session.secureStorage).toBe('empty');
    expect(loggedOut.session.token).toBeUndefined();
    expect(loggedOut.activePacket).toBeUndefined();
  });

  it('downloads a match packet that remains available offline', () => {
    const offlineState = downloadMatchPacket(createInitialMatchDayState(), matchDayPacketFixture);

    expect(offlineState.activePacket?.matchId).toBe('match-ksc-03');
    expect(offlineState.activePacket?.homeTeam.athletes[0]?.athletiqId).toBe('ATH-NP-2026-000184');
  });

  it('classifies athlete, team, match, check-in, and venue QR payloads', () => {
    expect(classifyQrPayload(qrFixtures.athlete)).toMatchObject({
      type: 'athlete',
      resourceId: 'ath-nima-rai',
    });
    expect(classifyQrPayload(qrFixtures.team)).toMatchObject({
      type: 'team',
      resourceId: 'team-kantipur-u16',
    });
    expect(classifyQrPayload(qrFixtures.match)).toMatchObject({
      type: 'match',
      resourceId: 'match-ksc-03',
    });
    expect(classifyQrPayload(qrFixtures.checkIn)).toMatchObject({
      type: 'check-in',
      resourceId: 'team-kantipur-u16',
    });
    expect(classifyQrPayload(qrFixtures.venue)).toMatchObject({
      type: 'venue',
      resourceId: 'unit-main-pitch',
    });
  });

  it('records team check-in and offline scoring as immutable mutations', () => {
    const withPacket = downloadMatchPacket(createInitialMatchDayState(), matchDayPacketFixture);
    const checkedIn = recordCheckIn(withPacket, classifyQrPayload(qrFixtures.checkIn));
    const scored = recordMatchEvent(checkedIn, {
      mutationId: 'm-goal-1',
      matchId: 'match-ksc-03',
      teamId: 'team-kantipur-u16',
      athleteId: 'ath-nima-rai',
      type: 'goal',
      minute: 18,
    });

    expect(scored.activePacket?.homeTeam.checkedIn).toBe(true);
    expect(scored.localCheckIns[0]).toMatchObject({
      retainedLocally: true,
      reason: 'Team check-in sync requires a backend team check-in endpoint.',
    });
    expect(scored.mutations.map((mutation) => mutation.mutationId)).toEqual(['m-goal-1']);
    expect(scored.matchEvents[0]).toMatchObject({
      athleteId: 'ath-nima-rai',
      type: 'goal',
      minute: 18,
    });
  });

  it('keeps duplicate mutation IDs idempotent', () => {
    const first = recordMatchEvent(createInitialMatchDayState(), {
      mutationId: 'm-goal-duplicate',
      matchId: 'match-ksc-03',
      teamId: 'team-kantipur-u16',
      athleteId: 'ath-nima-rai',
      type: 'goal',
      minute: 20,
    });
    const second = recordMatchEvent(first, {
      mutationId: 'm-goal-duplicate',
      matchId: 'match-ksc-03',
      teamId: 'team-kantipur-u16',
      athleteId: 'ath-nima-rai',
      type: 'goal',
      minute: 20,
    });

    expect(second.mutations).toHaveLength(1);
    expect(second.matchEvents).toHaveLength(1);
  });

  it('retains conflicting edits in the conflict inbox for reviewer action', () => {
    const withEvent = recordMatchEvent(createInitialMatchDayState(), {
      mutationId: 'm-conflict',
      matchId: 'match-ksc-03',
      teamId: 'team-kantipur-u16',
      athleteId: 'ath-nima-rai',
      type: 'yellow_card',
      minute: 51,
    });
    const conflicted = markMutationConflict(
      withEvent,
      'm-conflict',
      'Server already verified score',
      {
        status: 'verified',
        homeScore: 2,
        awayScore: 1,
      },
    );

    expect(conflicted.mutations[0]?.status).toBe('conflict');
    expect(conflicted.conflicts[0]).toMatchObject({
      mutationId: 'm-conflict',
      reason: 'Server already verified score',
    });
    expect(conflicted.conflicts[0]?.clientSnapshot).toMatchObject({
      matchId: 'match-ksc-03',
    });
  });

  it('builds backend-compatible requests and retries unsynced mutations', () => {
    const withEvent = recordMatchEvent(createInitialMatchDayState(), {
      mutationId: 'm-sync',
      matchId: 'match-ksc-03',
      teamId: 'team-kantipur-u16',
      athleteId: 'ath-nima-rai',
      type: 'goal',
      minute: 62,
    });
    const synced = markMutationSynced(withEvent, 'm-sync', 'server-event-1');
    const retry = retryPendingMutations(withEvent);
    const loginRequest = buildLoginRequest(
      'http://localhost:4000/api',
      'referee@athletiq.local',
      'secret',
    );
    const pushRequest = buildPushMutationsRequest(
      'http://localhost:4000/api',
      'phone-1',
      withEvent.mutations,
      'token',
      'school-kantipur',
    );
    const resultRequest = buildSubmitResultRequest(
      'http://localhost:4000/api',
      'match-ksc-03',
      'token',
      {
        homeScore: 2,
        awayScore: 1,
        notes: 'Signed by center referee',
      },
    );

    expect(synced.mutations[0]).toMatchObject({
      status: 'synced',
      serverId: 'server-event-1',
    });
    expect(retry.state.sync.retryCount).toBe(1);
    expect(retry.mutations).toHaveLength(1);
    expect(loginRequest).toMatchObject({
      url: 'http://localhost:4000/api/auth/login',
      init: { method: 'POST' },
    });
    expect(pushRequest.init.body).toContain('"mutationId":"m-sync"');
    expect(pushRequest.init.body).toContain('"schoolId":"school-kantipur"');
    expect(resultRequest).toMatchObject({
      url: 'http://localhost:4000/api/matches/match-ksc-03/submit-result',
      init: { method: 'POST' },
    });
    expect(resultRequest.init.body).toContain('"homeScore":2');
  });

  it('documents native adapter boundaries for Expo Go', () => {
    expect(createQrScannerDescriptor()).toMatchObject({
      module: 'expo-camera',
      permission: 'camera',
    });
    expect(createLocalDatabaseDescriptor()).toMatchObject({
      module: 'expo-sqlite',
      databaseName: 'athletiq-match-day.db',
    });
  });
});
