import type {
  FamilyCategory,
  FamilyChannel,
  FamilyCommunicationsState,
  FamilyLocale,
  FamilyOutboundMutation,
} from './family-communications-types.js';

const DEFAULT_NOW = '2026-06-07T08:00:00.000Z';

export function hydrateFamilyCommunicationsState(
  state: FamilyCommunicationsState,
): FamilyCommunicationsState {
  return {
    ...state,
    athletes: state.athletes.map((athlete) => ({ ...athlete })),
    notices: state.notices.map((notice) => ({ ...notice })),
    preferences: state.preferences.map((preference) => ({ ...preference })),
    threads: state.threads.map((thread) => ({ ...thread })),
    mutations: state.mutations.map((mutation) => ({ ...mutation })),
    moderation: state.moderation.map((record) => ({ ...record })),
    sync: { ...state.sync },
  };
}

export function updateFamilyPreference(
  state: FamilyCommunicationsState,
  input: {
    mutationId: string;
    channel: FamilyChannel;
    category: FamilyCategory;
    enabled: boolean;
    locale: FamilyLocale;
  },
  updatedAt = DEFAULT_NOW,
): FamilyCommunicationsState {
  if (state.mutations.some((mutation) => mutation.mutationId === input.mutationId)) {
    return state;
  }

  const nextPreference = {
    channel: input.channel,
    category: input.category,
    enabled: input.enabled,
    locale: input.locale,
  };
  const mutation = createMutation({
    mutationId: input.mutationId,
    mutationType: 'family_preference_update',
    payload: nextPreference,
    createdAt: updatedAt,
  });

  return {
    ...state,
    preferences: [
      nextPreference,
      ...state.preferences.filter(
        (preference) =>
          preference.channel !== input.channel || preference.category !== input.category,
      ),
    ],
    mutations: [...state.mutations, mutation],
  };
}

export function deliverableNotices(state: FamilyCommunicationsState) {
  return state.notices.filter((notice) => {
    if (notice.required) {
      return true;
    }
    const preference = state.preferences.find(
      (candidate) => candidate.channel === notice.channel && candidate.category === notice.category,
    );
    return preference?.enabled !== false;
  });
}

export function markNoticeRead(
  state: FamilyCommunicationsState,
  noticeId: string,
): FamilyCommunicationsState {
  return {
    ...state,
    notices: state.notices.map((notice) =>
      notice.id === noticeId ? { ...notice, status: 'read' } : notice,
    ),
  };
}

export function queueFamilyMessage(
  state: FamilyCommunicationsState,
  input: { mutationId: string; threadId: string; body: string },
  createdAt = DEFAULT_NOW,
): FamilyCommunicationsState {
  if (state.mutations.some((mutation) => mutation.mutationId === input.mutationId)) {
    return state;
  }
  const mutation = createMutation({
    mutationId: input.mutationId,
    mutationType: 'family_message_send',
    payload: { threadId: input.threadId, body: input.body },
    createdAt,
  });
  return { ...state, mutations: [...state.mutations, mutation] };
}

export function retainModerationRecord(
  state: FamilyCommunicationsState,
  input: { threadId: string; reason: string },
  retainedAt = DEFAULT_NOW,
): FamilyCommunicationsState {
  return {
    ...state,
    threads: state.threads.map((thread) =>
      thread.id === input.threadId
        ? { ...thread, status: 'moderated', retainedForReview: true }
        : thread,
    ),
    moderation: [
      { threadId: input.threadId, reason: input.reason, retainedAt },
      ...state.moderation.filter((record) => record.threadId !== input.threadId),
    ],
  };
}

export function markFamilyMutationSynced(
  state: FamilyCommunicationsState,
  mutationId: string,
  syncedAt = DEFAULT_NOW,
): FamilyCommunicationsState {
  return {
    ...state,
    mutations: state.mutations.map((mutation) =>
      mutation.mutationId === mutationId ? { ...mutation, status: 'synced', syncedAt } : mutation,
    ),
    sync: { ...state.sync, lastSyncAt: syncedAt },
  };
}

export function retryFamilyMutations(state: FamilyCommunicationsState) {
  return {
    state: {
      ...state,
      sync: { ...state.sync, retryCount: state.sync.retryCount + 1 },
    },
    mutations: state.mutations.filter((mutation) => mutation.status !== 'synced'),
  };
}

function createMutation(input: {
  mutationId: string;
  mutationType: FamilyOutboundMutation['mutationType'];
  payload: Record<string, unknown>;
  createdAt: string;
}): FamilyOutboundMutation {
  return {
    mutationId: input.mutationId,
    mutationType: input.mutationType,
    payload: input.payload,
    status: 'pending',
    createdAt: input.createdAt,
  };
}
