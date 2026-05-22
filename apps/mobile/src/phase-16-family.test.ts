import { describe, expect, it } from 'vitest';
import {
  buildFamilyDashboardRequest,
  buildFamilyMutationSyncRequest,
} from './offline/family-communications-api.js';
import { familyCommunicationsFixture } from './offline/family-communications-fixtures.js';
import {
  deliverableNotices,
  hydrateFamilyCommunicationsState,
  markFamilyMutationSynced,
  queueFamilyMessage,
  retainModerationRecord,
  retryFamilyMutations,
  updateFamilyPreference,
} from './offline/family-communications-store.js';

describe('phase 16 mobile family communications', () => {
  it('suppresses optional channels while required schedule notices remain deliverable', () => {
    const state = hydrateFamilyCommunicationsState(familyCommunicationsFixture);
    const suppressed = updateFamilyPreference(state, {
      mutationId: 'pref-suppress-push',
      channel: 'push',
      category: 'announcement',
      enabled: false,
      locale: 'ne',
    });

    expect(deliverableNotices(suppressed).map((notice) => notice.id)).toEqual(['notice-fixture']);
    expect(deliverableNotices(suppressed)[0]?.required).toBe(true);
    expect(suppressed.mutations[0]).toMatchObject({
      mutationId: 'pref-suppress-push',
      mutationType: 'family_preference_update',
      status: 'pending',
    });
  });

  it('keeps outbound message mutation IDs idempotent', () => {
    const state = hydrateFamilyCommunicationsState(familyCommunicationsFixture);
    const first = queueFamilyMessage(state, {
      mutationId: 'family-msg-1',
      threadId: 'thread-fixture',
      body: 'We reviewed the new time.',
    });
    const second = queueFamilyMessage(first, {
      mutationId: 'family-msg-1',
      threadId: 'thread-fixture',
      body: 'We reviewed the new time.',
    });

    expect(second.mutations).toHaveLength(1);
    expect(second.mutations[0]?.payload).toMatchObject({ threadId: 'thread-fixture' });
  });

  it('retains moderation records locally for reviewer action', () => {
    const state = retainModerationRecord(
      hydrateFamilyCommunicationsState(familyCommunicationsFixture),
      {
        threadId: 'thread-fixture',
        reason: 'School admin approval required',
      },
    );

    expect(state.threads[0]).toMatchObject({
      status: 'moderated',
      retainedForReview: true,
    });
    expect(state.moderation[0]).toMatchObject({
      threadId: 'thread-fixture',
      reason: 'School admin approval required',
    });
  });

  it('retries only unsynced family communication mutations', () => {
    const state = queueFamilyMessage(
      hydrateFamilyCommunicationsState(familyCommunicationsFixture),
      {
        mutationId: 'family-msg-retry',
        threadId: 'thread-fixture',
        body: 'We can attend.',
      },
    );
    const synced = markFamilyMutationSynced(state, 'family-msg-retry');
    const withPending = updateFamilyPreference(synced, {
      mutationId: 'pref-pending',
      channel: 'email',
      category: 'schedule',
      enabled: true,
      locale: 'en',
    });
    const retry = retryFamilyMutations(withPending);

    expect(retry.state.sync.retryCount).toBe(1);
    expect(retry.mutations.map((mutation) => mutation.mutationId)).toEqual(['pref-pending']);
  });

  it('builds backend-compatible family dashboard and sync requests', () => {
    const state = queueFamilyMessage(
      hydrateFamilyCommunicationsState(familyCommunicationsFixture),
      {
        mutationId: 'family-msg-sync',
        threadId: 'thread-fixture',
        body: 'Confirmed.',
      },
    );
    const dashboardRequest = buildFamilyDashboardRequest('http://localhost:4000/api', 'token');
    const syncRequest = buildFamilyMutationSyncRequest(
      'http://localhost:4000/api',
      'phone-family-1',
      state.mutations,
      'token',
      'school-kantipur',
    );

    expect(dashboardRequest).toMatchObject({
      url: 'http://localhost:4000/api/communications/family-dashboard',
      init: { method: 'GET' },
    });
    expect(syncRequest.init.body).toContain('"mutationType":"family_message_send"');
    expect(syncRequest.init.body).toContain('"schoolId":"school-kantipur"');
  });
});
