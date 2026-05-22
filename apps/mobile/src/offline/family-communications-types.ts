export type FamilyChannel = 'email' | 'sms' | 'push' | 'in_app';
export type FamilyCategory =
  | 'schedule'
  | 'verification'
  | 'announcement'
  | 'match_update'
  | 'compliance'
  | 'thread';
export type FamilyLocale = 'en' | 'ne';
export type FamilyMutationStatus = 'pending' | 'synced' | 'conflict';

export type FamilyAthlete = {
  id: string;
  fullName: string;
  athletiqId: string;
  schoolName: string;
  relationship: string;
  nextAction: string;
};

export type FamilyNotice = {
  id: string;
  athleteId?: string;
  title: string;
  body: string;
  category: FamilyCategory;
  required: boolean;
  channel: FamilyChannel;
  locale: FamilyLocale;
  status: 'unread' | 'read';
};

export type FamilyPreference = {
  channel: FamilyChannel;
  category: FamilyCategory;
  enabled: boolean;
  locale: FamilyLocale;
};

export type FamilyThread = {
  id: string;
  title: string;
  schoolName: string;
  status: 'open' | 'moderated' | 'locked';
  latestMessage: string;
  retainedForReview: boolean;
};

export type FamilyOutboundMutation = {
  mutationId: string;
  mutationType: 'family_message_send' | 'family_preference_update';
  payload: Record<string, unknown>;
  status: FamilyMutationStatus;
  createdAt: string;
  syncedAt?: string;
  errorReason?: string;
};

export type FamilyModerationRecord = {
  threadId: string;
  reason: string;
  retainedAt: string;
};

export type FamilyCommunicationsState = {
  guardianUserId: string;
  athletes: FamilyAthlete[];
  notices: FamilyNotice[];
  preferences: FamilyPreference[];
  threads: FamilyThread[];
  mutations: FamilyOutboundMutation[];
  moderation: FamilyModerationRecord[];
  sync: {
    retryCount: number;
    lastSyncAt?: string;
  };
};
