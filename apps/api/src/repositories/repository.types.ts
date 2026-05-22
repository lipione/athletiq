import type {
  AuditRecord,
  AthleteRecord,
  AuthenticatedUser,
  AnnouncementRecord,
  BracketFormat,
  BracketView,
  CommunicationCategory,
  CommunicationChannel,
  CommunicationLocale,
  CommunicationNotificationRecord,
  CommunicationPriority,
  CommunicationTemplateRecord,
  ConversationThreadRecord,
  DiscountCodeRecord,
  DocumentDuplicateCandidateRecord,
  DocumentExpiryRunResult,
  DocumentExtractionRecord,
  DocumentReviewAction,
  DocumentReviewFlagRecord,
  DocumentReviewLinkRecord,
  DocumentReviewQueueItem,
  DocumentReviewResult,
  ExtractedIdentityFields,
  FinanceReportRecord,
  FacilityRecord,
  FamilyDashboardRecord,
  AvailabilityResourceType,
  AvailabilityStatus,
  AvailabilityWindowRecord,
  IdentityDocumentRecord,
  IdentityDocumentStatus,
  IdentityDocumentType,
  InvoiceRecord,
  MembershipPlanRecord,
  MatchScheduleRecord,
  MatchDerivedStats,
  MatchEventRecord,
  MatchEventType,
  MatchRecord,
  MatchReport,
  OfficialAssignmentRecord,
  OfficialPayoutExportRecord,
  OfficialProfileRecord,
  GuardianConsentRecord,
  GuardianAthleteLinkRecord,
  MessageModerationActionRecord,
  NotificationDeliveryRecord,
  NotificationPreferenceRecord,
  PaymentRecord,
  PublicBracketView,
  QrCodeRecord,
  RefundRecord,
  ScheduleNotificationRecord,
  SchoolRecord,
  SchoolMembershipRecord,
  SearchResults,
  SyncMutationRecord,
  TournamentAthleteStat,
  TournamentFormat,
  TournamentRecord,
  TournamentTeamRecord,
  UserRecord,
  TournamentWaiverRequirementRecord,
  VenueUnitRecord,
  VenueUnitStatus,
  VenueUnitType,
  WaiverSignatureRecord,
  WaiverTemplateRecord,
  ThreadMessageRecord,
} from '../common/store.js';
import type { UserRole } from '../common/roles.js';

export type RefreshSessionRecord = {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  rotatedFromSessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');
export const SCHOOL_REPOSITORY = Symbol('SCHOOL_REPOSITORY');
export const ATHLETE_REPOSITORY = Symbol('ATHLETE_REPOSITORY');
export const TOURNAMENT_REPOSITORY = Symbol('TOURNAMENT_REPOSITORY');
export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');
export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');
export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');
export const BILLING_REPOSITORY = Symbol('BILLING_REPOSITORY');
export const BRACKET_REPOSITORY = Symbol('BRACKET_REPOSITORY');
export const SCHEDULING_REPOSITORY = Symbol('SCHEDULING_REPOSITORY');
export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
export const QR_REPOSITORY = Symbol('QR_REPOSITORY');
export const SYNC_REPOSITORY = Symbol('SYNC_REPOSITORY');
export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');
export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY');
export const WAIVER_REPOSITORY = Symbol('WAIVER_REPOSITORY');
export const COMMUNICATION_REPOSITORY = Symbol('COMMUNICATION_REPOSITORY');

export type UserRepositoryToken = typeof USER_REPOSITORY;
export type AuthSessionRepositoryToken = typeof AUTH_SESSION_REPOSITORY;
export type SchoolRepositoryToken = typeof SCHOOL_REPOSITORY;
export type AthleteRepositoryToken = typeof ATHLETE_REPOSITORY;
export type TournamentRepositoryToken = typeof TOURNAMENT_REPOSITORY;
export type TeamRepositoryToken = typeof TEAM_REPOSITORY;
export type MatchRepositoryToken = typeof MATCH_REPOSITORY;
export type AuditRepositoryToken = typeof AUDIT_REPOSITORY;
export type BillingRepositoryToken = typeof BILLING_REPOSITORY;
export type BracketRepositoryToken = typeof BRACKET_REPOSITORY;
export type DocumentRepositoryToken = typeof DOCUMENT_REPOSITORY;
export type QrRepositoryToken = typeof QR_REPOSITORY;
export type SyncRepositoryToken = typeof SYNC_REPOSITORY;
export type SearchRepositoryToken = typeof SEARCH_REPOSITORY;
export type AnalyticsRepositoryToken = typeof ANALYTICS_REPOSITORY;
export type WaiverRepositoryToken = typeof WAIVER_REPOSITORY;
export type CommunicationRepositoryToken = typeof COMMUNICATION_REPOSITORY;

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  roles: UserRole[];
  schoolIds?: string[];
};

