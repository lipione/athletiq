export type MobileRole = 'school_admin' | 'coach' | 'referee';

export type MobileSession = {
  token?: string;
  userId?: string;
  role?: MobileRole;
  secureStorage: 'empty' | 'stored';
};

export type PacketAthlete = {
  id: string;
  fullName: string;
  athletiqId: string;
  documentStatus: 'verified' | 'review' | 'missing';
  checkedIn: boolean;
};

export type PacketTeam = {
  id: string;
  name: string;
  schoolName: string;
  athletes: PacketAthlete[];
  checkedIn: boolean;
};

export type MatchOfficial = {
  id: string;
  name: string;
  role: 'center_referee' | 'assistant_referee' | 'scorer';
  accepted: boolean;
  checkedIn: boolean;
};

export type MatchPacket = {
  packetId: string;
  matchId: string;
  tournamentId: string;
  title: string;
  venue: string;
  startsAt: string;
  homeTeam: PacketTeam;
  awayTeam: PacketTeam;
  officials: MatchOfficial[];
  downloadedAt: string;
};

export type QrResourceType = 'athlete' | 'team' | 'match' | 'check-in' | 'venue' | 'unknown';

export type QrScanResult = {
  raw: string;
  type: QrResourceType;
  resourceId?: string;
  scannedAt: string;
  label: string;
};

export type MatchEventInput = {
  mutationId: string;
  matchId: string;
  teamId: string;
  athleteId: string;
  type: 'goal' | 'assist' | 'foul' | 'yellow_card' | 'red_card' | 'own_goal';
  minute: number;
  quantity?: number;
  notes?: string;
};

export type MatchEventDraft = Omit<MatchEventInput, 'mutationId'> & {
  localId: string;
  recordedAt: string;
};

export type SyncMutationStatus = 'pending' | 'synced' | 'conflict';

export type SyncMutation = {
  mutationId: string;
  mutationType: 'match_event_submit' | 'match_event_correct';
  payload: Record<string, unknown>;
  status: SyncMutationStatus;
  createdAt: string;
  syncedAt?: string;
  serverId?: string;
  errorReason?: string;
};

export type LocalCheckInRecord = {
  scan: QrScanResult;
  retainedLocally: true;
  reason: string;
};

export type ConflictRecord = {
  mutationId: string;
  reason: string;
  clientSnapshot: Record<string, unknown>;
  serverSnapshot: Record<string, unknown>;
  retainedAt: string;
};

export type MatchDayState = {
  session: MobileSession;
  activePacket?: MatchPacket;
  scans: QrScanResult[];
  localCheckIns: LocalCheckInRecord[];
  matchEvents: MatchEventDraft[];
  mutations: SyncMutation[];
  conflicts: ConflictRecord[];
  sync: {
    lastSyncAt?: string;
    retryCount: number;
  };
};
