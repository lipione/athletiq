import type {
  MatchDayState,
  MatchEventDraft,
  MatchEventInput,
  MatchPacket,
  QrResourceType,
  QrScanResult,
  SyncMutation,
} from './match-day-types.js';

const DEFAULT_NOW = '2026-06-07T08:00:00.000Z';

function nowIso(now = DEFAULT_NOW) {
  return now;
}

export function createInitialMatchDayState(): MatchDayState {
  return {
    session: { secureStorage: 'empty' },
    scans: [],
    localCheckIns: [],
    matchEvents: [],
    mutations: [],
    conflicts: [],
    sync: { retryCount: 0 },
  };
}

export function storeToken(
  state: MatchDayState,
  input: { token: string; userId: string; role: NonNullable<MatchDayState['session']['role']> },
): MatchDayState {
  return {
    ...state,
    session: {
      token: input.token,
      userId: input.userId,
      role: input.role,
      secureStorage: 'stored',
    },
  };
}

export function logout(state: MatchDayState): MatchDayState {
  return {
    session: { secureStorage: 'empty' },
    scans: [],
    localCheckIns: state.localCheckIns,
    matchEvents: [],
    mutations: state.mutations,
    conflicts: state.conflicts,
    sync: state.sync,
  };
}

export function downloadMatchPacket(state: MatchDayState, packet: MatchPacket): MatchDayState {
  return {
    ...state,
    activePacket: packet,
  };
}

export function classifyQrPayload(raw: string, scannedAt = DEFAULT_NOW): QrScanResult {
  const jsonResult = classifyJsonPayload(raw, scannedAt);
  if (jsonResult) {
    return jsonResult;
  }

  const [typePart, resourceId] = raw.split(':');
  const type = normalizeQrType(typePart);

  if (type === 'unknown' || !resourceId) {
    return {
      raw,
      type: 'unknown',
      scannedAt,
      label: 'Unknown QR payload',
    };
  }

  return {
    raw,
    type,
    resourceId,
    scannedAt,
    label: `${type} ${resourceId}`,
  };
}

export function recordCheckIn(state: MatchDayState, scan: QrScanResult): MatchDayState {
  if (!state.activePacket || !scan.resourceId) {
    return { ...state, scans: [scan, ...state.scans] };
  }

  const packet = state.activePacket;
  const nextPacket: MatchPacket = {
    ...packet,
    homeTeam:
      scan.resourceId === packet.homeTeam.id || scan.resourceId === `team-${packet.homeTeam.id}`
        ? { ...packet.homeTeam, checkedIn: true }
        : markAthleteCheckedIn(packet.homeTeam, scan.resourceId),
    awayTeam:
      scan.resourceId === packet.awayTeam.id || scan.resourceId === `team-${packet.awayTeam.id}`
        ? { ...packet.awayTeam, checkedIn: true }
        : markAthleteCheckedIn(packet.awayTeam, scan.resourceId),
  };

  return {
    ...state,
    activePacket: nextPacket,
    scans: [scan, ...state.scans],
    localCheckIns: [
      {
        scan,
        retainedLocally: true,
        reason: 'Team check-in sync requires a backend team check-in endpoint.',
      },
      ...state.localCheckIns,
    ],
  };
}

export function recordMatchEvent(
  state: MatchDayState,
  input: MatchEventInput,
  recordedAt = DEFAULT_NOW,
): MatchDayState {
  if (state.mutations.some((mutation) => mutation.mutationId === input.mutationId)) {
    return state;
  }

  const draft: MatchEventDraft = {
    localId: input.mutationId,
    matchId: input.matchId,
    teamId: input.teamId,
    athleteId: input.athleteId,
    type: input.type,
    minute: input.minute,
    recordedAt,
    ...(input.quantity ? { quantity: input.quantity } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };

  const mutation = createMutation({
    mutationId: input.mutationId,
    mutationType: 'match_event_submit',
    payload: {
      matchId: input.matchId,
      event: {
        athleteId: input.athleteId,
        teamId: input.teamId,
        type: input.type,
        minute: input.minute,
        ...(input.quantity ? { quantity: input.quantity } : {}),
        ...(input.notes ? { details: input.notes } : {}),
      },
    },
    createdAt: recordedAt,
  });

  return {
    ...state,
    matchEvents: [...state.matchEvents, draft],
    mutations: [...state.mutations, mutation],
  };
}

export function markMutationSynced(
  state: MatchDayState,
  mutationId: string,
  serverId: string,
  syncedAt = DEFAULT_NOW,
): MatchDayState {
  return {
    ...state,
    mutations: state.mutations.map((mutation) =>
      mutation.mutationId === mutationId
        ? {
            ...mutation,
            status: 'synced',
            serverId,
            syncedAt,
          }
        : mutation,
    ),
    sync: {
      ...state.sync,
      lastSyncAt: syncedAt,
    },
  };
}

export function markMutationConflict(
  state: MatchDayState,
  mutationId: string,
  reason: string,
  serverSnapshot: Record<string, unknown>,
  retainedAt = DEFAULT_NOW,
): MatchDayState {
  const mutation = state.mutations.find((candidate) => candidate.mutationId === mutationId);
  if (!mutation) {
    return state;
  }

  const nextConflict = {
    mutationId,
    reason,
    clientSnapshot: mutation.payload,
    serverSnapshot,
    retainedAt,
  };

  return {
    ...state,
    mutations: state.mutations.map((candidate) =>
      candidate.mutationId === mutationId
        ? { ...candidate, status: 'conflict', errorReason: reason }
        : candidate,
    ),
    conflicts: [
      nextConflict,
      ...state.conflicts.filter((conflict) => conflict.mutationId !== mutationId),
    ],
  };
}

export function retryPendingMutations(state: MatchDayState): {
  state: MatchDayState;
  mutations: SyncMutation[];
} {
  const mutations = state.mutations.filter((mutation) => mutation.status !== 'synced');

  return {
    state: {
      ...state,
      sync: {
        ...state.sync,
        retryCount: state.sync.retryCount + 1,
      },
    },
    mutations,
  };
}

function createMutation(input: {
  mutationId: string;
  mutationType: SyncMutation['mutationType'];
  payload: Record<string, unknown>;
  createdAt?: string;
}): SyncMutation {
  return {
    mutationId: input.mutationId,
    mutationType: input.mutationType,
    payload: input.payload,
    status: 'pending',
    createdAt: nowIso(input.createdAt),
  };
}

function markAthleteCheckedIn(
  team: MatchPacket['homeTeam'],
  resourceId: string,
): MatchPacket['homeTeam'] {
  return {
    ...team,
    athletes: team.athletes.map((athlete) =>
      athlete.id === resourceId ? { ...athlete, checkedIn: true } : athlete,
    ),
  };
}

function normalizeQrType(type: string | undefined): QrResourceType {
  if (
    type === 'athlete' ||
    type === 'team' ||
    type === 'match' ||
    type === 'check-in' ||
    type === 'venue'
  ) {
    return type;
  }

  return 'unknown';
}

function classifyJsonPayload(raw: string, scannedAt: string): QrScanResult | undefined {
  try {
    const parsed = JSON.parse(raw) as Partial<{
      type: string;
      resourceId: string;
      id: string;
      label: string;
    }>;
    const type = normalizeQrType(parsed.type);
    const resourceId = parsed.resourceId ?? parsed.id;

    if (type === 'unknown' || !resourceId) {
      return undefined;
    }

    return {
      raw,
      type,
      resourceId,
      scannedAt,
      label: parsed.label ?? `${type} ${resourceId}`,
    };
  } catch {
    return undefined;
  }
}