export interface UserRepository {
  create(input: CreateUserInput): Promise<UserRecord>;
  findById(userId: string): Promise<UserRecord | undefined>;
  findByEmail(email: string): Promise<UserRecord | undefined>;
  updatePassword(userId: string, passwordHash: string): Promise<UserRecord>;
}

export type CreateRefreshSessionInput = {
  userId: string;
  tenantId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
};

export type RotateRefreshSessionInput = CreateRefreshSessionInput & {
  currentSessionId: string;
};

export interface AuthSessionRepository {
  createRefreshSession(input: CreateRefreshSessionInput): Promise<RefreshSessionRecord>;
  findRefreshSessionByTokenHash(tokenHash: string): Promise<RefreshSessionRecord | undefined>;
  rotateRefreshSession(input: RotateRefreshSessionInput): Promise<RefreshSessionRecord>;
  revokeRefreshSession(sessionId: string, actorUserId?: string): Promise<RefreshSessionRecord>;
}

export type CreateSchoolInput = {
  actor: AuthenticatedUser;
  name: string;
  location?: string;
};

export type SchoolInviteResult = {
  email: string;
  userId: string;
  role: UserRole;
  schoolId: string;
  requiresPasswordSetup?: boolean;
};

export interface SchoolRepository {
  create(input: CreateSchoolInput): Promise<SchoolRecord>;
  approve(actor: AuthenticatedUser, schoolId: string): Promise<SchoolRecord>;
  inviteUser(
    actor: AuthenticatedUser,
    schoolId: string,
    email: string,
    role?: UserRole,
  ): Promise<SchoolInviteResult>;
  list(): Promise<SchoolRecord[]>;
}

export type CreateAthleteDraftInput = {
  schoolId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
};

export type AthleteWithVerifiedStats = AthleteRecord & {
  verifiedTournamentStats: TournamentAthleteStat[];
};

export type PublicAthleteProfile = {
  type: 'athlete';
  athleteId: string;
  fullName: string;
  athletiqId: string | null;
  schoolId: string;
  publicProfileStatus: 'private' | 'public';
};

export type GuardianConsentInput = {
  guardianName: string;
  relationship: string;
  consentType?: string;
};

export interface AthleteRepository {
  createDraft(actor: AuthenticatedUser, input: CreateAthleteDraftInput): Promise<AthleteRecord>;
  approveIdentity(actor: AuthenticatedUser, athleteId: string): Promise<AthleteRecord>;
  findById(athleteId: string): Promise<AthleteRecord | undefined>;
  findWithVerifiedStats(athleteId: string): Promise<AthleteWithVerifiedStats | undefined>;
  recordGuardianConsent(
    actor: AuthenticatedUser,
    athleteId: string,
    input: GuardianConsentInput,
  ): Promise<GuardianConsentRecord>;
  setPublicProfileStatus(
    actor: AuthenticatedUser,
    athleteId: string,
    status: 'private' | 'public',
  ): Promise<AthleteRecord>;
  getPublicProfile(athleteId: string): Promise<PublicAthleteProfile | undefined>;
  list(): Promise<AthleteRecord[]>;
  listIds(): Promise<string[]>;
}

export type CreateTournamentInput = {
  actor: AuthenticatedUser;
  name: string;
  sport: string;
  format: TournamentFormat;
  maxTeams?: number;
  season?: string;
};

export type TournamentRegistrationResult = TournamentRecord & {
  exists: boolean;
};

export type TournamentLeaderboard = {
  tournamentId: string;
  leaderboard: TournamentAthleteStat[];
  totalEntries: number;
};

export interface TournamentRepository {
  create(input: CreateTournamentInput): Promise<TournamentRecord>;
  approve(actor: AuthenticatedUser, tournamentId: string): Promise<TournamentRecord>;
  registerSchool(
    actor: AuthenticatedUser,
    tournamentId: string,
    schoolId: string,
  ): Promise<TournamentRegistrationResult>;
  findById(tournamentId: string): Promise<TournamentRecord | undefined>;
  list(): Promise<TournamentRecord[]>;
  getLeaderboard(tournamentId: string, limit?: number): Promise<TournamentLeaderboard>;
}

export type CreateTeamInput = {
  actor: AuthenticatedUser;
  tournamentId: string;
  schoolId: string;
  name: string;
  athleteIds: string[];
  coachUserId?: string;
};

export interface TeamRepository {
  create(input: CreateTeamInput): Promise<TournamentTeamRecord>;
  approve(actor: AuthenticatedUser, teamId: string): Promise<TournamentTeamRecord>;
  findById(teamId: string): Promise<TournamentTeamRecord | undefined>;
  list(tournamentId?: string, schoolId?: string): Promise<TournamentTeamRecord[]>;
}

export type CreateMatchInput = {
  actor: AuthenticatedUser;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
};

export type CreateMatchEventInput = {
  athleteId: string;
  teamId: string;
  type: MatchEventType;
  minute?: number;
  details?: string;
  quantity?: number;
};

export type CorrectMatchEventInput = CreateMatchEventInput & {
  reason?: string;
};

export interface MatchRepository {
  create(input: CreateMatchInput): Promise<MatchRecord>;
  submitResult(
    actor: AuthenticatedUser,
    matchId: string,
    report: MatchReport,
  ): Promise<MatchRecord>;
  verify(actor: AuthenticatedUser, matchId: string): Promise<MatchRecord>;
  submitEvent(
    actor: AuthenticatedUser,
    matchId: string,
    input: CreateMatchEventInput,
  ): Promise<MatchEventRecord>;
  correctEvent(
    actor: AuthenticatedUser,
    matchId: string,
    eventId: string,
    input: CorrectMatchEventInput,
  ): Promise<MatchEventRecord>;
  findById(matchId: string): Promise<MatchRecord | undefined>;
  list(tournamentId?: string): Promise<MatchRecord[]>;
  listEvents(matchId: string): Promise<MatchEventRecord[]>;
  getDerivedStats(matchId: string): Promise<MatchDerivedStats | undefined>;
}

export interface AuditRepository {
  list(): Promise<AuditRecord[]>;
  record(input: {
    tenantId: string;
    actorUserId: string;
    action: string;
    resource: string;
    resourceId: string;
    metadata: Record<string, string | number | null | boolean>;
  }): Promise<AuditRecord>;
}

export type CreateFacilityInput = {
  name: string;
  location: string;
  timezone?: string;
};

export type CreateVenueUnitInput = {
  name: string;
  unitType: VenueUnitType;
  sports: string[];
  status?: VenueUnitStatus;
};

export type CreateAvailabilityInput = {
  resourceType: AvailabilityResourceType;
  resourceId: string;
  tournamentId?: string;
  startsAt: string;
  endsAt: string;
  status: AvailabilityStatus;
  reason?: string;
};

export type AvailabilityFilter = {
  resourceType?: AvailabilityResourceType;
  resourceId?: string;
  tournamentId?: string;
};

export type CreateOfficialProfileInput = {
  userId: string;
  displayName: string;
  sports: string[];
  certificationLevel?: string;
  homeSchoolId?: string;
  payoutRate?: number;
  payoutCurrency?: string;
};

export type GenerateScheduleInput = {
  venueUnitIds: string[];
  startsAt: string;
  slotMinutes: number;
  matchDurationMinutes: number;
  minRestMinutes?: number;
};

export type OverrideMatchScheduleInput = {
  venueUnitId: string;
  startsAt: string;
  endsAt: string;
  allowConflicts?: boolean;
  reason?: string;
};

export type AssignOfficialInput = {
  officialProfileId: string;
  role: OfficialAssignmentRecord['role'];
};

export type RespondAssignmentInput = {
  status: 'accepted' | 'declined';
};

export interface SchedulingRepository {
  createFacility(actor: AuthenticatedUser, input: CreateFacilityInput): Promise<FacilityRecord>;
  createVenueUnit(
    actor: AuthenticatedUser,
    facilityId: string,
    input: CreateVenueUnitInput,
  ): Promise<VenueUnitRecord>;
  listFacilities(): Promise<{ facilities: FacilityRecord[]; venueUnits: VenueUnitRecord[] }>;
  createAvailability(
    actor: AuthenticatedUser,
    input: CreateAvailabilityInput,
  ): Promise<AvailabilityWindowRecord>;
  listAvailability(filter: AvailabilityFilter): Promise<{ windows: AvailabilityWindowRecord[] }>;
  createOfficialProfile(
    actor: AuthenticatedUser,
    input: CreateOfficialProfileInput,
  ): Promise<OfficialProfileRecord>;
  listOfficialProfiles(): Promise<{ officials: OfficialProfileRecord[] }>;
  generateSchedule(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: GenerateScheduleInput,
  ): Promise<{ schedules: MatchScheduleRecord[] }>;
  overrideMatchSchedule(
    actor: AuthenticatedUser,
    matchId: string,
    input: OverrideMatchScheduleInput,
  ): Promise<MatchScheduleRecord>;
  listTournamentSchedule(
    actor: AuthenticatedUser,
    tournamentId: string,
  ): Promise<{ schedules: MatchScheduleRecord[]; assignments: OfficialAssignmentRecord[] }>;
  publishSchedule(
    actor: AuthenticatedUser,
    tournamentId: string,
  ): Promise<{ schedules: MatchScheduleRecord[]; notifications: ScheduleNotificationRecord[] }>;
  unpublishSchedule(
    actor: AuthenticatedUser,
    tournamentId: string,
  ): Promise<{ schedules: MatchScheduleRecord[] }>;
  assignOfficial(
    actor: AuthenticatedUser,
    matchId: string,
    input: AssignOfficialInput,
  ): Promise<OfficialAssignmentRecord>;
  respondToAssignment(
    actor: AuthenticatedUser,
    assignmentId: string,
    input: RespondAssignmentInput,
  ): Promise<OfficialAssignmentRecord>;
  checkInAssignment(
    actor: AuthenticatedUser,
    assignmentId: string,
  ): Promise<OfficialAssignmentRecord>;
  listNotifications(
    actor: AuthenticatedUser,
  ): Promise<{ notifications: ScheduleNotificationRecord[] }>;
  exportOfficialPayouts(
    actor: AuthenticatedUser,
    tournamentId: string,
  ): Promise<{ exports: OfficialPayoutExportRecord[] }>;
}

export type LinkGuardianInput = {
  guardianUserId: string;
  athleteId: string;
  relationship: string;
};

export type CreateAnnouncementInput = {
  title: string;
  body: string;
  category: CommunicationCategory;
  priority?: CommunicationPriority;
  locale?: CommunicationLocale;
  schoolIds?: string[];
  teamIds?: string[];
  role?: UserRole;
};

export type UpsertNotificationPreferenceInput = {
  userId?: string;
  channel: CommunicationChannel;
  category: CommunicationCategory;
  enabled: boolean;
  locale?: CommunicationLocale;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

export type CreateCommunicationTemplateInput = {
  key: string;
  category: CommunicationCategory;
  required?: boolean;
  variants: Record<CommunicationLocale, { subject: string; body: string }>;
};

export type SendTemplateNotificationInput = {
  templateKey: string;
  recipientUserId: string;
  channel: CommunicationChannel;
  locale?: CommunicationLocale;
  variables?: Record<string, string>;
  resourceType?: string;
  resourceId?: string;
};

export type CreateConversationThreadInput = {
  title: string;
  schoolId: string;
  teamId?: string;
  athleteId?: string;
  participantUserIds: string[];
};

export interface CommunicationRepository {
  linkGuardian(
    actor: AuthenticatedUser,
    input: LinkGuardianInput,
  ): Promise<GuardianAthleteLinkRecord>;
  getFamilyDashboard(
    actor: AuthenticatedUser,
    guardianUserId?: string,
  ): Promise<FamilyDashboardRecord>;
  createAnnouncement(
    actor: AuthenticatedUser,
    input: CreateAnnouncementInput,
  ): Promise<AnnouncementRecord>;
  upsertPreference(
    actor: AuthenticatedUser,
    input: UpsertNotificationPreferenceInput,
  ): Promise<NotificationPreferenceRecord>;
  listPreferences(
    actor: AuthenticatedUser,
    userId?: string,
  ): Promise<{ preferences: NotificationPreferenceRecord[] }>;
  createTemplate(
    actor: AuthenticatedUser,
    input: CreateCommunicationTemplateInput,
  ): Promise<CommunicationTemplateRecord>;
  sendTemplateNotification(
    actor: AuthenticatedUser,
    input: SendTemplateNotificationInput,
  ): Promise<{
    notification: CommunicationNotificationRecord;
    delivery: NotificationDeliveryRecord;
  }>;
  listInbox(
    actor: AuthenticatedUser,
    userId?: string,
  ): Promise<{
    notifications: CommunicationNotificationRecord[];
    deliveries: NotificationDeliveryRecord[];
  }>;
  createThread(
    actor: AuthenticatedUser,
    input: CreateConversationThreadInput,
  ): Promise<ConversationThreadRecord>;
  postMessage(
    actor: AuthenticatedUser,
    threadId: string,
    body: string,
  ): Promise<ThreadMessageRecord>;
  hideMessage(
    actor: AuthenticatedUser,
    messageId: string,
    reason: string,
  ): Promise<{ message: ThreadMessageRecord; moderation: MessageModerationActionRecord }>;
  listThread(
    actor: AuthenticatedUser,
    threadId: string,
  ): Promise<{
    thread: ConversationThreadRecord;
    messages: ThreadMessageRecord[];
    moderationActions: MessageModerationActionRecord[];
  }>;
}

export type CreateMembershipPlanInput = {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  durationDays: number;
};

export type CreateDiscountCodeInput = {
  code: string;
  amount: number;
  currency: string;
};

export type PurchaseSchoolMembershipInput = {
  planId: string;
  discountCode?: string;
  installmentCount?: number;
};

export type ConfigureTournamentRegistrationFeeInput = {
  amount: number;
  currency: string;
  requiredBeforeApproval?: boolean;
};

export type CreateTournamentRegistrationInvoiceInput = {
  discountCode?: string;
  installmentCount?: number;
};

export type RecordManualPaymentInput = {
  amount: number;
  method: 'manual_cash' | 'manual_bank';
  reference?: string;
  notes?: string;
};

export type RefundPaymentInput = {
  amount: number;
  reason?: string;
};

export type FinanceReportInput = {
  schoolId?: string;
  tournamentId?: string;
  currency?: string;
};

export type SchoolMembershipPurchaseResult = {
  membership: SchoolMembershipRecord;
  invoice: InvoiceRecord;
};

export type ManualPaymentResult = {
  invoice: InvoiceRecord;
  payment: PaymentRecord;
  membership?: SchoolMembershipRecord;
};

export type PaymentRefundResult = {
  invoice: InvoiceRecord;
  payment: PaymentRecord;
  refund: RefundRecord;
};

export interface BillingRepository {
  createMembershipPlan(
    actor: AuthenticatedUser,
    input: CreateMembershipPlanInput,
  ): Promise<MembershipPlanRecord>;
  listMembershipPlans(): Promise<MembershipPlanRecord[]>;
  createDiscountCode(
    actor: AuthenticatedUser,
    input: CreateDiscountCodeInput,
  ): Promise<DiscountCodeRecord>;
  purchaseSchoolMembership(
    actor: AuthenticatedUser,
    schoolId: string,
    input: PurchaseSchoolMembershipInput,
  ): Promise<SchoolMembershipPurchaseResult>;
  configureTournamentRegistrationFee(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: ConfigureTournamentRegistrationFeeInput,
  ): Promise<TournamentRecord>;
  createTournamentRegistrationInvoice(
    actor: AuthenticatedUser,
    tournamentId: string,
    schoolId: string,
    input: CreateTournamentRegistrationInvoiceInput,
  ): Promise<InvoiceRecord>;
  ensureTournamentRegistrationPaymentSatisfied(
    tournamentId: string,
    schoolId: string,
  ): Promise<boolean>;
  recordManualPayment(
    actor: AuthenticatedUser,
    invoiceId: string,
    input: RecordManualPaymentInput,
  ): Promise<ManualPaymentResult>;
  refundPayment(
    actor: AuthenticatedUser,
    paymentId: string,
    input: RefundPaymentInput,
  ): Promise<PaymentRefundResult>;
  getFinanceReport(input: FinanceReportInput): Promise<FinanceReportRecord>;
}

export type BracketSeedInput = {
  teamId: string;
  seedNumber: number;
  groupKey?: string;
  locked?: boolean;
  withdrawn?: boolean;
};

export type CreateBracketInput = {
  format: BracketFormat;
  seeds: BracketSeedInput[];
};

export type UpdateBracketSeedsInput = {
  seeds: BracketSeedInput[];
};

export type RegenerateBracketInput = {
  createNewVersion?: boolean;
  seeds?: BracketSeedInput[];
  notes?: string;
};

export interface BracketRepository {
  createBracket(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: CreateBracketInput,
  ): Promise<BracketView>;
  updateSeeds(
    actor: AuthenticatedUser,
    bracketId: string,
    input: UpdateBracketSeedsInput,
  ): Promise<BracketView>;
  publishBracket(actor: AuthenticatedUser, bracketId: string): Promise<BracketView>;
  regenerateBracket(
    actor: AuthenticatedUser,
    bracketId: string,
    input: RegenerateBracketInput,
  ): Promise<BracketView>;
  getBracket(
    actor: AuthenticatedUser,
    bracketId: string,
    versionId?: string,
  ): Promise<BracketView | undefined>;
  getPublicBracket(slug: string): Promise<PublicBracketView | undefined>;
  listStandings(
    actor: AuthenticatedUser,
    bracketId: string,
    groupKey?: string,
  ): Promise<StandingRowsResult>;
  ensureMatchCanBeVerified(matchId: string): Promise<void>;
  verifyMatchAndAdvance(actor: AuthenticatedUser, matchId: string): Promise<MatchRecord>;
  advanceFromVerifiedMatch(
    actor: AuthenticatedUser,
    matchId: string,
  ): Promise<BracketView | undefined>;
}

export type StandingRowsResult = {
  rows: BracketView['standings'];
};

export type CreateWaiverTemplateInput = {
  name: string;
  body: string;
  version: string;
  expiresAfterDays?: number;
};

export type CreateTournamentWaiverRequirementInput = {
  waiverTemplateId: string;
};

export type SignWaiverInput = {
  waiverTemplateId: string;
  tournamentId?: string;
  athleteId: string;
  schoolId: string;
  guardianName: string;
  relationship: string;
  ipAddress: string;
  userAgent: string;
};

export type EnsureTournamentWaiversInput = {
  tournamentId: string;
  schoolId: string;
  athleteIds: string[];
};

export interface WaiverRepository {
  createWaiverTemplate(
    actor: AuthenticatedUser,
    input: CreateWaiverTemplateInput,
  ): Promise<WaiverTemplateRecord>;
  createTournamentWaiverRequirement(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: CreateTournamentWaiverRequirementInput,
  ): Promise<TournamentWaiverRequirementRecord>;
  signWaiver(actor: AuthenticatedUser, input: SignWaiverInput): Promise<WaiverSignatureRecord>;
  listWaiverSignatures(athleteId: string): Promise<WaiverSignatureRecord[]>;
  ensureTournamentWaiversSatisfied(input: EnsureTournamentWaiversInput): Promise<boolean>;
}

export type UploadIdentityDocumentInput = {
  id: string;
  athleteId: string;
  schoolId: string;
  documentType: IdentityDocumentType;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  sha256Hash: string;
  storageKey: string;
};

export type ExtractIdentityDocumentInput = {
  provider: DocumentExtractionRecord['provider'];
  extracted: ExtractedIdentityFields;
  fieldConfidence: Partial<Record<keyof ExtractedIdentityFields, number>>;
  confidence: number;
  reviewFlags: Array<{
    field: DocumentReviewFlagRecord['field'];
    severity: DocumentReviewFlagRecord['severity'];
    message: string;
  }>;
};

export type ExtractIdentityDocumentResult = {
  document: IdentityDocumentRecord;
  extraction: DocumentExtractionRecord;
  reviewFlags: DocumentReviewFlagRecord[];
  duplicateCandidates: DocumentDuplicateCandidateRecord[];
};

export type CreateDocumentReviewLinkInput = {
  tokenHash: string;
  expiresAt: string;
};

export type RecordDocumentReviewInput = {
  action: DocumentReviewAction;
  notes?: string;
  reason?: string;
  overrideReason?: string;
  correctedFields?: ExtractedIdentityFields;
};

export type ListDocumentReviewQueueInput = {
  schoolId?: string;
  status?: IdentityDocumentStatus;
};

export type ListExpiringDocumentsInput = {
  before: string;
  schoolId?: string;
};

export interface DocumentRepository {
  uploadDocument(
    actor: AuthenticatedUser,
    input: UploadIdentityDocumentInput,
  ): Promise<IdentityDocumentRecord>;
  findDocumentById(documentId: string): Promise<IdentityDocumentRecord | undefined>;
  extractDocument(
    actor: AuthenticatedUser,
    documentId: string,
    input: ExtractIdentityDocumentInput,
  ): Promise<ExtractIdentityDocumentResult>;
  createReviewLink(
    actor: AuthenticatedUser,
    documentId: string,
    input: CreateDocumentReviewLinkInput,
  ): Promise<DocumentReviewLinkRecord>;
  resolveReviewLink(actor: AuthenticatedUser, tokenHash: string): Promise<DocumentReviewQueueItem>;
  recordReview(
    actor: AuthenticatedUser,
    documentId: string,
    input: RecordDocumentReviewInput,
  ): Promise<DocumentReviewResult>;
  listReviewQueue(input: ListDocumentReviewQueueInput): Promise<DocumentReviewQueueItem[]>;
  listDuplicateCandidates(documentId: string): Promise<DocumentDuplicateCandidateRecord[]>;
  listExpiringDocuments(input: ListExpiringDocumentsInput): Promise<IdentityDocumentRecord[]>;
  runExpiryCheck(
    actor: AuthenticatedUser,
    input: { before: string },
  ): Promise<DocumentExpiryRunResult>;
}

export type QrResourceType = 'athlete' | 'match' | 'team';

export type PublicQrRecord = Pick<QrCodeRecord, 'code' | 'resourceType' | 'resourceId'>;

export type QrScanResult = {
  scanned: boolean;
  code: string;
};

export interface QrRepository {
  createCode(
    actor: AuthenticatedUser,
    resourceType: QrResourceType,
    resourceId: string,
  ): Promise<QrCodeRecord>;
  findPublicResource(
    resourceType: QrResourceType,
    code: string,
  ): Promise<PublicQrRecord | undefined>;
  recordScan(actor: AuthenticatedUser, code: string): Promise<QrScanResult>;
}

export type PushSyncMutationsInput = {
  actor: AuthenticatedUser;
  tenantId: string;
  clientId: string;
  mutations: Array<{
    id: string;
    mutationType: string;
    payload: Record<string, unknown>;
  }>;
};

export type PushSyncMutationsResult = {
  clientId: string;
  mutations: SyncMutationRecord[];
};

export interface SyncRepository {
  pushMutations(input: PushSyncMutationsInput): Promise<PushSyncMutationsResult>;
  listMutations(tenantId: string, clientId: string): Promise<SyncMutationRecord[]>;
}

export interface SearchRepository {
  search(query: string): Promise<SearchResults>;
}

export type FederationOverrideInput = {
  scope: string;
  targetId: string;
  field: string;
  reason?: string;
};

export type FederationOverrideResult = {
  ok: boolean;
  action: string;
  scope: string;
  targetId: string;
};

export interface AnalyticsRepository {
  listSchools(): Promise<SchoolRecord[]>;
  listTournaments(): Promise<TournamentRecord[]>;
  listTeams(tournamentId?: string, schoolId?: string): Promise<TournamentTeamRecord[]>;
  listAthletes(): Promise<AthleteRecord[]>;
  findTournamentById(tournamentId: string): Promise<TournamentRecord | undefined>;
  getTournamentLeaderboard(tournamentId: string, limit?: number): Promise<TournamentLeaderboard>;
  recordFederationOverride(
    actor: AuthenticatedUser,
    input: FederationOverrideInput,
  ): Promise<FederationOverrideResult>;
}
