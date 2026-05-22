import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserRole } from './roles.js';
import type {
  BracketSeedInput,
  CreateBracketInput,
  CreateRefreshSessionInput,
  RegenerateBracketInput,
  RefreshSessionRecord,
  RotateRefreshSessionInput,
  UpdateBracketSeedsInput,
} from '../repositories/repository.types.js';
import {
  calculateStandings,
  generateDoubleEliminationNodes,
  generateGroupStageNodes,
  generateSingleEliminationNodes,
} from '../brackets/bracket-engine.js';
import { addMinutes, minutesBetween, overlaps } from '../scheduling/scheduling-engine.js';

type TournamentStatus = 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
export type TournamentFormat =
  | 'knockout'
  | 'round_robin'
  | 'double_elimination'
  | 'group_stages'
  | 'league';
type TournamentTeamStatus = 'pending' | 'approved';
type MatchStatus = 'scheduled' | 'played' | 'verified' | 'disputed';
export type VenueUnitType = 'field' | 'court' | 'lane' | 'room';
export type VenueUnitStatus = 'active' | 'maintenance' | 'inactive';
export type AvailabilityResourceType = 'venue_unit' | 'school' | 'official';
export type AvailabilityStatus = 'available' | 'blackout';
export type MatchScheduleStatus = 'draft' | 'published' | 'unpublished';
export type OfficialAssignmentStatus = 'proposed' | 'accepted' | 'declined' | 'checked_in';
export type NotificationStatus = 'pending' | 'read';
export type PayoutExportStatus = 'draft' | 'exported' | 'reconciled';
type InvoiceStatus = 'open' | 'paid' | 'refunded' | 'void';
type InvoiceEntityType = 'school_membership' | 'tournament_registration' | 'player_registration';
type PaymentMethod = 'manual_cash' | 'manual_bank';
type PaymentStatus = 'approved' | 'refunded';
type RefundStatus = 'approved';
type MembershipStatus = 'pending' | 'active' | 'expired' | 'cancelled';
type InstallmentStatus = 'open' | 'paid';
export type IdentityDocumentType =
  | 'birth_certificate'
  | 'citizenship'
  | 'school_id'
  | 'medical'
  | 'eligibility_form';
export type IdentityDocumentStatus =
  | 'uploaded'
  | 'review_required'
  | 'verified'
  | 'rejected'
  | 'correction_requested'
  | 'expired';
export type DocumentReviewAction = 'approve' | 'reject' | 'request_correction' | 'override';
type DocumentMalwareScanStatus = 'pending' | 'clean' | 'blocked';

export type MatchEventType = 'goal' | 'yellow_card' | 'red_card' | 'assist' | 'foul' | 'own_goal';
export type MatchEventStatus = 'active' | 'superseded';
type SyncMutationStatus = 'pending' | 'synced' | 'failed' | 'conflict';

type QrResourceType = 'athlete' | 'match' | 'team';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  schoolIds: string[];
  impersonatedBy?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  roles: UserRole[];
  schoolIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SchoolRecord {
  id: string;
  name: string;
  location?: string;
  status: 'pending' | 'approved';
  createdBy: string;
  approvedBy?: string;
  adminUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AthleteRecord {
  id: string;
  schoolId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  status: 'draft' | 'identity_approved';
  athletiqId?: string;
  createdBy: string;
  approvedBy?: string;
  publicProfileStatus?: 'private' | 'public';
  guardianConsentRequired?: boolean;
  guardianConsentGrantedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianConsentRecord {
  id: string;
  athleteId: string;
  schoolId: string;
  guardianName: string;
  relationship: string;
  consentType: string;
  grantedAt: string;
  revokedAt?: string;
  recordedBy: string;
  createdAt: string;
}

export type CommunicationChannel = 'email' | 'sms' | 'push' | 'in_app';
export type CommunicationCategory =
  | 'schedule'
  | 'verification'
  | 'announcement'
  | 'match_update'
  | 'compliance'
  | 'thread';
export type CommunicationLocale = 'en' | 'ne';
export type CommunicationPriority = 'normal' | 'urgent' | 'compliance';
export type CommunicationDeliveryStatus = 'queued' | 'sent' | 'suppressed' | 'failed';
export type ConversationThreadStatus = 'open' | 'locked' | 'archived';
export type ThreadMessageStatus = 'visible' | 'hidden';

export interface GuardianAthleteLinkRecord {
  id: string;
  guardianUserId: string;
  athleteId: string;
  schoolId: string;
  relationship: string;
  createdBy: string;
  createdAt: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  category: CommunicationCategory;
  priority: CommunicationPriority;
  locale: CommunicationLocale;
  target: {
    schoolIds: string[];
    teamIds: string[];
    role?: UserRole;
  };
  createdBy: string;
  createdAt: string;
}

export interface NotificationPreferenceRecord {
  id: string;
  userId: string;
  channel: CommunicationChannel;
  category: CommunicationCategory;
  enabled: boolean;
  locale: CommunicationLocale;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CommunicationTemplateRecord {
  id: string;
  key: string;
  category: CommunicationCategory;
  required: boolean;
  variants: Record<CommunicationLocale, { subject: string; body: string }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationNotificationRecord {
  id: string;
  recipientUserId: string;
  category: CommunicationCategory;
  channel: CommunicationChannel;
  locale: CommunicationLocale;
  subject: string;
  body: string;
  required: boolean;
  resourceType?: string;
  resourceId?: string;
  status: NotificationStatus;
  createdBy: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationDeliveryRecord {
  id: string;
  notificationId: string;
  channel: CommunicationChannel;
  provider: 'stub' | 'email' | 'sms' | 'push';
  status: CommunicationDeliveryStatus;
  attempt: number;
  error?: string;
  createdAt: string;
}

export interface ConversationThreadRecord {
  id: string;
  title: string;
  schoolId: string;
  teamId?: string;
  athleteId?: string;
  participantUserIds: string[];
  status: ConversationThreadStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadMessageRecord {
  id: string;
  threadId: string;
  authorUserId: string;
  body: string;
  status: ThreadMessageStatus;
  createdAt: string;
  hiddenAt?: string;
  hiddenBy?: string;
  moderationReason?: string;
}

export interface MessageModerationActionRecord {
  id: string;
  threadId: string;
  messageId: string;
  action: 'hide';
  reason: string;
  actedBy: string;
  actedAt: string;
}

export interface FamilyDashboardRecord {
  guardian: Pick<UserRecord, 'id' | 'email'>;
  athletes: Array<
    Pick<AthleteRecord, 'id' | 'fullName' | 'schoolId' | 'athletiqId' | 'status'> & {
      relationship: string;
    }
  >;
  notifications: CommunicationNotificationRecord[];
  announcements: AnnouncementRecord[];
  threads: ConversationThreadRecord[];
}

export interface TournamentRecord {
  id: string;
  name: string;
  sport: string;
  format: TournamentFormat;
  status: TournamentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  maxTeams?: number;
  approvedBy?: string;
  schoolIds: string[];
  teamIds: string[];
  matchIds: string[];
  season?: string;
  registrationFeeAmount?: number;
  registrationFeeCurrency?: string;
  registrationFeeRequiredBeforeApproval?: boolean;
}

export type AnalyticsReportStatus = 'draft' | 'approved' | 'rejected';

export interface AnalyticsReportSectionRecord {
  title: string;
  body: string;
  metrics: Record<string, string | number | boolean | null>;
}

export interface AnalyticsReportDraftRecord {
  id: string;
  reportType: 'federation_summary' | 'school_development' | 'data_quality';
  scope: string;
  locale: 'en' | 'ne';
  status: AnalyticsReportStatus;
  requiresApproval: boolean;
  sections: AnalyticsReportSectionRecord[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
}

export type ImportEntityType = 'athletes' | 'schools' | 'teams';
export type ImportStatus = 'previewed' | 'committed' | 'rolled_back';
export type PartnerApiKeyStatus = 'active' | 'revoked';
export type ExportBundleStatus = 'ready' | 'expired';
export type WebhookStatus = 'active' | 'paused';
export type WebhookDeliveryStatus = 'delivered' | 'failed';

export interface ImportErrorRecord {
  rowIndex: number;
  field: string;
  message: string;
}

export interface SpreadsheetImportRecord {
  id: string;
  sourceName: string;
  entityType: ImportEntityType;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportErrorRecord[];
  rows: Array<Record<string, string | number | boolean | null>>;
  committedRows?: number;
  committedBy?: string;
  committedAt?: string;
  rollbackReason?: string;
  rolledBackBy?: string;
  rolledBackAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerApiKeyRecord {
  id: string;
  partnerName: string;
  keyPrefix: string;
  secretHash: string;
  scopes: string[];
  status: PartnerApiKeyStatus;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface ExportBundleRecord {
  id: string;
  tournamentId: string;
  formats: string[];
  include: string[];
  status: ExportBundleStatus;
  downloadUrl: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}

export interface WebhookSubscriptionRecord {
  id: string;
  url: string;
  events: string[];
  secretLabel?: string;
  status: WebhookStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  webhookId: string;
  event: string;
  status: WebhookDeliveryStatus;
  attempt: number;
  responseCode: number;
  createdAt: string;
}

export interface MembershipPlanRecord {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolMembershipRecord {
  id: string;
  schoolId: string;
  planId: string;
  invoiceId: string;
  status: MembershipStatus;
  startsAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountCodeRecord {
  id: string;
  code: string;
  amount: number;
  currency: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceInstallmentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  dueAt?: string;
  status: InstallmentStatus;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  schoolId: string;
  entityType: InvoiceEntityType;
  entityId: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  refundedAmount: number;
  balanceAmount: number;
  currency: string;
  status: InvoiceStatus;
  discountCode?: string;
  installments: InvoiceInstallmentRecord[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  schoolId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: 'manual';
  reference?: string;
  notes?: string;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  invoiceId: string;
  schoolId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: RefundStatus;
  createdBy: string;
  createdAt: string;
}

export interface FinanceReportRecord {
  scope: 'platform' | 'school' | 'tournament';
  schoolId?: string;
  tournamentId?: string;
  currency: string;
  invoiceCount: number;
  paidAmount: number;
  refundedAmount: number;
  netAmount: number;
  outstandingAmount: number;
  payments: PaymentRecord[];
  refunds: RefundRecord[];
}

export interface WaiverTemplateRecord {
  id: string;
  name: string;
  body: string;
  version: string;
  expiresAfterDays?: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentWaiverRequirementRecord {
  id: string;
  tournamentId: string;
  waiverTemplateId: string;
  requiredFor: 'athlete';
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaiverSignatureRecord {
  id: string;
  waiverTemplateId: string;
  waiverTemplateVersion: string;
  tournamentId?: string;
  athleteId: string;
  schoolId: string;
  guardianName: string;
  relationship: string;
  signedBy: string;
  ipAddress: string;
  userAgent: string;
  signedAt: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ExtractedIdentityFields {
  fullName?: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  gender?: string;
  schoolName?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
}

export interface IdentityDocumentRecord {
  id: string;
  schoolId: string;
  athleteId: string;
  documentType: IdentityDocumentType;
  status: IdentityDocumentStatus;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  sha256Hash: string;
  storageKey: string;
  malwareScanStatus: DocumentMalwareScanStatus;
  uploadedBy: string;
  extractedAt?: string;
  reviewedBy?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  correctionRequestedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentExtractionRecord {
  id: string;
  documentId: string;
  schoolId: string;
  athleteId: string;
  provider: 'deterministic' | 'openai';
  extracted: ExtractedIdentityFields;
  fieldConfidence: Partial<Record<keyof ExtractedIdentityFields, number>>;
  confidence: number;
  createdBy: string;
  createdAt: string;
}

export interface DocumentReviewFlagRecord {
  id: string;
  documentId: string;
  extractionId: string;
  field: keyof ExtractedIdentityFields | 'document';
  severity: 'low' | 'medium' | 'high';
  message: string;
  createdAt: string;
}

export interface DocumentReviewRecord {
  id: string;
  documentId: string;
  schoolId: string;
  athleteId: string;
  action: DocumentReviewAction;
  notes?: string;
  reason?: string;
  overrideReason?: string;
  correctedFields?: ExtractedIdentityFields;
  reviewedBy: string;
  createdAt: string;
}

export interface DocumentReviewLinkRecord {
  id: string;
  documentId: string;
  tokenHash: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentDuplicateCandidateRecord {
  id: string;
  documentId: string;
  matchedDocumentId: string;
  matchedAthleteId: string;
  score: number;
  reasonCodes: string[];
  status: 'open' | 'dismissed';
  createdAt: string;
}

export interface DocumentReviewQueueItem {
  document: IdentityDocumentRecord;
  extraction?: DocumentExtractionRecord;
  reviewFlags: DocumentReviewFlagRecord[];
  duplicateCandidates: DocumentDuplicateCandidateRecord[];
}

export interface DocumentReviewResult {
  document: IdentityDocumentRecord;
  review: DocumentReviewRecord;
  athlete?: AthleteRecord;
}

export interface DocumentExpiryRunResult {
  before: string;
  expiredDocumentIds: string[];
}

export type BracketFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'league'
  | 'group_stage_knockout';
export type BracketStatus = 'draft' | 'published' | 'archived';
export type BracketNodeStatus = 'pending' | 'scheduled' | 'ready' | 'completed' | 'bye';
export type BracketSide = 'main' | 'winners' | 'losers' | 'placement' | 'group';

export interface BracketRecord {
  id: string;
  tournamentId: string;
  format: BracketFormat;
  status: BracketStatus;
  activeVersionId: string;
  publishedVersionId?: string;
  publicSlug?: string;
  createdBy: string;
  publishedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BracketVersionRecord {
  id: string;
  bracketId: string;
  versionNumber: number;
  status: BracketStatus;
  generationPolicy: 'initial' | 'regenerated' | 'published_snapshot';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface BracketSeedRecord {
  id: string;
  bracketId: string;
  versionId: string;
  teamId: string;
  seedNumber: number;
  groupKey?: string;
  locked: boolean;
  withdrawn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BracketNodeRecord {
  id: string;
  bracketId: string;
  versionId: string;
  matchId?: string;
  groupKey?: string;
  round: number;
  position: number;
  bracketSide: BracketSide;
  homeTeamId?: string;
  awayTeamId?: string;
  homeSeedNumber?: number;
  awaySeedNumber?: number;
  winnerTeamId?: string;
  loserTeamId?: string;
  sourceNodeIds: string[];
  nextNodeId?: string;
  loserNextNodeId?: string;
  isIfNecessary?: boolean;
  status: BracketNodeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StandingRowRecord {
  id: string;
  bracketId: string;
  versionId: string;
  groupKey: string;
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  disciplinaryPoints: number;
  headToHeadPoints: number;
  rank: number;
  updatedAt: string;
}

export interface BracketTeamSummary {
  id: string;
  name: string;
  schoolId: string;
}

export interface BracketView {
  bracket: BracketRecord;
  version: BracketVersionRecord;
  seeds: BracketSeedRecord[];
  nodes: BracketNodeRecord[];
  standings: StandingRowRecord[];
  teams: BracketTeamSummary[];
}

export interface PublicBracketView {
  bracket: {
    id: string;
    tournamentId: string;
    format: BracketFormat;
    status: BracketStatus;
    publicSlug: string;
  };
  version: {
    id: string;
    versionNumber: number;
  };
  seeds: Array<{
    teamId: string;
    seedNumber: number;
    groupKey?: string;
  }>;
  nodes: Array<{
    id: string;
    matchId?: string;
    groupKey?: string;
    round: number;
    position: number;
    bracketSide: BracketSide;
    homeTeamId?: string;
    awayTeamId?: string;
    winnerTeamId?: string;
    loserTeamId?: string;
    status: BracketNodeStatus;
    homeScore?: number;
    awayScore?: number;
  }>;
  standings: StandingRowRecord[];
  teams: BracketTeamSummary[];
}

export interface TournamentTeamRecord {
  id: string;
  tournamentId: string;
  schoolId: string;
  name: string;
  athleteIds: string[];
  coachUserId?: string;
  status: TournamentTeamStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchStats {
  [key: string]: string | number | boolean | null;
}

export interface MatchReport {
  homeScore: number;
  awayScore: number;
  sportStats?: MatchStats;
  notes?: string;
}

export interface MatchEventRecord {
  id: string;
  matchId: string;
  tournamentId: string;
  athleteId: string;
  teamId: string;
  type: MatchEventType;
  minute?: number;
  details?: string;
  quantity: number;
  status: MatchEventStatus;
  createdBy: string;
  createdAt: string;
  correctedBy?: string;
  correctedAt?: string;
  correctedFromEventId?: string;
  correctionReason?: string;
  reason?: string;
}

export interface MatchAthleteStat {
  athleteId: string;
  teamId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
  ownGoals: number;
}

export interface MatchTeamStat {
  teamId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
  ownGoals: number;
}

export interface MatchDerivedStats {
  matchId: string;
  tournamentId: string;
  totals: {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    fouls: number;
    ownGoals: number;
  };
  athleteStats: MatchAthleteStat[];
  teamStats: MatchTeamStat[];
}

export interface TournamentAthleteStat {
  athleteId: string;
  tournamentId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
  ownGoals: number;
}

export interface QrCodeRecord {
  code: string;
  resourceType: QrResourceType;
  resourceId: string;
  createdBy: string;
  createdAt: string;
}

export interface SyncMutationRecord {
  id: string;
  tenantId: string;
  clientId: string;
  actorUserId: string;
  status: SyncMutationStatus;
  mutationType: string;
  mutationPayload: Record<string, unknown>;
  errorReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRecord {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  status: MatchStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  homeScore?: number;
  awayScore?: number;
  report?: MatchStats;
  submittedBy?: string;
  submittedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface FacilityRecord {
  id: string;
  name: string;
  location: string;
  timezone: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueUnitRecord {
  id: string;
  facilityId: string;
  name: string;
  unitType: VenueUnitType;
  sports: string[];
  status: VenueUnitStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityWindowRecord {
  id: string;
  resourceType: AvailabilityResourceType;
  resourceId: string;
  tournamentId?: string;
  startsAt: string;
  endsAt: string;
  status: AvailabilityStatus;
  reason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficialProfileRecord {
  id: string;
  userId: string;
  displayName: string;
  sports: string[];
  certificationLevel?: string;
  homeSchoolId?: string;
  payoutRate?: number;
  payoutCurrency?: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchScheduleRecord {
  id: string;
  tournamentId: string;
  matchId: string;
  venueUnitId: string;
  startsAt: string;
  endsAt: string;
  status: MatchScheduleStatus;
  conflictWarnings: string[];
  overrideReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedBy?: string;
}

export interface OfficialAssignmentRecord {
  id: string;
  matchId: string;
  officialProfileId: string;
  role: 'referee' | 'assistant_referee' | 'scorer' | 'timekeeper';
  status: OfficialAssignmentStatus;
  assignedBy: string;
  assignedAt: string;
  respondedAt?: string;
  checkedInAt?: string;
  report?: string;
}

export interface ScheduleNotificationRecord {
  id: string;
  recipientUserId: string;
  tournamentId: string;
  resourceType: 'schedule' | 'official_assignment';
  resourceId: string;
  type: 'schedule_published' | 'assignment_created' | 'assignment_changed';
  message: string;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
}

export interface OfficialPayoutExportRecord {
  id: string;
  tournamentId: string;
  officialProfileId: string;
  assignmentIds: string[];
  amount: number;
  currency: string;
  status: PayoutExportStatus;
  createdBy: string;
  createdAt: string;
  reconciledAt?: string;
}

export interface SearchResults {
  schools: Array<{
    id: string;
    name: string;
    status: SchoolRecord['status'];
  }>;
  athletes: Array<{
    id: string;
    fullName: string;
    schoolId: string;
  }>;
  tournaments: Array<{
    id: string;
    name: string;
    sport: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    schoolId: string;
    tournamentId: string;
  }>;
  matches: Array<{
    id: string;
    tournamentId: string;
    homeTeamId: string;
    awayTeamId: string;
  }>;
}

export interface AuditRecord {
  id: string;
  actorUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata: Record<string, string | number | null | boolean>;
  createdAt: string;
}

const DEFAULT_USER_ID = 'usr_super_admin';

@Injectable()
export class AppDataStore {
  private users = new Map<string, UserRecord>();
  private schools = new Map<string, SchoolRecord>();
  private athletes = new Map<string, AthleteRecord>();
  private guardianConsents = new Map<string, GuardianConsentRecord>();
  private guardianAthleteLinks = new Map<string, GuardianAthleteLinkRecord>();
  private announcements = new Map<string, AnnouncementRecord>();
  private notificationPreferences = new Map<string, NotificationPreferenceRecord>();
  private communicationTemplates = new Map<string, CommunicationTemplateRecord>();
  private communicationNotifications = new Map<string, CommunicationNotificationRecord>();
  private notificationDeliveries = new Map<string, NotificationDeliveryRecord>();
  private conversationThreads = new Map<string, ConversationThreadRecord>();
  private threadMessages = new Map<string, ThreadMessageRecord>();
  private messageModerationActions = new Map<string, MessageModerationActionRecord>();
  private tournaments = new Map<string, TournamentRecord>();
  private membershipPlans = new Map<string, MembershipPlanRecord>();
  private schoolMemberships = new Map<string, SchoolMembershipRecord>();
  private discountCodes = new Map<string, DiscountCodeRecord>();
  private invoices = new Map<string, InvoiceRecord>();
  private payments = new Map<string, PaymentRecord>();
  private refunds = new Map<string, RefundRecord>();
  private waiverTemplates = new Map<string, WaiverTemplateRecord>();
  private tournamentWaiverRequirements = new Map<string, TournamentWaiverRequirementRecord>();
  private waiverSignatures = new Map<string, WaiverSignatureRecord>();
  private identityDocuments = new Map<string, IdentityDocumentRecord>();
  private documentExtractions = new Map<string, DocumentExtractionRecord>();
  private documentReviewFlags = new Map<string, DocumentReviewFlagRecord>();
  private documentReviews = new Map<string, DocumentReviewRecord>();
  private documentReviewLinks = new Map<string, DocumentReviewLinkRecord>();
  private documentDuplicateCandidates = new Map<string, DocumentDuplicateCandidateRecord>();
  private brackets = new Map<string, BracketRecord>();
  private bracketVersions = new Map<string, BracketVersionRecord>();
  private bracketSeeds = new Map<string, BracketSeedRecord>();
  private bracketNodes = new Map<string, BracketNodeRecord>();
  private standingRows = new Map<string, StandingRowRecord>();
  private facilities = new Map<string, FacilityRecord>();
  private venueUnits = new Map<string, VenueUnitRecord>();
  private availabilityWindows = new Map<string, AvailabilityWindowRecord>();
  private officialProfiles = new Map<string, OfficialProfileRecord>();
  private matchSchedules = new Map<string, MatchScheduleRecord>();
  private officialAssignments = new Map<string, OfficialAssignmentRecord>();
  private scheduleNotifications = new Map<string, ScheduleNotificationRecord>();
  private officialPayoutExports = new Map<string, OfficialPayoutExportRecord>();
  private analyticsReportDrafts = new Map<string, AnalyticsReportDraftRecord>();
  private spreadsheetImports = new Map<string, SpreadsheetImportRecord>();
  private partnerApiKeys = new Map<string, PartnerApiKeyRecord>();
  private exportBundles = new Map<string, ExportBundleRecord>();
  private webhookSubscriptions = new Map<string, WebhookSubscriptionRecord>();
  private webhookDeliveries = new Map<string, WebhookDeliveryRecord>();
  private teams = new Map<string, TournamentTeamRecord>();
  private matches = new Map<string, MatchRecord>();
  private matchEvents = new Map<string, MatchEventRecord>();
  private qrCodes = new Map<string, QrCodeRecord>();
  private syncMutations = new Map<string, SyncMutationRecord>();
  private refreshSessions = new Map<string, RefreshSessionRecord>();
  private auditLogs: AuditRecord[] = [];

  constructor() {
    this.seedDefaults();
  }

  async reset() {
    return this.withWrite(() => {
      this.users.clear();
      this.schools.clear();
      this.athletes.clear();
      this.guardianConsents.clear();
      this.guardianAthleteLinks.clear();
      this.announcements.clear();
      this.notificationPreferences.clear();
      this.communicationTemplates.clear();
      this.communicationNotifications.clear();
      this.notificationDeliveries.clear();
      this.conversationThreads.clear();
      this.threadMessages.clear();
      this.messageModerationActions.clear();
      this.tournaments.clear();
      this.membershipPlans.clear();
      this.schoolMemberships.clear();
      this.discountCodes.clear();
      this.invoices.clear();
      this.payments.clear();
      this.refunds.clear();
      this.waiverTemplates.clear();
      this.tournamentWaiverRequirements.clear();
      this.waiverSignatures.clear();
      this.identityDocuments.clear();
      this.documentExtractions.clear();
      this.documentReviewFlags.clear();
      this.documentReviews.clear();
      this.documentReviewLinks.clear();
      this.documentDuplicateCandidates.clear();
      this.brackets.clear();
      this.bracketVersions.clear();
      this.bracketSeeds.clear();
      this.bracketNodes.clear();
      this.standingRows.clear();
      this.facilities.clear();
      this.venueUnits.clear();
      this.availabilityWindows.clear();
      this.officialProfiles.clear();
      this.matchSchedules.clear();
      this.officialAssignments.clear();
      this.scheduleNotifications.clear();
      this.officialPayoutExports.clear();
      this.analyticsReportDrafts.clear();
      this.spreadsheetImports.clear();
      this.partnerApiKeys.clear();
      this.exportBundles.clear();
      this.webhookSubscriptions.clear();
      this.webhookDeliveries.clear();
      this.teams.clear();
      this.matches.clear();
      this.matchEvents.clear();
      this.qrCodes.clear();
      this.syncMutations.clear();
      this.refreshSessions.clear();
      this.auditLogs = [];
      this.seedDefaults();
      return true;
    });
  }

  listSchools() {
    return this.readOperation(() => {
      return [...this.schools.values()].map((school) => ({
        ...school,
        adminUserIds: [...school.adminUserIds],
      }));
    });
  }

  getUserById(userId: string) {
    return this.readOperation(() => {
      const found = this.users.get(userId);
      return found ? { ...found } : undefined;
    });
  }

  listUsers() {
    return this.readOperation(() => {
      return [...this.users.values()].map((user) => ({
        ...user,
        roles: [...user.roles],
        schoolIds: [...user.schoolIds],
      }));
    });
  }

  getUserByEmail(email: string) {
    return this.readOperation(() => {
      const found = [...this.users.values()].find((user) => user.email === email);
      return found ? { ...found } : undefined;
    });
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return this.withWrite(() => {
      this.assertSafeStoredPassword(passwordHash);
      const user = this.users.get(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const updated = {
        ...user,
        password: passwordHash,
        updatedAt: new Date().toISOString(),
      };
      this.users.set(userId, updated);
      return { ...updated, roles: [...updated.roles], schoolIds: [...updated.schoolIds] };
    });
  }

  createRefreshSession(params: CreateRefreshSessionInput) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const session: RefreshSessionRecord = {
        id: this.nextId('ses'),
        tenantId: params.tenantId,
        userId: params.userId,
        tokenHash: params.tokenHash,
        familyId: params.familyId,
        ...(params.userAgent ? { userAgent: params.userAgent } : {}),
        ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
        expiresAt: params.expiresAt.toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      this.refreshSessions.set(session.id, session);
      return { ...session };
    });
  }

  findRefreshSessionByTokenHash(tokenHash: string) {
    return this.readOperation(() => {
      const session = [...this.refreshSessions.values()].find(
        (candidate) => candidate.tokenHash === tokenHash,
      );
      return session ? { ...session } : undefined;
    });
  }

  rotateRefreshSession(params: RotateRefreshSessionInput) {
    return this.withWrite(() => {
      const current = this.refreshSessions.get(params.currentSessionId);
      if (!current) {
        throw new NotFoundException('Refresh session not found');
      }

      const now = new Date().toISOString();
      const revoked: RefreshSessionRecord = {
        ...current,
        revokedAt: current.revokedAt ?? now,
        updatedAt: now,
      };
      this.refreshSessions.set(revoked.id, revoked);

      const session: RefreshSessionRecord = {
        id: this.nextId('ses'),
        tenantId: params.tenantId,
        userId: params.userId,
        tokenHash: params.tokenHash,
        familyId: params.familyId,
        rotatedFromSessionId: current.id,
        ...(params.userAgent ? { userAgent: params.userAgent } : {}),
        ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
        expiresAt: params.expiresAt.toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      this.refreshSessions.set(session.id, session);
      return { ...session };
    });
  }

  revokeRefreshSession(sessionId: string) {
    return this.withWrite(() => {
      const session = this.refreshSessions.get(sessionId);
      if (!session) {
        throw new NotFoundException('Refresh session not found');
      }

      const now = new Date().toISOString();
      const revoked: RefreshSessionRecord = {
        ...session,
        revokedAt: session.revokedAt ?? now,
        updatedAt: now,
      };
      this.refreshSessions.set(sessionId, revoked);
      return { ...revoked };
    });
  }

  createUser(params: {
    email: string;
    passwordHash: string;
    roles: UserRole[];
    schoolIds?: string[];
  }) {
    return this.withWrite(() => {
      this.assertSafeStoredPassword(params.passwordHash);
      const existing = [...this.users.values()].find((user) => user.email === params.email);
      if (existing) {
        throw new BadRequestException('Email already exists');
      }

      const now = new Date().toISOString();
      const user: UserRecord = {
        id: this.nextId('usr'),
        email: params.email,
        password: params.passwordHash,
        roles: [...params.roles],
        schoolIds: [...(params.schoolIds ?? [])],
        createdAt: now,
        updatedAt: now,
      };

      this.users.set(user.id, user);
      return { ...user };
    });
  }

  createSchool(params: { actor: AuthenticatedUser; name: string; location?: string }) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const school: SchoolRecord = {
        id: this.nextId('sch'),
        name: params.name,
        status: 'pending',
        createdBy: params.actor.id,
        adminUserIds: [],
        createdAt: now,
        updatedAt: now,
      };

      if (params.location) {
        school.location = params.location;
      }

      if (params.actor.role === 'school_admin') {
        this.addSchoolUser(params.actor.id, school.id);
        school.adminUserIds.push(params.actor.id);
      }

      this.schools.set(school.id, school);
      return { ...school, adminUserIds: [...school.adminUserIds] };
    });
  }

  approveSchool(actor: AuthenticatedUser, schoolId: string) {
    return this.withWrite(() => {
      const school = this.schools.get(schoolId);
      if (!school) {
        throw new NotFoundException('School not found');
      }

      school.status = 'approved';
      school.approvedBy = actor.id;
      school.updatedAt = new Date().toISOString();

      this.schools.set(school.id, school);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'school.approved',
        resource: 'school',
        resourceId: school.id,
        metadata: {
          schoolStatus: school.status,
        },
      });

      return { ...school, adminUserIds: [...school.adminUserIds] };
    });
  }

  inviteCoach(actor: AuthenticatedUser, schoolId: string, email: string, role: UserRole = 'coach') {
    return this.withWrite(() => {
      const school = this.schools.get(schoolId);
      if (!school) {
        throw new NotFoundException('School not found');
      }

      const isSchoolAdmin = actor.role === 'super_admin' || school.adminUserIds.includes(actor.id);
      if (!isSchoolAdmin) {
        throw new ForbiddenException('Only school admin can invite users');
      }

      const existingUser = [...this.users.values()].find((user) => user.email === email);
      if (existingUser) {
        if (!existingUser.roles.includes(role)) {
          existingUser.roles = [...existingUser.roles, role];
        }
        if (!existingUser.schoolIds.includes(schoolId)) {
          existingUser.schoolIds = [...existingUser.schoolIds, schoolId];
        }

        this.users.set(existingUser.id, {
          ...existingUser,
          updatedAt: new Date().toISOString(),
        });

        return { email, userId: existingUser.id, role, schoolId };
      }

      const created = this.createUserSync({
        email,
        passwordHash: `LOCKED:${this.randomToken(32)}`,
        roles: [role],
        schoolIds: [schoolId],
      });
      this.users.set(created.id, {
        ...created,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });

      return {
        email,
        userId: created.id,
        role,
        schoolId,
        requiresPasswordSetup: true,
      };
    });
  }

  createAthleteDraft(
    actor: AuthenticatedUser,
    params: { schoolId: string; fullName: string; dateOfBirth?: string; gender?: string },
  ) {
    return this.withWrite(() => {
      const school = this.schools.get(params.schoolId);
      if (!school) {
        throw new NotFoundException('School not found');
      }

      if (!actor.schoolIds.includes(params.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }

      if (school.status !== 'approved') {
        throw new BadRequestException('School must be approved before registering athletes');
      }

      const now = new Date().toISOString();
      const athlete: AthleteRecord = {
        id: this.nextId('ath'),
        schoolId: params.schoolId,
        fullName: params.fullName,
        status: 'draft',
        createdBy: actor.id,
        publicProfileStatus: 'private',
        guardianConsentRequired: true,
        createdAt: now,
        updatedAt: now,
      };

      if (params.dateOfBirth) {
        athlete.dateOfBirth = params.dateOfBirth;
      }

      if (params.gender) {
        athlete.gender = params.gender;
      }

      this.athletes.set(athlete.id, athlete);
      return { ...athlete };
    });
  }

  approveAthleteIdentity(actor: AuthenticatedUser, athleteId: string) {
    return this.withWrite(() => {
      const athlete = this.athletes.get(athleteId);
      if (!athlete) {
        throw new NotFoundException('Athlete not found');
      }

      const generatedId = this.generateAthletiqId();
      athlete.status = 'identity_approved';
      athlete.athletiqId = generatedId;
      athlete.approvedBy = actor.id;
      athlete.updatedAt = new Date().toISOString();

      this.athletes.set(athlete.id, athlete);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'athlete.identity_approved',
        resource: 'athlete',
        resourceId: athlete.id,
        metadata: {
          athletiqId: generatedId,
        },
      });

      return { ...athlete };
    });
  }

  getAuditLogs() {
    return this.readOperation(() => [...this.auditLogs].map((log) => ({ ...log })));
  }

  recordAuditLog(params: Omit<AuditRecord, 'id' | 'createdAt'>) {
    return this.withWrite(() => this.addAuditLog(params));
  }

  getAthleteById(id: string) {
    return this.readOperation(() => {
      const athlete = this.athletes.get(id);
      return athlete ? { ...athlete } : undefined;
    });
  }

  getAthleteWithVerifiedStats(id: string) {
    return this.readOperation(() => {
      const athlete = this.athletes.get(id);
      if (!athlete) {
        return undefined;
      }

      const tournamentStats = this.computeAthleteTournamentStats(id).map((stat) => ({
        ...stat,
      }));

      return {
        ...athlete,
        verifiedTournamentStats: tournamentStats,
      };
    });
  }

  listAthleteIds() {
    return this.readOperation(() => [...this.athletes.keys()]);
  }

  listAthletes() {
    return this.readOperation(() => [...this.athletes.values()].map((athlete) => ({ ...athlete })));
  }

  recordGuardianConsent(
    actor: AuthenticatedUser,
    athleteId: string,
    input: { guardianName: string; relationship: string; consentType?: string },
  ) {
    return this.withWrite(() => {
      const athlete = this.athletes.get(athleteId);
      if (!athlete) {
        throw new NotFoundException('Athlete not found');
      }
      if (actor.role !== 'super_admin' && !actor.schoolIds.includes(athlete.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }

      const now = new Date().toISOString();
      const consentType = input.consentType ?? 'public_profile';
      const consent: GuardianConsentRecord = {
        id: this.nextId('gco'),
        athleteId,
        schoolId: athlete.schoolId,
        guardianName: input.guardianName,
        relationship: input.relationship,
        consentType,
        grantedAt: now,
        recordedBy: actor.id,
        createdAt: now,
      };
      this.guardianConsents.set(consent.id, consent);

      const updated: AthleteRecord =
        consentType === 'public_profile'
          ? {
              ...athlete,
              guardianConsentRequired: true,
              guardianConsentGrantedAt: now,
              updatedAt: now,
            }
          : { ...athlete, updatedAt: now };
      this.athletes.set(athleteId, updated);

      this.addAuditLog({
        actorUserId: actor.id,
        action: 'privacy.guardian_consent_recorded',
        resource: 'athlete',
        resourceId: athleteId,
        metadata: { consentType: consent.consentType },
      });

      return { ...consent };
    });
  }

  setAthletePublicProfile(
    actor: AuthenticatedUser,
    athleteId: string,
    status: 'private' | 'public',
  ) {
    return this.withWrite(() => {
      const athlete = this.athletes.get(athleteId);
      if (!athlete) {
        throw new NotFoundException('Athlete not found');
      }
      if (actor.role !== 'super_admin' && !actor.schoolIds.includes(athlete.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }
      if (
        status === 'public' &&
        athlete.guardianConsentRequired &&
        !athlete.guardianConsentGrantedAt
      ) {
        throw new ForbiddenException('guardian consent is required');
      }

      const updated = {
        ...athlete,
        publicProfileStatus: status,
        updatedAt: new Date().toISOString(),
      };
      this.athletes.set(athleteId, updated);
      return { ...updated };
    });
  }

  getPublicAthleteProfile(athleteId: string) {
    return this.readOperation(() => {
      const athlete = this.athletes.get(athleteId);
      if (!athlete || (athlete.publicProfileStatus ?? 'private') !== 'public') {
        return undefined;
      }

      return {
        type: 'athlete' as const,
        athleteId: athlete.id,
        fullName: athlete.fullName,
        athletiqId: athlete.athletiqId ?? null,
        schoolId: athlete.schoolId,
        publicProfileStatus: athlete.publicProfileStatus ?? 'private',
      };
    });
  }

  listTournaments() {
    return this.readOperation(() =>
      [...this.tournaments.values()].map((tournament) => ({
        ...tournament,
        schoolIds: [...tournament.schoolIds],
        teamIds: [...tournament.teamIds],
        matchIds: [...tournament.matchIds],
      })),
    );
  }

  getTournament(id: string) {
    return this.readOperation(() => {
      const tournament = this.tournaments.get(id);
      if (!tournament) {
        return undefined;
      }
      return {
        ...tournament,
        schoolIds: [...tournament.schoolIds],
        teamIds: [...tournament.teamIds],
        matchIds: [...tournament.matchIds],
      };
    });
  }

  createTournament(params: {
    actor: AuthenticatedUser;
    name: string;
    sport: string;
    format: TournamentFormat;
    maxTeams?: number;
    season?: string;
  }) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const tournament: TournamentRecord = {
        id: this.nextId('tmb'),
        name: params.name,
        sport: params.sport,
        format: params.format,
        status: 'draft',
        createdBy: params.actor.id,
        createdAt: now,
        updatedAt: now,
        schoolIds: [],
        teamIds: [],
        matchIds: [],
        ...(params.maxTeams ? { maxTeams: params.maxTeams } : {}),
        ...(params.season ? { season: params.season } : {}),
      };

      this.tournaments.set(tournament.id, tournament);
      this.addAuditLog({
        actorUserId: params.actor.id,
        action: 'tournament.created',
        resource: 'tournament',
        resourceId: tournament.id,
        metadata: {
          tournamentName: tournament.name,
          sport: tournament.sport,
        },
      });

      return { ...this.cloneTournament(tournament) };
    });
  }

  approveTournament(actor: AuthenticatedUser, tournamentId: string) {
    return this.withWrite(() => {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }

      tournament.status = 'approved';
      tournament.approvedBy = actor.id;
      tournament.updatedAt = new Date().toISOString();
      this.tournaments.set(tournament.id, tournament);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'tournament.approved',
        resource: 'tournament',
        resourceId: tournament.id,
        metadata: {
          tournamentName: tournament.name,
        },
      });

      return { ...this.cloneTournament(tournament) };
    });
  }

  createMembershipPlan(
    actor: AuthenticatedUser,
    input: {
      name: string;
      description?: string;
      amount: number;
      currency: string;
      durationDays: number;
    },
  ) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const plan: MembershipPlanRecord = {
        id: this.nextId('mplan'),
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
        amount: input.amount,
        currency: input.currency,
        durationDays: input.durationDays,
        isActive: true,
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };

      this.membershipPlans.set(plan.id, plan);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'billing.membership_plan_created',
        resource: 'membership_plan',
        resourceId: plan.id,
        metadata: {
          name: plan.name,
          amount: plan.amount,
          currency: plan.currency,
        },
      });

      return { ...plan };
    });
  }

  listMembershipPlans() {
    return this.readOperation(() =>
      [...this.membershipPlans.values()].map((plan) => ({ ...plan })),
    );
  }

  createDiscountCode(
    actor: AuthenticatedUser,
    input: {
      code: string;
      amount: number;
      currency: string;
    },
  ) {
    return this.withWrite(() => {
      const normalizedCode = input.code.trim().toUpperCase();
      const existing = [...this.discountCodes.values()].find(
        (code) => code.code === normalizedCode,
      );
      if (existing) {
        throw new BadRequestException('discount code already exists');
      }

      const now = new Date().toISOString();
      const discountCode: DiscountCodeRecord = {
        id: this.nextId('disc'),
        code: normalizedCode,
        amount: input.amount,
        currency: input.currency,
        isActive: true,
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };

      this.discountCodes.set(discountCode.id, discountCode);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'billing.discount_code_created',
        resource: 'discount_code',
        resourceId: discountCode.id,
        metadata: {
          code: discountCode.code,
          amount: discountCode.amount,
          currency: discountCode.currency,
        },
      });

      return { ...discountCode };
    });
  }

  purchaseSchoolMembership(
    actor: AuthenticatedUser,
    schoolId: string,
    input: {
      planId: string;
      discountCode?: string;
      installmentCount?: number;
    },
  ) {
    return this.withWrite(() => {
      const school = this.schools.get(schoolId);
      if (!school) {
        throw new NotFoundException('School not found');
      }
      if (!this.actorIncludesSchool(actor, schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }

      const plan = this.membershipPlans.get(input.planId);
      if (!plan || !plan.isActive) {
        throw new NotFoundException('Membership plan not found');
      }

      const now = new Date().toISOString();
      const membershipId = this.nextId('mship');
      const invoiceId = this.nextId('inv');
      const discount = input.discountCode
        ? this.findActiveDiscount(input.discountCode, plan.currency)
        : undefined;
      const discountAmount = Math.min(discount?.amount ?? 0, plan.amount);
      const totalAmount = Math.max(plan.amount - discountAmount, 0);
      const status: InvoiceStatus = totalAmount === 0 ? 'paid' : 'open';
      const invoice: InvoiceRecord = {
        id: invoiceId,
        schoolId,
        entityType: 'school_membership',
        entityId: membershipId,
        subtotalAmount: plan.amount,
        discountAmount,
        totalAmount,
        paidAmount: totalAmount === 0 ? totalAmount : 0,
        refundedAmount: 0,
        balanceAmount: status === 'paid' ? 0 : totalAmount,
        currency: plan.currency,
        status,
        ...(discount ? { discountCode: discount.code } : {}),
        installments: this.buildInstallments(
          invoiceId,
          totalAmount,
          input.installmentCount,
          status === 'paid',
          now,
        ),
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      const membership: SchoolMembershipRecord = {
        id: membershipId,
        schoolId,
        planId: plan.id,
        invoiceId: invoice.id,
        status: status === 'paid' ? 'active' : 'pending',
        ...(status === 'paid' ? this.membershipActiveWindow(now, plan.durationDays) : {}),
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };

      this.invoices.set(invoice.id, invoice);
      this.schoolMemberships.set(membership.id, membership);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'billing.school_membership_purchased',
        resource: 'school_membership',
        resourceId: membership.id,
        metadata: {
          schoolId,
          planId: plan.id,
          invoiceId: invoice.id,
          totalAmount,
        },
      });

      return {
        membership: { ...membership },
        invoice: this.cloneInvoice(invoice),
      };
    });
  }

  configureTournamentRegistrationFee(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: {
      amount: number;
      currency: string;
      requiredBeforeApproval?: boolean;
    },
  ) {
    return this.withWrite(() => {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }

      const updated: TournamentRecord = {
        ...tournament,
        registrationFeeAmount: input.amount,
        registrationFeeCurrency: input.currency,
        registrationFeeRequiredBeforeApproval: input.requiredBeforeApproval ?? true,
        updatedAt: new Date().toISOString(),
      };
      this.tournaments.set(tournamentId, updated);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'billing.tournament_registration_fee_configured',
        resource: 'tournament',
        resourceId: tournamentId,
        metadata: {
          amount: input.amount,
          currency: input.currency,
          requiredBeforeApproval: updated.registrationFeeRequiredBeforeApproval ?? true,
        },
      });

      return this.cloneTournament(updated);
    });
  }

  createTournamentRegistrationInvoice(
    actor: AuthenticatedUser,
    tournamentId: string,
    schoolId: string,
    input: {
      discountCode?: string;
      installmentCount?: number;
    },
  ) {
    return this.withWrite(() => {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }
      const school = this.schools.get(schoolId);
      if (!school) {
        throw new NotFoundException('School not found');
      }
      if (!this.actorIncludesSchool(actor, schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }

      const entityId = this.tournamentRegistrationEntityId(tournamentId, schoolId);
      const existing = [...this.invoices.values()].find(
        (invoice) =>
          invoice.entityType === 'tournament_registration' &&
          invoice.entityId === entityId &&
          invoice.status !== 'void',
      );
      if (existing) {
        return this.cloneInvoice(existing);
      }

      const now = new Date().toISOString();
      const invoiceId = this.nextId('inv');
      const subtotalAmount = tournament.registrationFeeAmount ?? 0;
      const currency = tournament.registrationFeeCurrency ?? 'NPR';
      const discount = input.discountCode
        ? this.findActiveDiscount(input.discountCode, currency)
        : undefined;
      const discountAmount = Math.min(discount?.amount ?? 0, subtotalAmount);
      const totalAmount = Math.max(subtotalAmount - discountAmount, 0);
      const status: InvoiceStatus = totalAmount === 0 ? 'paid' : 'open';
      const invoice: InvoiceRecord = {
        id: invoiceId,
        schoolId,
        entityType: 'tournament_registration',
        entityId,
        subtotalAmount,
        discountAmount,
        totalAmount,
        paidAmount: totalAmount === 0 ? totalAmount : 0,
        refundedAmount: 0,
        balanceAmount: status === 'paid' ? 0 : totalAmount,
        currency,
        status,
        ...(discount ? { discountCode: discount.code } : {}),
        installments: this.buildInstallments(
          invoiceId,
          totalAmount,
          input.installmentCount,
          status === 'paid',
          now,
        ),
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };

      this.invoices.set(invoice.id, invoice);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'billing.tournament_registration_invoice_created',
        resource: 'invoice',
        resourceId: invoice.id,
        metadata: {
          tournamentId,
          schoolId,
          totalAmount,
        },
      });

      return this.cloneInvoice(invoice);
    });
  }

  ensureTournamentRegistrationPaymentSatisfied(tournamentId: string, schoolId: string) {
    return this.readOperation(() => {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }
      const required =
        tournament.registrationFeeRequiredBeforeApproval &&
        (tournament.registrationFeeAmount ?? 0) > 0;
      if (!required) {
        return true;
      }

      const entityId = this.tournamentRegistrationEntityId(tournamentId, schoolId);
      const invoice = [...this.invoices.values()].find(
        (candidate) =>
          candidate.entityType === 'tournament_registration' &&
          candidate.entityId === entityId &&
          candidate.status === 'paid' &&
          candidate.balanceAmount === 0,
      );
      if (!invoice) {
        throw new BadRequestException('Tournament registration payment required');
      }

      return true;
    });
  }

  recordManualPayment(
    actor: AuthenticatedUser,
    invoiceId: string,
    input: {
      amount: number;
      method: PaymentMethod;
      reference?: string;
      notes?: string;
    },
  ) {
    return this.withWrite(() => {
      const invoice = this.invoices.get(invoiceId);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (!this.actorIncludesSchool(actor, invoice.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }
      if (input.amount > invoice.balanceAmount) {
        throw new BadRequestException('payment amount exceeds invoice balance');
      }

      const now = new Date().toISOString();
      const payment: PaymentRecord = {
        id: this.nextId('pay'),
        invoiceId: invoice.id,
        schoolId: invoice.schoolId,
        amount: input.amount,
        currency: invoice.currency,
        method: input.method,
        status: 'approved',
        provider: 'manual',
        ...(input.reference ? { reference: input.reference } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
        approvedBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      const updatedInvoice = this.recalculateInvoice({
        ...invoice,
        paidAmount: invoice.paidAmount + payment.amount,
        updatedAt: now,
      });

      this.payments.set(payment.id, payment);
      this.invoices.set(updatedInvoice.id, updatedInvoice);
      const membership = this.activateMembershipForPaidInvoice(updatedInvoice, now);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'billing.manual_payment_approved',
        resource: 'payment',
        resourceId: payment.id,
        metadata: {
          invoiceId: invoice.id,
          schoolId: invoice.schoolId,
          amount: payment.amount,
          method: payment.method,
        },
      });

      return {
        invoice: this.cloneInvoice(updatedInvoice),
        payment: { ...payment },
        ...(membership ? { membership: { ...membership } } : {}),
      };
    });
  }

  refundPayment(
    actor: AuthenticatedUser,
    paymentId: string,
    input: {
      amount: number;
      reason?: string;
    },
  ) {
    return this.withWrite(() => {
      const payment = this.payments.get(paymentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }
      const invoice = this.invoices.get(payment.invoiceId);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      const refundedForPayment = [...this.refunds.values()]
        .filter((refund) => refund.paymentId === paymentId)
        .reduce((sum, refund) => sum + refund.amount, 0);
      if (input.amount > payment.amount - refundedForPayment) {
        throw new BadRequestException('refund amount exceeds refundable payment balance');
      }

      const now = new Date().toISOString();
      const refund: RefundRecord = {
        id: this.nextId('rfnd'),
        paymentId,
        invoiceId: invoice.id,
        schoolId: payment.schoolId,
        amount: input.amount,
        currency: payment.currency,
        ...(input.reason ? { reason: input.reason } : {}),
        status: 'approved',
        createdBy: actor.id,
        createdAt: now,
      };
      const updatedPayment: PaymentRecord = {
        ...payment,
        status: input.amount + refundedForPayment >= payment.amount ? 'refunded' : 'approved',
        updatedAt: now,
      };
      const updatedInvoice = this.recalculateInvoice({
        ...invoice,
        refundedAmount: invoice.refundedAmount + refund.amount,
        updatedAt: now,
      });

      this.refunds.set(refund.id, refund);
      this.payments.set(payment.id, updatedPayment);
      this.invoices.set(invoice.id, updatedInvoice);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'billing.payment_refunded',
        resource: 'refund',
        resourceId: refund.id,
        metadata: {
          paymentId,
          invoiceId: invoice.id,
          amount: refund.amount,
        },
      });

      return {
        invoice: this.cloneInvoice(updatedInvoice),
        payment: { ...updatedPayment },
        refund: { ...refund },
      };
    });
  }

  getFinanceReport(input: { schoolId?: string; tournamentId?: string; currency?: string }) {
    return this.readOperation(() => {
      const invoices = [...this.invoices.values()].filter((invoice) => {
        if (input.schoolId && invoice.schoolId !== input.schoolId) {
          return false;
        }
        if (input.tournamentId) {
          return (
            invoice.entityType === 'tournament_registration' &&
            invoice.entityId.startsWith(`${input.tournamentId}:`)
          );
        }
        return true;
      });
      const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
      const payments = [...this.payments.values()].filter((payment) =>
        invoiceIds.has(payment.invoiceId),
      );
      const refunds = [...this.refunds.values()].filter((refund) =>
        invoiceIds.has(refund.invoiceId),
      );
      const currency = input.currency ?? invoices[0]?.currency ?? 'NPR';
      const matchingInvoices = invoices.filter((invoice) => invoice.currency === currency);
      const matchingInvoiceIds = new Set(matchingInvoices.map((invoice) => invoice.id));
      const matchingPayments = payments.filter((payment) => payment.currency === currency);
      const matchingRefunds = refunds.filter((refund) => refund.currency === currency);
      const paidAmount = matchingPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const refundedAmount = matchingRefunds.reduce((sum, refund) => sum + refund.amount, 0);
      const outstandingAmount = matchingInvoices.reduce(
        (sum, invoice) => sum + invoice.balanceAmount,
        0,
      );

      return {
        scope: input.tournamentId ? 'tournament' : input.schoolId ? 'school' : 'platform',
        ...(input.schoolId ? { schoolId: input.schoolId } : {}),
        ...(input.tournamentId ? { tournamentId: input.tournamentId } : {}),
        currency,
        invoiceCount: matchingInvoices.length,
        paidAmount,
        refundedAmount,
        netAmount: paidAmount - refundedAmount,
        outstandingAmount,
        payments: matchingPayments
          .filter((payment) => matchingInvoiceIds.has(payment.invoiceId))
          .map((payment) => ({ ...payment })),
        refunds: matchingRefunds
          .filter((refund) => matchingInvoiceIds.has(refund.invoiceId))
          .map((refund) => ({ ...refund })),
      } satisfies FinanceReportRecord;
    });
  }

  createWaiverTemplate(
    actor: AuthenticatedUser,
    input: {
      name: string;
      body: string;
      version: string;
      expiresAfterDays?: number;
    },
  ) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const template: WaiverTemplateRecord = {
        id: this.nextId('wvt'),
        name: input.name,
        body: input.body,
        version: input.version,
        ...(input.expiresAfterDays ? { expiresAfterDays: input.expiresAfterDays } : {}),
        isActive: true,
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.waiverTemplates.set(template.id, template);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'waiver.template_created',
        resource: 'waiver_template',
        resourceId: template.id,
        metadata: {
          name: template.name,
          version: template.version,
        },
      });

      return { ...template };
    });
  }

  createTournamentWaiverRequirement(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: { waiverTemplateId: string },
  ) {
    return this.withWrite(() => {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }
      const template = this.waiverTemplates.get(input.waiverTemplateId);
      if (!template || !template.isActive) {
        throw new NotFoundException('Waiver template not found');
      }

      const existing = [...this.tournamentWaiverRequirements.values()].find(
        (requirement) =>
          requirement.tournamentId === tournamentId &&
          requirement.waiverTemplateId === template.id &&
          requirement.isActive,
      );
      if (existing) {
        return { ...existing };
      }

      const now = new Date().toISOString();
      const requirement: TournamentWaiverRequirementRecord = {
        id: this.nextId('wreq'),
        tournamentId,
        waiverTemplateId: template.id,
        requiredFor: 'athlete',
        isActive: true,
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.tournamentWaiverRequirements.set(requirement.id, requirement);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'waiver.tournament_requirement_created',
        resource: 'tournament_waiver_requirement',
        resourceId: requirement.id,
        metadata: {
          tournamentId,
          waiverTemplateId: template.id,
        },
      });

      return { ...requirement };
    });
  }

  signWaiver(
    actor: AuthenticatedUser,
    input: {
      waiverTemplateId: string;
      tournamentId?: string;
      athleteId: string;
      schoolId: string;
      guardianName: string;
      relationship: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.withWrite(() => {
      const template = this.waiverTemplates.get(input.waiverTemplateId);
      if (!template || !template.isActive) {
        throw new NotFoundException('Waiver template not found');
      }
      const athlete = this.athletes.get(input.athleteId);
      if (!athlete || athlete.schoolId !== input.schoolId) {
        throw new BadRequestException(`athlete ${input.athleteId} not found in school`);
      }
      if (!this.actorIncludesSchool(actor, input.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }
      if (input.tournamentId && !this.tournaments.has(input.tournamentId)) {
        throw new NotFoundException('Tournament not found');
      }

      const signedAt = new Date();
      const expiresAt = template.expiresAfterDays
        ? new Date(
            signedAt.getTime() + template.expiresAfterDays * 24 * 60 * 60 * 1000,
          ).toISOString()
        : undefined;
      const signature: WaiverSignatureRecord = {
        id: this.nextId('wsig'),
        waiverTemplateId: template.id,
        waiverTemplateVersion: template.version,
        ...(input.tournamentId ? { tournamentId: input.tournamentId } : {}),
        athleteId: input.athleteId,
        schoolId: input.schoolId,
        guardianName: input.guardianName,
        relationship: input.relationship,
        signedBy: actor.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        signedAt: signedAt.toISOString(),
        ...(expiresAt ? { expiresAt } : {}),
        createdAt: signedAt.toISOString(),
      };

      this.waiverSignatures.set(signature.id, signature);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'waiver.signature_recorded',
        resource: 'waiver_signature',
        resourceId: signature.id,
        metadata: {
          waiverTemplateId: template.id,
          athleteId: input.athleteId,
          schoolId: input.schoolId,
          tournamentId: input.tournamentId ?? null,
        },
      });

      return { ...signature };
    });
  }

  listWaiverSignatures(athleteId: string) {
    return this.readOperation(() =>
      [...this.waiverSignatures.values()]
        .filter((signature) => signature.athleteId === athleteId)
        .map((signature) => ({ ...signature })),
    );
  }

  ensureTournamentWaiversSatisfied(input: {
    tournamentId: string;
    schoolId: string;
    athleteIds: string[];
  }) {
    return this.readOperation(() => {
      const requirements = [...this.tournamentWaiverRequirements.values()].filter(
        (requirement) => requirement.tournamentId === input.tournamentId && requirement.isActive,
      );
      if (requirements.length === 0) {
        return true;
      }

      const now = Date.now();
      const missing = input.athleteIds.filter((athleteId) => {
        return requirements.some((requirement) => {
          const template = this.waiverTemplates.get(requirement.waiverTemplateId);
          return ![...this.waiverSignatures.values()].some((signature) => {
            const signatureTournamentMatches =
              !signature.tournamentId || signature.tournamentId === input.tournamentId;
            const notExpired = !signature.expiresAt || Date.parse(signature.expiresAt) > now;
            return (
              template !== undefined &&
              signature.athleteId === athleteId &&
              signature.schoolId === input.schoolId &&
              signature.waiverTemplateId === requirement.waiverTemplateId &&
              signature.waiverTemplateVersion === template.version &&
              signatureTournamentMatches &&
              notExpired
            );
          });
        });
      });

      if (missing.length > 0) {
        throw new BadRequestException(
          `Missing waiver signatures for athletes: ${missing.join(', ')}`,
        );
      }

      return true;
    });
  }

  createIdentityDocument(
    actor: AuthenticatedUser,
    input: {
      id: string;
      athleteId: string;
      schoolId: string;
      documentType: IdentityDocumentType;
      originalFilename: string;
      mimeType: string;
      byteSize: number;
      sha256Hash: string;
      storageKey: string;
    },
  ) {
    return this.withWrite(() => {
      const athlete = this.athletes.get(input.athleteId);
      if (!athlete) {
        throw new NotFoundException('Athlete not found');
      }
      if (athlete.schoolId !== input.schoolId) {
        throw new BadRequestException(`athlete ${input.athleteId} not found in school`);
      }
      if (!this.actorIncludesSchool(actor, input.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }

      const now = new Date().toISOString();
      const document: IdentityDocumentRecord = {
        id: input.id,
        schoolId: input.schoolId,
        athleteId: input.athleteId,
        documentType: input.documentType,
        status: 'uploaded',
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        sha256Hash: input.sha256Hash,
        storageKey: input.storageKey,
        malwareScanStatus: 'clean',
        uploadedBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };

      this.identityDocuments.set(document.id, document);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'document.uploaded',
        resource: 'identity_document',
        resourceId: document.id,
        metadata: {
          athleteId: document.athleteId,
          schoolId: document.schoolId,
          documentType: document.documentType,
        },
      });

      return { ...document };
    });
  }

  findIdentityDocumentById(documentId: string) {
    return this.readOperation(() => {
      const document = this.identityDocuments.get(documentId);
      return document ? { ...document } : undefined;
    });
  }

  extractIdentityDocument(
    actor: AuthenticatedUser,
    documentId: string,
    input: {
      provider: DocumentExtractionRecord['provider'];
      extracted: ExtractedIdentityFields;
      fieldConfidence: Partial<Record<keyof ExtractedIdentityFields, number>>;
      confidence: number;
      reviewFlags: Array<{
        field: DocumentReviewFlagRecord['field'];
        severity: DocumentReviewFlagRecord['severity'];
        message: string;
      }>;
    },
  ) {
    return this.withWrite(() => {
      const document = this.identityDocuments.get(documentId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }
      this.assertDocumentActorAccess(actor, document);

      const now = new Date().toISOString();
      const extraction: DocumentExtractionRecord = {
        id: this.nextId('dext'),
        documentId: document.id,
        schoolId: document.schoolId,
        athleteId: document.athleteId,
        provider: input.provider,
        extracted: { ...input.extracted },
        fieldConfidence: { ...input.fieldConfidence },
        confidence: input.confidence,
        createdBy: actor.id,
        createdAt: now,
      };
      this.documentExtractions.set(extraction.id, extraction);

      for (const existingFlag of [...this.documentReviewFlags.values()]) {
        if (existingFlag.documentId === document.id) {
          this.documentReviewFlags.delete(existingFlag.id);
        }
      }

      const flags = input.reviewFlags.map((flag) => {
        const record: DocumentReviewFlagRecord = {
          id: this.nextId('drf'),
          documentId: document.id,
          extractionId: extraction.id,
          field: flag.field,
          severity: flag.severity,
          message: flag.message,
          createdAt: now,
        };
        this.documentReviewFlags.set(record.id, record);
        return record;
      });

      for (const existingCandidate of [...this.documentDuplicateCandidates.values()]) {
        if (existingCandidate.documentId === document.id) {
          this.documentDuplicateCandidates.delete(existingCandidate.id);
        }
      }
      const duplicateCandidates = this.detectDocumentDuplicates(document, extraction, now);

      const documentExpiresAt = input.extracted.expiryDate
        ? this.toEndOfDayIso(input.extracted.expiryDate)
        : undefined;
      const updated: IdentityDocumentRecord = {
        ...document,
        status: 'review_required',
        extractedAt: now,
        ...(documentExpiresAt ? { expiresAt: documentExpiresAt } : {}),
        updatedAt: now,
      };
      this.identityDocuments.set(updated.id, updated);

      this.addAuditLog({
        actorUserId: actor.id,
        action: 'document.extracted',
        resource: 'identity_document',
        resourceId: document.id,
        metadata: {
          athleteId: document.athleteId,
          schoolId: document.schoolId,
          confidence: input.confidence,
        },
      });

      return {
        document: { ...updated },
        extraction: { ...extraction, extracted: { ...extraction.extracted } },
        reviewFlags: flags.map((flag) => ({ ...flag })),
        duplicateCandidates: duplicateCandidates.map((candidate) => ({
          ...candidate,
          reasonCodes: [...candidate.reasonCodes],
        })),
      };
    });
  }

  createDocumentReviewLink(
    actor: AuthenticatedUser,
    documentId: string,
    input: { tokenHash: string; expiresAt: string },
  ) {
    return this.withWrite(() => {
      const document = this.identityDocuments.get(documentId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }
      if (actor.role !== 'super_admin') {
        throw new ForbiddenException('Only super admins can create review links');
      }

      const now = new Date().toISOString();
      const link: DocumentReviewLinkRecord = {
        id: this.nextId('drl'),
        documentId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdBy: actor.id,
        createdAt: now,
      };
      this.documentReviewLinks.set(link.id, link);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'document.review_link_created',
        resource: 'identity_document',
        resourceId: document.id,
        metadata: {
          schoolId: document.schoolId,
          expiresAt: link.expiresAt,
        },
      });
      return { ...link };
    });
  }

  resolveDocumentReviewLink(actor: AuthenticatedUser, tokenHash: string) {
    return this.readOperation(() => {
      const link = [...this.documentReviewLinks.values()].find(
        (candidate) => candidate.tokenHash === tokenHash,
      );
      if (!link) {
        throw new NotFoundException('Review link not found');
      }
      if (Date.parse(link.expiresAt) <= Date.now()) {
        throw new GoneException('Review link expired');
      }
      const document = this.identityDocuments.get(link.documentId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }
      this.assertDocumentActorAccess(actor, document);
      return this.buildDocumentReviewQueueItem(document);
    });
  }

  listDocumentReviewQueue(input: { schoolId?: string; status?: IdentityDocumentStatus }) {
    return this.readOperation(() => {
      return [...this.identityDocuments.values()]
        .filter((document) => (input.schoolId ? document.schoolId === input.schoolId : true))
        .filter((document) => (input.status ? document.status === input.status : true))
        .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
        .map((document) => this.buildDocumentReviewQueueItem(document));
    });
  }

  listDocumentDuplicateCandidates(documentId: string) {
    return this.readOperation(() =>
      [...this.documentDuplicateCandidates.values()]
        .filter((candidate) => candidate.documentId === documentId)
        .map((candidate) => ({ ...candidate, reasonCodes: [...candidate.reasonCodes] })),
    );
  }

  reviewIdentityDocument(
    actor: AuthenticatedUser,
    documentId: string,
    input: {
      action: DocumentReviewAction;
      notes?: string;
      reason?: string;
      overrideReason?: string;
      correctedFields?: ExtractedIdentityFields;
    },
  ) {
    return this.withWrite(() => {
      const document = this.identityDocuments.get(documentId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }
      if (actor.role !== 'super_admin' && input.action !== 'request_correction') {
        throw new ForbiddenException('Only super admins can approve or reject documents');
      }
      this.assertDocumentActorAccess(actor, document);
      const extraction = this.latestDocumentExtraction(document.id);
      if ((input.action === 'approve' || input.action === 'override') && !extraction) {
        throw new BadRequestException('Document extraction is required before approval');
      }
      if (input.action === 'override' && !input.overrideReason?.trim()) {
        throw new BadRequestException('overrideReason is required');
      }

      const now = new Date().toISOString();
      const review: DocumentReviewRecord = {
        id: this.nextId('drev'),
        documentId: document.id,
        schoolId: document.schoolId,
        athleteId: document.athleteId,
        action: input.action,
        ...(input.notes ? { notes: input.notes } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.overrideReason ? { overrideReason: input.overrideReason } : {}),
        ...(input.correctedFields ? { correctedFields: { ...input.correctedFields } } : {}),
        reviewedBy: actor.id,
        createdAt: now,
      };
      this.documentReviews.set(review.id, review);

      const statusByAction: Record<DocumentReviewAction, IdentityDocumentStatus> = {
        approve: 'verified',
        override: 'verified',
        reject: 'rejected',
        request_correction: 'correction_requested',
      };
      const updatedDocument: IdentityDocumentRecord = {
        ...document,
        status: statusByAction[input.action],
        reviewedBy: actor.id,
        ...(input.action === 'approve' || input.action === 'override' ? { verifiedAt: now } : {}),
        ...(input.action === 'reject' ? { rejectedAt: now } : {}),
        ...(input.action === 'request_correction' ? { correctionRequestedAt: now } : {}),
        updatedAt: now,
      };
      this.identityDocuments.set(document.id, updatedDocument);

      let updatedAthlete: AthleteRecord | undefined;
      if ((input.action === 'approve' || input.action === 'override') && extraction) {
        const athlete = this.athletes.get(document.athleteId);
        if (!athlete) {
          throw new NotFoundException('Athlete not found');
        }
        const approvedFields = {
          ...extraction.extracted,
          ...(input.correctedFields ?? {}),
        };
        updatedAthlete = {
          ...athlete,
          ...(approvedFields.fullName ? { fullName: approvedFields.fullName } : {}),
          ...(approvedFields.dateOfBirth ? { dateOfBirth: approvedFields.dateOfBirth } : {}),
          ...(approvedFields.gender ? { gender: approvedFields.gender } : {}),
          status: 'identity_approved',
          athletiqId: athlete.athletiqId ?? this.generateAthletiqId(),
          approvedBy: actor.id,
          updatedAt: now,
        };
        this.athletes.set(athlete.id, updatedAthlete);
        this.addAuditLog({
          actorUserId: actor.id,
          action: 'document.identity_approved',
          resource: 'identity_document',
          resourceId: document.id,
          metadata: {
            athleteId: athlete.id,
            schoolId: athlete.schoolId,
            reviewAction: input.action,
          },
        });
      } else {
        this.addAuditLog({
          actorUserId: actor.id,
          action: `document.${input.action}`,
          resource: 'identity_document',
          resourceId: document.id,
          metadata: {
            athleteId: document.athleteId,
            schoolId: document.schoolId,
          },
        });
      }

      return {
        document: { ...updatedDocument },
        review: {
          ...review,
          ...(review.correctedFields ? { correctedFields: { ...review.correctedFields } } : {}),
        },
        ...(updatedAthlete ? { athlete: { ...updatedAthlete } } : {}),
      };
    });
  }

  listExpiringIdentityDocuments(input: { before: string; schoolId?: string }) {
    return this.readOperation(() => {
      const beforeMs = Date.parse(input.before);
      if (Number.isNaN(beforeMs)) {
        throw new BadRequestException('before must be a valid date');
      }
      return [...this.identityDocuments.values()]
        .filter((document) => (input.schoolId ? document.schoolId === input.schoolId : true))
        .filter((document) => document.expiresAt && Date.parse(document.expiresAt) <= beforeMs)
        .filter(
          (document) => document.status === 'verified' || document.status === 'review_required',
        )
        .map((document) => ({ ...document }));
    });
  }

  runIdentityDocumentExpiryCheck(actor: AuthenticatedUser, input: { before: string }) {
    return this.withWrite(() => {
      if (actor.role !== 'super_admin') {
        throw new ForbiddenException('Only super admins can run document expiry checks');
      }
      const beforeMs = Date.parse(input.before);
      if (Number.isNaN(beforeMs)) {
        throw new BadRequestException('before must be a valid date');
      }
      const expiredDocumentIds: string[] = [];
      const now = new Date().toISOString();
      for (const document of this.identityDocuments.values()) {
        if (
          document.expiresAt &&
          Date.parse(document.expiresAt) <= beforeMs &&
          document.status === 'verified'
        ) {
          const updated: IdentityDocumentRecord = {
            ...document,
            status: 'expired',
            updatedAt: now,
          };
          this.identityDocuments.set(updated.id, updated);
          expiredDocumentIds.push(updated.id);
          this.addAuditLog({
            actorUserId: actor.id,
            action: 'document.expired',
            resource: 'identity_document',
            resourceId: updated.id,
            metadata: {
              athleteId: updated.athleteId,
              schoolId: updated.schoolId,
            },
          });
        }
      }
      return { before: input.before, expiredDocumentIds };
    });
  }

  registerSchoolToTournament(actor: AuthenticatedUser, tournamentId: string, schoolId: string) {
    return this.withWrite(async () => {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }

      const school = this.schools.get(schoolId);
      if (!school) {
        throw new NotFoundException('School not found');
      }

      if (school.status !== 'approved') {
        throw new BadRequestException('Only approved schools can be registered in tournaments');
      }

      if (!actor.schoolIds.includes(schoolId) && actor.role !== 'super_admin') {
        throw new ForbiddenException('Not a member of school');
      }

      if (tournament.status === 'draft' || !tournament.status) {
        throw new BadRequestException('Tournament must be approved before enrollment');
      }

      if (tournament.schoolIds.includes(schoolId)) {
        return { ...this.cloneTournament(tournament), exists: true };
      }

      if (tournament.maxTeams && tournament.schoolIds.length >= tournament.maxTeams) {
        throw new BadRequestException('Tournament is already full');
      }

      await this.ensureTournamentRegistrationPaymentSatisfied(tournamentId, schoolId);

      this.tournaments.set(tournament.id, {
        ...tournament,
        schoolIds: [...tournament.schoolIds, schoolId],
        updatedAt: new Date().toISOString(),
      });
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'tournament.school_registered',
        resource: 'tournament',
        resourceId: tournament.id,
        metadata: {
          schoolId,
        },
      });

      return { ...this.cloneTournament(this.tournaments.get(tournament.id)!), exists: false };
    });
  }

  getTeamById(teamId: string) {
    return this.readOperation(() => {
      const team = this.teams.get(teamId);
      if (!team) {
        return undefined;
      }
      return { ...team, athleteIds: [...team.athleteIds] };
    });
  }

  listTeams(tournamentId?: string, schoolId?: string) {
    return this.readOperation(() => {
      const values = [...this.teams.values()];
      return values
        .filter((team) => (tournamentId ? team.tournamentId === tournamentId : true))
        .filter((team) => (schoolId ? team.schoolId === schoolId : true))
        .map((team) => ({ ...team, athleteIds: [...team.athleteIds] }));
    });
  }

  createTeam(params: {
    actor: AuthenticatedUser;
    tournamentId: string;
    schoolId: string;
    name: string;
    athleteIds: string[];
    coachUserId?: string;
  }) {
    return this.withWrite(() => {
      const tournament = this.tournaments.get(params.tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }

      const school = this.schools.get(params.schoolId);
      if (!school) {
        throw new NotFoundException('School not found');
      }

      if (!school.adminUserIds.includes(params.actor.id) && params.actor.role !== 'super_admin') {
        throw new ForbiddenException('Only school admin can create teams');
      }

      if (!this.actorIncludesSchool(params.actor, params.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }

      if (!tournament.schoolIds.includes(params.schoolId)) {
        throw new BadRequestException('School must be registered in tournament');
      }

      if (tournament.status !== 'approved' && tournament.status !== 'active') {
        throw new BadRequestException('Tournament not open for team registration');
      }

      if (tournament.maxTeams && tournament.teamIds.length >= tournament.maxTeams) {
        throw new BadRequestException('Tournament is already full');
      }

      if (params.athleteIds.length === 0) {
        throw new BadRequestException('At least one athlete is required');
      }

      const invalidAthleteId = params.athleteIds.find(
        (athleteId) => !this.isAthleteInSchool(athleteId, params.schoolId),
      );
      if (invalidAthleteId) {
        throw new BadRequestException(`athlete ${invalidAthleteId} not found in school`);
      }

      const unverifiedAthlete = params.athleteIds.find((athleteId) => {
        const athlete = this.athletes.get(athleteId);
        return athlete?.status !== 'identity_approved';
      });
      if (unverifiedAthlete) {
        throw new BadRequestException(`athlete ${unverifiedAthlete} must be identity approved`);
      }

      const existing = [...this.teams.values()].find(
        (team) =>
          team.tournamentId === params.tournamentId &&
          team.schoolId === params.schoolId &&
          team.name.toLowerCase() === params.name.toLowerCase(),
      );

      if (existing) {
        throw new BadRequestException('team name already exists');
      }

      const now = new Date().toISOString();
      const team: TournamentTeamRecord = {
        id: this.nextId('tm'),
        tournamentId: params.tournamentId,
        schoolId: params.schoolId,
        name: params.name,
        athleteIds: [...params.athleteIds],
        status: 'approved',
        createdBy: params.actor.id,
        createdAt: now,
        updatedAt: now,
        ...(params.coachUserId ? { coachUserId: params.coachUserId } : {}),
      };

      this.teams.set(team.id, team);
      this.addAuditLog({
        actorUserId: params.actor.id,
        action: 'team.created',
        resource: 'team',
        resourceId: team.id,
        metadata: {
          tournamentId: params.tournamentId,
          schoolId: params.schoolId,
        },
      });

      this.tournaments.set(params.tournamentId, {
        ...tournament,
        teamIds: [...tournament.teamIds, team.id],
        updatedAt: new Date().toISOString(),
      });

      return { ...team };
    });
  }

  approveTeam(actor: AuthenticatedUser, teamId: string) {
    return this.withWrite(() => {
      const team = this.teams.get(teamId);
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      team.status = 'approved';
      team.updatedAt = new Date().toISOString();
      this.teams.set(team.id, team);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'team.approved',
        resource: 'team',
        resourceId: team.id,
        metadata: {
          tournamentId: team.tournamentId,
        },
      });

      return { ...team, athleteIds: [...team.athleteIds] };
    });
  }

  createFacility(
    actor: AuthenticatedUser,
    input: { name: string; location: string; timezone?: string },
  ) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const facility: FacilityRecord = {
        id: this.nextId('fac'),
        name: input.name,
        location: input.location,
        timezone: input.timezone ?? 'Asia/Kathmandu',
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.facilities.set(facility.id, facility);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'facility.created',
        resource: 'facility',
        resourceId: facility.id,
        metadata: { name: facility.name },
      });
      return { ...facility };
    });
  }

  createVenueUnit(
    actor: AuthenticatedUser,
    facilityId: string,
    input: {
      name: string;
      unitType: VenueUnitType;
      sports: string[];
      status?: VenueUnitStatus;
    },
  ) {
    return this.withWrite(() => {
      if (!this.facilities.has(facilityId)) {
        throw new NotFoundException('Facility not found');
      }
      const now = new Date().toISOString();
      const unit: VenueUnitRecord = {
        id: this.nextId('vunit'),
        facilityId,
        name: input.name,
        unitType: input.unitType,
        sports: [...input.sports],
        status: input.status ?? 'active',
        createdAt: now,
        updatedAt: now,
      };
      this.venueUnits.set(unit.id, unit);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'venue_unit.created',
        resource: 'venue_unit',
        resourceId: unit.id,
        metadata: { facilityId, unitType: unit.unitType },
      });
      return this.cloneVenueUnit(unit);
    });
  }

  listFacilities() {
    return this.readOperation(() => ({
      facilities: [...this.facilities.values()].map((facility) => ({ ...facility })),
      venueUnits: [...this.venueUnits.values()].map((unit) => this.cloneVenueUnit(unit)),
    }));
  }

  createAvailabilityWindow(
    actor: AuthenticatedUser,
    input: {
      resourceType: AvailabilityResourceType;
      resourceId: string;
      tournamentId?: string;
      startsAt: string;
      endsAt: string;
      status: AvailabilityStatus;
      reason?: string;
    },
  ) {
    return this.withWrite(() => {
      this.assertAvailabilityResourceExists(input.resourceType, input.resourceId);
      if (input.tournamentId && !this.tournaments.has(input.tournamentId)) {
        throw new NotFoundException('Tournament not found');
      }
      this.assertValidWindow(input.startsAt, input.endsAt);
      const now = new Date().toISOString();
      const window: AvailabilityWindowRecord = {
        id: this.nextId('avail'),
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        ...(input.tournamentId ? { tournamentId: input.tournamentId } : {}),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: input.status,
        ...(input.reason ? { reason: input.reason } : {}),
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.availabilityWindows.set(window.id, window);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'availability.created',
        resource: 'availability_window',
        resourceId: window.id,
        metadata: {
          resourceType: window.resourceType,
          resourceId: window.resourceId,
          ...(window.tournamentId ? { tournamentId: window.tournamentId } : {}),
        },
      });
      return { ...window };
    });
  }

  listAvailabilityWindows(filter: {
    resourceType?: AvailabilityResourceType;
    resourceId?: string;
    tournamentId?: string;
  }) {
    return this.readOperation(() => ({
      windows: [...this.availabilityWindows.values()]
        .filter((window) =>
          filter.resourceType ? window.resourceType === filter.resourceType : true,
        )
        .filter((window) => (filter.resourceId ? window.resourceId === filter.resourceId : true))
        .filter((window) =>
          filter.tournamentId ? window.tournamentId === filter.tournamentId : true,
        )
        .map((window) => ({ ...window })),
    }));
  }

  createOfficialProfile(
    actor: AuthenticatedUser,
    input: {
      userId: string;
      displayName: string;
      sports: string[];
      certificationLevel?: string;
      homeSchoolId?: string;
      payoutRate?: number;
      payoutCurrency?: string;
    },
  ) {
    return this.withWrite(() => {
      const user = this.users.get(input.userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (!user.roles.includes('referee') && !user.roles.includes('super_admin')) {
        throw new BadRequestException('Official profile user must be a referee');
      }
      if ([...this.officialProfiles.values()].some((profile) => profile.userId === input.userId)) {
        throw new BadRequestException('Official profile already exists for user');
      }
      if (input.homeSchoolId && !this.schools.has(input.homeSchoolId)) {
        throw new NotFoundException('School not found');
      }
      const now = new Date().toISOString();
      const profile: OfficialProfileRecord = {
        id: this.nextId('off'),
        userId: input.userId,
        displayName: input.displayName,
        sports: [...input.sports],
        ...(input.certificationLevel ? { certificationLevel: input.certificationLevel } : {}),
        ...(input.homeSchoolId ? { homeSchoolId: input.homeSchoolId } : {}),
        ...(input.payoutRate !== undefined ? { payoutRate: input.payoutRate } : {}),
        ...(input.payoutCurrency ? { payoutCurrency: input.payoutCurrency } : {}),
        status: 'active',
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.officialProfiles.set(profile.id, profile);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'official.created',
        resource: 'official_profile',
        resourceId: profile.id,
        metadata: { userId: profile.userId },
      });
      return this.cloneOfficialProfile(profile);
    });
  }

  listOfficialProfiles() {
    return this.readOperation(() => ({
      officials: [...this.officialProfiles.values()].map((profile) =>
        this.cloneOfficialProfile(profile),
      ),
    }));
  }

  generateTournamentSchedule(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: {
      venueUnitIds: string[];
      startsAt: string;
      slotMinutes: number;
      matchDurationMinutes: number;
      minRestMinutes?: number;
    },
  ) {
    return this.withWrite(() => {
      const tournament = this.requireTournament(tournamentId);
      const venueUnits = input.venueUnitIds.map((venueUnitId) =>
        this.requireVenueUnit(venueUnitId),
      );
      if (!venueUnits.length) {
        throw new BadRequestException('At least one venueUnitId is required');
      }
      const matchesToSchedule = tournament.matchIds
        .map((matchId) => this.matches.get(matchId))
        .filter((match): match is MatchRecord => Boolean(match))
        .sort(
          (first, second) =>
            first.scheduledAt.localeCompare(second.scheduledAt) ||
            first.id.localeCompare(second.id),
        );
      if (!matchesToSchedule.length) {
        throw new BadRequestException('Tournament has no matches to schedule');
      }
      const now = new Date().toISOString();
      const generated: MatchScheduleRecord[] = [];
      const minRestMinutes = input.minRestMinutes ?? 0;

      for (const match of matchesToSchedule) {
        let candidateStart = this.normalizeIso(input.startsAt, 'startsAt');
        let scheduled: MatchScheduleRecord | undefined;
        for (let attempt = 0; attempt < 240 && !scheduled; attempt += 1) {
          for (const venueUnit of venueUnits) {
            const candidateEnd = addMinutes(candidateStart, input.matchDurationMinutes);
            const warnings = this.detectScheduleConflicts({
              match,
              venueUnitId: venueUnit.id,
              startsAt: candidateStart,
              endsAt: candidateEnd,
              tournamentId,
              minRestMinutes,
              draftSchedules: generated,
              excludeMatchId: match.id,
            });
            if (warnings.length === 0) {
              scheduled = this.upsertMatchSchedule(actor, match, {
                venueUnitId: venueUnit.id,
                startsAt: candidateStart,
                endsAt: candidateEnd,
                conflictWarnings: [],
                status: 'draft',
                now,
              });
              generated.push(scheduled);
              break;
            }
          }
          candidateStart = addMinutes(candidateStart, input.slotMinutes);
        }
        if (!scheduled) {
          throw new BadRequestException(`Unable to schedule match ${match.id}`);
        }
      }

      this.addAuditLog({
        actorUserId: actor.id,
        action: 'schedule.generated',
        resource: 'tournament',
        resourceId: tournamentId,
        metadata: { scheduleCount: generated.length },
      });
      return { schedules: generated.map((schedule) => this.cloneMatchSchedule(schedule)) };
    });
  }

  overrideMatchSchedule(
    actor: AuthenticatedUser,
    matchId: string,
    input: {
      venueUnitId: string;
      startsAt: string;
      endsAt: string;
      allowConflicts?: boolean;
      reason?: string;
    },
  ) {
    return this.withWrite(() => {
      const match = this.requireMatch(matchId);
      this.requireVenueUnit(input.venueUnitId);
      this.assertValidWindow(input.startsAt, input.endsAt);
      const warnings = this.detectScheduleConflicts({
        match,
        venueUnitId: input.venueUnitId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        tournamentId: match.tournamentId,
        minRestMinutes: 0,
        excludeMatchId: match.id,
      });
      if (warnings.length && !input.allowConflicts) {
        throw new BadRequestException('Schedule override conflicts with existing constraints');
      }
      if (warnings.length && !input.reason?.trim()) {
        throw new BadRequestException('Override reason is required');
      }
      const schedule = this.upsertMatchSchedule(actor, match, {
        venueUnitId: input.venueUnitId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        conflictWarnings: warnings,
        status: 'draft',
        ...(input.reason?.trim() ? { overrideReason: input.reason.trim() } : {}),
        now: new Date().toISOString(),
      });
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'schedule.override',
        resource: 'match',
        resourceId: match.id,
        metadata: {
          tournamentId: match.tournamentId,
          conflictCount: warnings.length,
          ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
        },
      });
      return this.cloneMatchSchedule(schedule);
    });
  }

  listTournamentSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.readOperation(() => {
      this.requireTournament(tournamentId);
      return {
        schedules: [...this.matchSchedules.values()]
          .filter((schedule) => schedule.tournamentId === tournamentId)
          .map((schedule) => this.cloneMatchSchedule(schedule)),
        assignments: [...this.officialAssignments.values()]
          .filter((assignment) => {
            const match = this.matches.get(assignment.matchId);
            return (
              match?.tournamentId === tournamentId &&
              this.assignmentVisibleToActor(actor, assignment)
            );
          })
          .map((assignment) => ({ ...assignment })),
      };
    });
  }

  publishTournamentSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.withWrite(() => {
      this.requireTournament(tournamentId);
      const now = new Date().toISOString();
      const schedules = [...this.matchSchedules.values()].filter(
        (schedule) => schedule.tournamentId === tournamentId,
      );
      for (const schedule of schedules) {
        this.matchSchedules.set(schedule.id, {
          ...schedule,
          status: 'published',
          publishedAt: now,
          publishedBy: actor.id,
          updatedAt: now,
          conflictWarnings: [...schedule.conflictWarnings],
        });
      }
      const notifications: ScheduleNotificationRecord[] = [];
      for (const assignment of this.officialAssignments.values()) {
        const match = this.matches.get(assignment.matchId);
        if (match?.tournamentId !== tournamentId) {
          continue;
        }
        const official = this.officialProfiles.get(assignment.officialProfileId);
        if (!official) {
          continue;
        }
        const notification: ScheduleNotificationRecord = {
          id: this.nextId('notif'),
          recipientUserId: official.userId,
          tournamentId,
          resourceType: 'official_assignment',
          resourceId: assignment.id,
          type: 'schedule_published',
          message: 'Tournament schedule published',
          status: 'pending',
          createdAt: now,
        };
        this.scheduleNotifications.set(notification.id, notification);
        notifications.push(notification);
      }
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'schedule.published',
        resource: 'tournament',
        resourceId: tournamentId,
        metadata: { scheduleCount: schedules.length, notificationCount: notifications.length },
      });
      return {
        schedules: schedules.map((schedule) =>
          this.cloneMatchSchedule(this.matchSchedules.get(schedule.id)!),
        ),
        notifications: notifications.map((notification) => ({ ...notification })),
      };
    });
  }

  unpublishTournamentSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.withWrite(() => {
      this.requireTournament(tournamentId);
      const now = new Date().toISOString();
      const schedules = [...this.matchSchedules.values()].filter(
        (schedule) => schedule.tournamentId === tournamentId,
      );
      for (const schedule of schedules) {
        this.matchSchedules.set(schedule.id, {
          ...schedule,
          status: 'unpublished',
          updatedAt: now,
          conflictWarnings: [...schedule.conflictWarnings],
        });
      }
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'schedule.unpublished',
        resource: 'tournament',
        resourceId: tournamentId,
        metadata: { scheduleCount: schedules.length },
      });
      return {
        schedules: schedules.map((schedule) =>
          this.cloneMatchSchedule(this.matchSchedules.get(schedule.id)!),
        ),
      };
    });
  }

  assignOfficialToMatch(
    actor: AuthenticatedUser,
    matchId: string,
    input: {
      officialProfileId: string;
      role: OfficialAssignmentRecord['role'];
    },
  ) {
    return this.withWrite(() => {
      const match = this.requireMatch(matchId);
      const profile = this.officialProfiles.get(input.officialProfileId);
      if (!profile || profile.status !== 'active') {
        throw new NotFoundException('Official profile not found');
      }
      const schedule = this.getMatchSchedule(match.id);
      if (!schedule) {
        throw new BadRequestException('Match must be scheduled before assigning officials');
      }
      const unavailable = [...this.availabilityWindows.values()].some(
        (window) =>
          window.status === 'blackout' &&
          window.resourceType === 'official' &&
          window.resourceId === profile.id &&
          (!window.tournamentId || window.tournamentId === match.tournamentId) &&
          overlaps(schedule.startsAt, schedule.endsAt, window.startsAt, window.endsAt),
      );
      if (unavailable) {
        throw new BadRequestException('Official is unavailable during this match');
      }
      const duplicate = [...this.officialAssignments.values()].find(
        (assignment) =>
          assignment.matchId === match.id &&
          assignment.officialProfileId === profile.id &&
          assignment.role === input.role,
      );
      if (duplicate) {
        throw new BadRequestException('Official is already assigned to this role');
      }
      const overlapping = [...this.officialAssignments.values()].find((assignment) => {
        if (assignment.officialProfileId !== profile.id || assignment.status === 'declined') {
          return false;
        }
        const otherSchedule = this.getMatchSchedule(assignment.matchId);
        return otherSchedule
          ? overlaps(
              schedule.startsAt,
              schedule.endsAt,
              otherSchedule.startsAt,
              otherSchedule.endsAt,
            )
          : false;
      });
      if (overlapping) {
        throw new BadRequestException('Official has an overlapping assignment');
      }
      const now = new Date().toISOString();
      const assignment: OfficialAssignmentRecord = {
        id: this.nextId('assign'),
        matchId,
        officialProfileId: profile.id,
        role: input.role,
        status: 'proposed',
        assignedBy: actor.id,
        assignedAt: now,
      };
      this.officialAssignments.set(assignment.id, assignment);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'official.assigned',
        resource: 'official_assignment',
        resourceId: assignment.id,
        metadata: { matchId, officialProfileId: profile.id },
      });
      return { ...assignment };
    });
  }

  respondToOfficialAssignment(
    actor: AuthenticatedUser,
    assignmentId: string,
    input: { status: 'accepted' | 'declined' },
  ) {
    return this.withWrite(() => {
      const assignment = this.requireOfficialAssignmentForActor(actor, assignmentId);
      if (assignment.status !== 'proposed') {
        throw new BadRequestException('Assignment can only be responded to while proposed');
      }
      const updated: OfficialAssignmentRecord = {
        ...assignment,
        status: input.status,
        respondedAt: new Date().toISOString(),
      };
      this.officialAssignments.set(updated.id, updated);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'official.responded',
        resource: 'official_assignment',
        resourceId: updated.id,
        metadata: { status: updated.status },
      });
      return { ...updated };
    });
  }

  checkInOfficialAssignment(actor: AuthenticatedUser, assignmentId: string) {
    return this.withWrite(() => {
      const assignment = this.requireOfficialAssignmentForActor(actor, assignmentId);
      if (assignment.status !== 'accepted') {
        throw new BadRequestException('Assignment must be accepted before check-in');
      }
      const updated: OfficialAssignmentRecord = {
        ...assignment,
        status: 'checked_in',
        checkedInAt: new Date().toISOString(),
      };
      this.officialAssignments.set(updated.id, updated);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'official.checked_in',
        resource: 'official_assignment',
        resourceId: updated.id,
        metadata: { matchId: updated.matchId },
      });
      return { ...updated };
    });
  }

  listScheduleNotifications(actor: AuthenticatedUser) {
    return this.readOperation(() => ({
      notifications: [...this.scheduleNotifications.values()]
        .filter((notification) =>
          actor.role === 'super_admin' ? true : notification.recipientUserId === actor.id,
        )
        .map((notification) => ({ ...notification })),
    }));
  }

  exportOfficialPayouts(actor: AuthenticatedUser, tournamentId: string) {
    return this.withWrite(() => {
      this.requireTournament(tournamentId);
      const assignments = [...this.officialAssignments.values()].filter((assignment) => {
        const match = this.matches.get(assignment.matchId);
        return match?.tournamentId === tournamentId && assignment.status === 'checked_in';
      });
      const now = new Date().toISOString();
      const exports = assignments.map((assignment) => {
        const profile = this.officialProfiles.get(assignment.officialProfileId);
        const payout: OfficialPayoutExportRecord = {
          id: this.nextId('payout'),
          tournamentId,
          officialProfileId: assignment.officialProfileId,
          assignmentIds: [assignment.id],
          amount: profile?.payoutRate ?? 0,
          currency: profile?.payoutCurrency ?? 'NPR',
          status: 'exported',
          createdBy: actor.id,
          createdAt: now,
        };
        this.officialPayoutExports.set(payout.id, payout);
        return payout;
      });
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'official_payout.exported',
        resource: 'tournament',
        resourceId: tournamentId,
        metadata: { exportCount: exports.length },
      });
      return { exports: exports.map((payout) => this.cloneOfficialPayout(payout)) };
    });
  }

  createBracket(actor: AuthenticatedUser, tournamentId: string, input: CreateBracketInput) {
    return this.withWrite(() => {
      const tournament = this.requireBracketTournament(tournamentId);
      const seedsInput = this.normalizeBracketSeeds(input.seeds);
      this.validateBracketSeedSet(tournament, seedsInput);

      const now = new Date().toISOString();
      const bracket: BracketRecord = {
        id: this.nextId('brk'),
        tournamentId,
        format: input.format,
        status: 'draft',
        activeVersionId: '',
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      const version: BracketVersionRecord = {
        id: this.nextId('bver'),
        bracketId: bracket.id,
        versionNumber: 1,
        status: 'draft',
        generationPolicy: 'initial',
        createdBy: actor.id,
        createdAt: now,
      };
      bracket.activeVersionId = version.id;
      this.brackets.set(bracket.id, bracket);
      this.bracketVersions.set(version.id, version);

      const seeds = this.createBracketSeedRecords(bracket.id, version.id, seedsInput, now);
      for (const seed of seeds) {
        this.bracketSeeds.set(seed.id, seed);
      }

      const nodes = this.generateBracketNodes(input.format, bracket.id, version.id, seeds, now);
      this.materializeReadyBracketMatches(actor, tournament.id, nodes, now);
      for (const node of nodes) {
        this.bracketNodes.set(node.id, this.cloneBracketNode(node));
      }
      this.recalculateStandings(bracket.id, version.id, now);

      this.addAuditLog({
        actorUserId: actor.id,
        action: 'bracket.created',
        resource: 'bracket',
        resourceId: bracket.id,
        metadata: {
          tournamentId,
          format: input.format,
        },
      });

      return this.buildBracketView(bracket.id, version.id)!;
    });
  }

  updateBracketSeeds(actor: AuthenticatedUser, bracketId: string, input: UpdateBracketSeedsInput) {
    return this.withWrite(() => {
      const bracket = this.requireBracket(bracketId);
      const version = this.requireBracketVersion(bracket.activeVersionId);
      if (version.status === 'published') {
        throw new BadRequestException('Published bracket seeds cannot be edited');
      }
      const currentSeeds = this.getVersionSeeds(version.id);
      const nextSeeds = this.normalizeBracketSeeds(input.seeds);
      this.assertLockedSeedsUnchanged(currentSeeds, nextSeeds);
      const tournament = this.requireBracketTournament(bracket.tournamentId);
      this.validateBracketSeedSet(tournament, nextSeeds);
      const currentNodes = this.getVersionNodes(version.id);
      const now = new Date().toISOString();
      this.deleteDraftVersionMatches(tournament.id, currentNodes, now);

      for (const seed of currentSeeds) {
        this.bracketSeeds.delete(seed.id);
      }
      for (const node of currentNodes) {
        this.bracketNodes.delete(node.id);
      }

      const seeds = this.createBracketSeedRecords(bracket.id, version.id, nextSeeds, now);
      for (const seed of seeds) {
        this.bracketSeeds.set(seed.id, seed);
      }
      const nodes = this.generateBracketNodes(bracket.format, bracket.id, version.id, seeds, now);
      this.materializeReadyBracketMatches(actor, bracket.tournamentId, nodes, now);
      for (const node of nodes) {
        this.bracketNodes.set(node.id, this.cloneBracketNode(node));
      }
      this.recalculateStandings(bracket.id, version.id, now);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'bracket.seeded',
        resource: 'bracket',
        resourceId: bracket.id,
        metadata: { versionId: version.id },
      });

      return this.buildBracketView(bracket.id, version.id)!;
    });
  }

  publishBracket(actor: AuthenticatedUser, bracketId: string) {
    return this.withWrite(() => {
      const bracket = this.requireBracket(bracketId);
      const version = this.requireBracketVersion(bracket.activeVersionId);
      const now = new Date().toISOString();
      const slug = bracket.publicSlug ?? this.uniquePublicBracketSlug(bracket.tournamentId);
      const updatedBracket: BracketRecord = {
        ...bracket,
        status: 'published',
        publishedVersionId: version.id,
        publicSlug: slug,
        publishedBy: actor.id,
        publishedAt: now,
        updatedAt: now,
      };
      const updatedVersion: BracketVersionRecord = {
        ...version,
        status: 'published',
      };
      this.brackets.set(bracket.id, updatedBracket);
      this.bracketVersions.set(version.id, updatedVersion);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'bracket.published',
        resource: 'bracket',
        resourceId: bracket.id,
        metadata: { versionId: version.id },
      });

      return this.buildBracketView(bracket.id, version.id)!;
    });
  }

  regenerateBracket(actor: AuthenticatedUser, bracketId: string, input: RegenerateBracketInput) {
    return this.withWrite(() => {
      const bracket = this.requireBracket(bracketId);
      const currentVersion = this.requireBracketVersion(bracket.activeVersionId);
      if (bracket.status === 'published' && !input.createNewVersion) {
        throw new BadRequestException('Published brackets require a new version for regeneration');
      }

      const tournament = this.requireBracketTournament(bracket.tournamentId);
      const seedInput =
        input.seeds ??
        this.getVersionSeeds(currentVersion.id).map((seed) => ({
          teamId: seed.teamId,
          seedNumber: seed.seedNumber,
          ...(seed.groupKey ? { groupKey: seed.groupKey } : {}),
          locked: seed.locked,
          withdrawn: seed.withdrawn,
        }));
      const normalizedSeeds = this.normalizeBracketSeeds(seedInput);
      this.validateBracketSeedSet(tournament, normalizedSeeds);

      const now = new Date().toISOString();
      const nextVersionNumber =
        Math.max(
          0,
          ...[...this.bracketVersions.values()]
            .filter((version) => version.bracketId === bracket.id)
            .map((version) => version.versionNumber),
        ) + 1;
      const version: BracketVersionRecord = {
        id: this.nextId('bver'),
        bracketId: bracket.id,
        versionNumber: nextVersionNumber,
        status: 'draft',
        generationPolicy: 'regenerated',
        ...(input.notes ? { notes: input.notes } : {}),
        createdBy: actor.id,
        createdAt: now,
      };
      const updatedBracket: BracketRecord = {
        ...bracket,
        activeVersionId: version.id,
        updatedAt: now,
      };
      this.bracketVersions.set(version.id, version);
      this.brackets.set(bracket.id, updatedBracket);

      const seeds = this.createBracketSeedRecords(bracket.id, version.id, normalizedSeeds, now);
      for (const seed of seeds) {
        this.bracketSeeds.set(seed.id, seed);
      }
      const nodes = this.generateBracketNodes(bracket.format, bracket.id, version.id, seeds, now);
      this.materializeReadyBracketMatches(actor, bracket.tournamentId, nodes, now);
      for (const node of nodes) {
        this.bracketNodes.set(node.id, this.cloneBracketNode(node));
      }
      this.recalculateStandings(bracket.id, version.id, now);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'bracket.regenerated',
        resource: 'bracket',
        resourceId: bracket.id,
        metadata: { versionId: version.id, previousVersionId: currentVersion.id },
      });

      return this.buildBracketView(bracket.id, version.id)!;
    });
  }

  getBracketView(actor: AuthenticatedUser, bracketId: string, versionId?: string) {
    return this.readOperation(() => {
      const bracket = this.brackets.get(bracketId);
      if (!bracket) {
        return undefined;
      }
      const effectiveVersionId = versionId ?? bracket.activeVersionId;
      const version = this.bracketVersions.get(effectiveVersionId);
      if (!version || version.bracketId !== bracket.id) {
        return undefined;
      }
      this.assertBracketReadAccess(actor, bracket, effectiveVersionId);
      return this.buildBracketView(bracketId, effectiveVersionId);
    });
  }

  getPublicBracketView(slug: string) {
    return this.readOperation(() => {
      const bracket = [...this.brackets.values()].find(
        (candidate) => candidate.publicSlug === slug,
      );
      if (!bracket || bracket.status !== 'published' || !bracket.publishedVersionId) {
        return undefined;
      }
      const view = this.buildBracketView(bracket.id, bracket.publishedVersionId);
      if (!view || !bracket.publicSlug) {
        return undefined;
      }
      return this.toPublicBracketView(view, bracket.publicSlug);
    });
  }

  listBracketStandings(actor: AuthenticatedUser, bracketId: string, groupKey?: string) {
    return this.withWrite(() => {
      const bracket = this.requireBracket(bracketId);
      this.assertBracketReadAccess(actor, bracket, bracket.activeVersionId);
      const now = new Date().toISOString();
      this.recalculateStandings(bracket.id, bracket.activeVersionId, now);
      const rows = this.getVersionStandings(bracket.activeVersionId)
        .filter((row) => (groupKey ? row.groupKey === groupKey : true))
        .map((row) => ({ ...row }));
      return { rows };
    });
  }

  verifyMatchAndAdvanceBracket(actor: AuthenticatedUser, matchId: string) {
    return this.withWrite(() => {
      const match = this.matches.get(matchId);
      if (!match) {
        throw new NotFoundException('Match not found');
      }

      if (match.status !== 'played') {
        throw new BadRequestException('Match must be played before verification');
      }

      const node = [...this.bracketNodes.values()].find(
        (candidate) => candidate.matchId === matchId,
      );
      if (node && !node.homeTeamId) {
        throw new BadRequestException('Bracket node is missing teams');
      }
      if (
        node &&
        node.bracketSide !== 'group' &&
        match.homeScore !== undefined &&
        match.homeScore === match.awayScore
      ) {
        throw new BadRequestException('Elimination bracket matches require a winner');
      }
      if (node) {
        this.assertBracketAdvancementCanApply(match, node);
      }

      const now = new Date().toISOString();
      match.status = 'verified';
      match.verifiedBy = actor.id;
      match.verifiedAt = now;
      match.updatedAt = now;
      this.matches.set(match.id, match);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'match.verified',
        resource: 'match',
        resourceId: match.id,
        metadata: {
          resultHome: match.homeScore ?? 0,
          resultAway: match.awayScore ?? 0,
        },
      });

      if (node) {
        this.advanceBracketNodeFromVerifiedMatch(actor, match, node, now);
      }

      return { ...match };
    });
  }

  advanceBracketFromVerifiedMatch(actor: AuthenticatedUser, matchId: string) {
    return this.withWrite(() => {
      const match = this.matches.get(matchId);
      if (!match || match.status !== 'verified') {
        return undefined;
      }
      const node = [...this.bracketNodes.values()].find(
        (candidate) => candidate.matchId === matchId,
      );
      if (!node) {
        return undefined;
      }
      return this.advanceBracketNodeFromVerifiedMatch(actor, match, node, new Date().toISOString());
    });
  }

  private advanceBracketNodeFromVerifiedMatch(
    actor: AuthenticatedUser,
    match: MatchRecord,
    node: BracketNodeRecord,
    now: string,
  ) {
    const bracket = this.requireBracket(node.bracketId);
    if (node.status === 'completed') {
      return this.buildBracketView(bracket.id, node.versionId);
    }

    this.assertBracketAdvancementCanApply(match, node);
    const { winnerTeamId, loserTeamId } = this.getBracketMatchOutcome(match, node);
    const routes = this.getBracketAdvancementRoutes(node, winnerTeamId, loserTeamId);
    const completedNode: BracketNodeRecord = {
      ...node,
      winnerTeamId,
      loserTeamId,
      status: 'completed',
      updatedAt: now,
      sourceNodeIds: [...node.sourceNodeIds],
    };
    this.bracketNodes.set(node.id, completedNode);

    for (const route of routes) {
      this.fillBracketNodeSlot(
        actor,
        bracket.tournamentId,
        route.nodeId,
        route.teamId,
        now,
        route.sourceNodeId,
      );
    }
    this.resolveIfNecessaryFinal(actor, bracket.tournamentId, node, winnerTeamId, loserTeamId, now);

    this.recalculateStandings(bracket.id, node.versionId, now);
    this.addAuditLog({
      actorUserId: actor.id,
      action: 'bracket.advanced',
      resource: 'bracket',
      resourceId: bracket.id,
      metadata: { matchId: match.id, nodeId: node.id, winnerTeamId },
    });

    return this.buildBracketView(bracket.id, node.versionId);
  }

  private assertBracketAdvancementCanApply(match: MatchRecord, node: BracketNodeRecord) {
    const { winnerTeamId, loserTeamId } = this.getBracketMatchOutcome(match, node);
    const routes = [
      ...(node.nextNodeId
        ? [{ nodeId: node.nextNodeId, teamId: winnerTeamId, sourceNodeId: node.id }]
        : []),
      ...(node.loserNextNodeId && node.bracketSide !== 'group'
        ? [{ nodeId: node.loserNextNodeId, teamId: loserTeamId, sourceNodeId: node.id }]
        : []),
    ];
    for (const route of routes) {
      this.assertBracketNodeSlotCanAccept(route.nodeId, route.teamId, route.sourceNodeId);
    }
    this.assertIfNecessaryFinalCanResolve(node, winnerTeamId, loserTeamId);
  }

  private getBracketAdvancementRoutes(
    node: BracketNodeRecord,
    winnerTeamId: string,
    loserTeamId: string,
  ) {
    return [
      ...(node.nextNodeId
        ? [{ nodeId: node.nextNodeId, teamId: winnerTeamId, sourceNodeId: node.id }]
        : []),
      ...(node.loserNextNodeId && node.bracketSide !== 'group'
        ? [{ nodeId: node.loserNextNodeId, teamId: loserTeamId, sourceNodeId: node.id }]
        : []),
    ];
  }

  ensureBracketMatchCanBeVerified(matchId: string) {
    return this.readOperation(() => {
      const match = this.matches.get(matchId);
      const node = [...this.bracketNodes.values()].find(
        (candidate) => candidate.matchId === matchId,
      );
      if (!match || !node || node.bracketSide === 'group') {
        return;
      }
      if (match.homeScore !== undefined && match.homeScore === match.awayScore) {
        throw new BadRequestException('Elimination bracket matches require a winner');
      }
    });
  }

  listMatches(tournamentId?: string) {
    return this.readOperation(() =>
      [...this.matches.values()]
        .filter((match) => (tournamentId ? match.tournamentId === tournamentId : true))
        .map((match) => ({ ...match })),
    );
  }

  listMatchEvents(matchId: string) {
    return this.readOperation(() =>
      [...this.matchEvents.values()]
        .filter((event) => event.matchId === matchId)
        .map((event) => ({ ...event })),
    );
  }

  getMatch(matchId: string) {
    return this.readOperation(() => {
      const match = this.matches.get(matchId);
      return match ? { ...match } : undefined;
    });
  }

  getMatchDerivedStats(matchId: string) {
    return this.readOperation(() => {
      const match = this.matches.get(matchId);
      if (!match) {
        return undefined;
      }

      const activeEvents = this.getActiveMatchEvents(matchId);
      return this.aggregateMatchStats(match, activeEvents);
    });
  }

  getTournamentLeaderboard(tournamentId: string, limit = 50) {
    return this.readOperation(() => {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }

      const athleteTotals = this.computeTournamentAthleteStats(tournamentId);
      const ranked = [...athleteTotals].sort((first, second) => {
        if (second.goals !== first.goals) {
          return second.goals - first.goals;
        }
        if (second.assists !== first.assists) {
          return second.assists - first.assists;
        }
        return second.yellowCards - first.yellowCards;
      });

      return {
        tournamentId,
        leaderboard: ranked.slice(0, limit),
        totalEntries: ranked.length,
      };
    });
  }

  generateQrCode(actor: AuthenticatedUser, resourceType: QrResourceType, resourceId: string) {
    return this.withWrite(() => {
      const record = this.getResourceByTypeForQr(resourceType, resourceId);
      if (!record) {
        throw new NotFoundException(`${resourceType} not found`);
      }

      const code = `qr_${this.randomToken(32)}`;
      const qr: QrCodeRecord = {
        code,
        resourceType,
        resourceId: record.id,
        createdBy: actor.id,
        createdAt: new Date().toISOString(),
      };

      this.qrCodes.set(code, qr);

      return {
        ...qr,
      };
    });
  }

  getPublicQr(resourceType: QrResourceType, code: string) {
    return this.readOperation(() => {
      const qr = this.qrCodes.get(code);
      if (!qr || qr.resourceType !== resourceType) {
        return undefined;
      }
      const resource = this.getResourceByTypeForQr(resourceType, qr.resourceId);
      if (!resource) {
        return undefined;
      }
      return {
        code,
        resourceType,
        resourceId: qr.resourceId,
      };
    });
  }

  addFederationOverride(
    actor: AuthenticatedUser,
    payload: {
      scope: string;
      targetId: string;
      field: string;
      reason?: string;
    },
  ) {
    return this.withWrite(() => {
      const action = 'analytics.override_recorded';
      this.addAuditLog({
        actorUserId: actor.id,
        action,
        resource: payload.scope,
        resourceId: payload.targetId,
        metadata: {
          field: payload.field,
          ...(payload.reason ? { reason: payload.reason } : {}),
        },
      });
      return {
        ok: true,
        action,
        scope: payload.scope,
        targetId: payload.targetId,
      };
    });
  }

  createAnalyticsReportDraft(
    actor: AuthenticatedUser,
    payload: Omit<
      AnalyticsReportDraftRecord,
      'id' | 'status' | 'requiresApproval' | 'createdBy' | 'createdAt' | 'updatedAt'
    >,
  ) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const draft: AnalyticsReportDraftRecord = {
        id: this.nextId('ard'),
        ...payload,
        status: 'draft',
        requiresApproval: true,
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.analyticsReportDrafts.set(draft.id, draft);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'analytics.report_draft_created',
        resource: 'analytics_report',
        resourceId: draft.id,
        metadata: {
          reportType: draft.reportType,
          scope: draft.scope,
        },
      });
      return this.cloneAnalyticsReportDraft(draft);
    });
  }

  approveAnalyticsReportDraft(actor: AuthenticatedUser, draftId: string, note?: string) {
    return this.withWrite(() => {
      const draft = this.analyticsReportDrafts.get(draftId);
      if (!draft) {
        throw new NotFoundException('Analytics report draft not found');
      }
      const now = new Date().toISOString();
      const approved: AnalyticsReportDraftRecord = {
        ...draft,
        status: 'approved',
        approvedBy: actor.id,
        approvedAt: now,
        ...(note ? { approvalNote: note } : {}),
        updatedAt: now,
      };
      this.analyticsReportDrafts.set(draftId, approved);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'analytics.report_draft_approved',
        resource: 'analytics_report',
        resourceId: draftId,
        metadata: note ? { note } : {},
      });
      return this.cloneAnalyticsReportDraft(approved);
    });
  }

  createSpreadsheetImportPreview(
    actor: AuthenticatedUser,
    payload: {
      sourceName: string;
      entityType: ImportEntityType;
      rows: Array<Record<string, string | number | boolean | null>>;
    },
  ) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const errors = payload.rows.flatMap((row, rowIndex) =>
        this.validateImportRow(payload.entityType, row, rowIndex),
      );
      const invalidRowIndexes = new Set(errors.map((error) => error.rowIndex));
      const record: SpreadsheetImportRecord = {
        id: this.nextId('imp'),
        sourceName: payload.sourceName,
        entityType: payload.entityType,
        status: 'previewed',
        totalRows: payload.rows.length,
        validRows: payload.rows.length - invalidRowIndexes.size,
        invalidRows: invalidRowIndexes.size,
        errors,
        rows: payload.rows.map((row) => ({ ...row })),
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.spreadsheetImports.set(record.id, record);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'integrations.import_previewed',
        resource: 'spreadsheet_import',
        resourceId: record.id,
        metadata: { entityType: record.entityType, validRows: record.validRows },
      });
      return this.cloneSpreadsheetImport(record);
    });
  }

  commitSpreadsheetImport(actor: AuthenticatedUser, importId: string) {
    return this.withWrite(() => {
      const record = this.spreadsheetImports.get(importId);
      if (!record) {
        throw new NotFoundException('Import not found');
      }
      if (record.status !== 'previewed') {
        throw new BadRequestException('Only previewed imports can be committed');
      }
      const now = new Date().toISOString();
      const committed: SpreadsheetImportRecord = {
        ...record,
        status: 'committed',
        committedRows: record.validRows,
        committedBy: actor.id,
        committedAt: now,
        updatedAt: now,
      };
      this.spreadsheetImports.set(importId, committed);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'integrations.import_committed',
        resource: 'spreadsheet_import',
        resourceId: importId,
        metadata: { committedRows: record.validRows },
      });
      return this.cloneSpreadsheetImport(committed);
    });
  }

  rollbackSpreadsheetImport(actor: AuthenticatedUser, importId: string, reason: string) {
    return this.withWrite(() => {
      const record = this.spreadsheetImports.get(importId);
      if (!record) {
        throw new NotFoundException('Import not found');
      }
      const now = new Date().toISOString();
      const rolledBack: SpreadsheetImportRecord = {
        ...record,
        status: 'rolled_back',
        rollbackReason: reason,
        rolledBackBy: actor.id,
        rolledBackAt: now,
        updatedAt: now,
      };
      this.spreadsheetImports.set(importId, rolledBack);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'integrations.import_rolled_back',
        resource: 'spreadsheet_import',
        resourceId: importId,
        metadata: { reason },
      });
      return this.cloneSpreadsheetImport(rolledBack);
    });
  }

  createPartnerApiKey(
    actor: AuthenticatedUser,
    payload: { partnerName: string; scopes: string[]; expiresAt?: string },
  ) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const secret = `atlq_live_${this.randomToken(32)}`;
      const secretHash = `sha256:${createHash('sha256').update(secret).digest('hex')}`;
      const record: PartnerApiKeyRecord = {
        id: this.nextId('pak'),
        partnerName: payload.partnerName,
        keyPrefix: secret.slice(0, 18),
        secretHash,
        scopes: [...payload.scopes],
        status: 'active',
        ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
        createdBy: actor.id,
        createdAt: now,
      };
      this.partnerApiKeys.set(record.id, record);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'integrations.api_key_created',
        resource: 'partner_api_key',
        resourceId: record.id,
        metadata: { partnerName: record.partnerName },
      });
      return {
        id: record.id,
        partnerName: record.partnerName,
        keyPrefix: record.keyPrefix,
        scopes: [...record.scopes],
        status: record.status,
        ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
        createdBy: record.createdBy,
        createdAt: record.createdAt,
        secret,
      };
    });
  }

  createExportBundle(
    actor: AuthenticatedUser,
    payload: { tournamentId: string; formats: string[]; include: string[] },
  ) {
    return this.withWrite(() => {
      const tournament = this.tournaments.get(payload.tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const record: ExportBundleRecord = {
        id: this.nextId('exp'),
        tournamentId: payload.tournamentId,
        formats: [...payload.formats],
        include: [...payload.include],
        status: 'ready',
        downloadUrl: `/api/integrations/export-bundles/${payload.tournamentId}/${this.randomToken(12)}`,
        expiresAt,
        createdBy: actor.id,
        createdAt: now.toISOString(),
      };
      this.exportBundles.set(record.id, record);
      return { ...record, formats: [...record.formats], include: [...record.include] };
    });
  }

  createWebhookSubscription(
    actor: AuthenticatedUser,
    payload: { url: string; events: string[]; secretLabel?: string },
  ) {
    return this.withWrite(() => {
      const now = new Date().toISOString();
      const record: WebhookSubscriptionRecord = {
        id: this.nextId('whk'),
        url: payload.url,
        events: [...payload.events],
        ...(payload.secretLabel ? { secretLabel: payload.secretLabel } : {}),
        status: 'active',
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.webhookSubscriptions.set(record.id, record);
      return { ...record, events: [...record.events] };
    });
  }

  createWebhookTestDelivery(actor: AuthenticatedUser, webhookId: string, event: string) {
    return this.withWrite(() => {
      const webhook = this.webhookSubscriptions.get(webhookId);
      if (!webhook) {
        throw new NotFoundException('Webhook subscription not found');
      }
      if (!webhook.events.includes(event)) {
        throw new BadRequestException('Webhook is not subscribed to this event');
      }
      const record: WebhookDeliveryRecord = {
        id: this.nextId('whd'),
        webhookId,
        event,
        status: 'delivered',
        attempt: 1,
        responseCode: 202,
        createdAt: new Date().toISOString(),
      };
      this.webhookDeliveries.set(record.id, record);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'integrations.webhook_test_delivered',
        resource: 'webhook_subscription',
        resourceId: webhookId,
        metadata: { event },
      });
      return { ...record };
    });
  }

  getPublicTournamentFixtures(tournamentId: string) {
    return this.readOperation(() => {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }
      if (tournament.status === 'draft' || tournament.status === 'cancelled') {
        throw new NotFoundException('Tournament not found');
      }
      const matches = [...this.matches.values()]
        .filter((match) => match.tournamentId === tournamentId)
        .sort((first, second) => first.scheduledAt.localeCompare(second.scheduledAt))
        .map((match) => ({
          matchId: match.id,
          tournamentId,
          scheduledAt: match.scheduledAt,
          status: match.status,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: this.teams.get(match.homeTeamId)?.name ?? 'TBD',
          awayTeamName: this.teams.get(match.awayTeamId)?.name ?? 'TBD',
        }));
      return {
        tournamentId,
        tournamentName: tournament.name,
        sport: tournament.sport,
        matches,
      };
    });
  }

  async getPublicTournamentResults(tournamentId: string) {
    const fixtures = await this.getPublicTournamentFixtures(tournamentId);
    return this.readOperation(() => {
      return {
        tournamentId,
        tournamentName: fixtures.tournamentName,
        results: fixtures.matches
          .map((match) => {
            const source = this.matches.get(match.matchId);
            return {
              ...match,
              homeScore: source?.homeScore ?? null,
              awayScore: source?.awayScore ?? null,
            };
          })
          .filter((match) => match.status === 'verified'),
      };
    });
  }

  recordQrScan(actor: AuthenticatedUser, code: string) {
    return this.withWrite(() => {
      const qr = this.qrCodes.get(code);
      if (!qr) {
        throw new NotFoundException('QR code not found');
      }

      this.addAuditLog({
        actorUserId: actor.id,
        action: 'qr.scanned',
        resource: qr.resourceType,
        resourceId: qr.resourceId,
        metadata: {
          code,
        },
      });

      return {
        scanned: true,
        code,
      };
    });
  }

  pushSyncMutations(params: {
    actor: AuthenticatedUser;
    tenantId: string;
    clientId: string;
    mutations: Array<{
      id: string;
      mutationType: string;
      payload: Record<string, unknown>;
    }>;
  }) {
    return this.withWrite(async () => {
      if (!params.clientId.trim()) {
        throw new BadRequestException('clientId is required');
      }
      if (!params.mutations.length) {
        throw new BadRequestException('mutations are required');
      }

      const now = new Date().toISOString();
      const responses: Array<SyncMutationRecord> = [];

      for (const input of params.mutations) {
        if (!input.id?.trim() || !input.mutationType?.trim()) {
          throw new BadRequestException('Each mutation requires id and mutationType');
        }

        const key = `${params.tenantId}:${params.clientId}:${input.id}`;
        const existing = this.syncMutations.get(key);
        if (existing) {
          responses.push({ ...existing });
          continue;
        }

        const pending: SyncMutationRecord = {
          id: input.id,
          tenantId: params.tenantId,
          clientId: params.clientId,
          actorUserId: params.actor.id,
          status: 'pending',
          mutationType: input.mutationType,
          mutationPayload: input.payload,
          createdAt: now,
          updatedAt: now,
        };

        try {
          await this.applyMutation(params.actor, input);
          pending.status = 'synced';
        } catch (error) {
          if (error instanceof BadRequestException) {
            pending.status = 'conflict';
            pending.errorReason = error.message;
          } else {
            pending.status = 'failed';
            pending.errorReason = error instanceof Error ? error.message : 'sync failed';
          }
        }
        pending.updatedAt = new Date().toISOString();

        const record = {
          ...pending,
          mutationPayload: { ...pending.mutationPayload },
        } as SyncMutationRecord;
        this.syncMutations.set(key, record);
        this.addAuditLog({
          actorUserId: params.actor.id,
          action: `sync.${input.mutationType}.received`,
          resource: 'sync_mutation',
          resourceId: key,
          metadata: {
            clientId: params.clientId,
            mutationId: input.id,
            tenantId: params.tenantId,
          },
        });
        responses.push(record);
      }

      return {
        clientId: params.clientId,
        mutations: responses.map((entry) => ({ ...entry })),
      };
    });
  }

  listSyncMutations(tenantId: string, clientId: string) {
    return this.readOperation(() =>
      [...this.syncMutations.values()]
        .filter((mutation) => mutation.tenantId === tenantId && mutation.clientId === clientId)
        .map((mutation) => ({ ...mutation, mutationPayload: { ...mutation.mutationPayload } })),
    );
  }

  searchCatalog(query: string): Promise<SearchResults> {
    return this.readOperation(() => {
      const normalized = query.trim().toLowerCase();
      if (!normalized) {
        return {
          schools: [],
          athletes: [],
          tournaments: [],
          teams: [],
          matches: [],
        };
      }

      const schoolHits = [...this.schools.values()].filter((school) =>
        school.name.toLowerCase().includes(normalized),
      );
      const athleteHits = [...this.athletes.values()].filter((athlete) =>
        athlete.fullName.toLowerCase().includes(normalized),
      );
      const tournamentHits = [...this.tournaments.values()].filter(
        (tournament) =>
          tournament.name.toLowerCase().includes(normalized) ||
          tournament.sport.toLowerCase().includes(normalized),
      );
      const teamHits = [...this.teams.values()].filter((team) =>
        team.name.toLowerCase().includes(normalized),
      );
      const matchHits = [...this.matches.values()].filter(
        (match) =>
          match.homeTeamId.toLowerCase().includes(normalized) ||
          match.awayTeamId.toLowerCase().includes(normalized) ||
          match.id.toLowerCase().includes(normalized),
      );

      return {
        schools: schoolHits.map((school) => ({
          id: school.id,
          name: school.name,
          status: school.status,
        })),
        athletes: athleteHits.map((athlete) => ({
          id: athlete.id,
          fullName: athlete.fullName,
          schoolId: athlete.schoolId,
        })),
        tournaments: tournamentHits.map((tournament) => ({
          id: tournament.id,
          name: tournament.name,
          sport: tournament.sport,
        })),
        teams: teamHits.map((team) => ({
          id: team.id,
          name: team.name,
          schoolId: team.schoolId,
          tournamentId: team.tournamentId,
        })),
        matches: matchHits.map((match) => ({
          id: match.id,
          tournamentId: match.tournamentId,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
        })),
      };
    });
  }

  createMatch(params: {
    actor: AuthenticatedUser;
    tournamentId: string;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: string;
  }) {
    return this.withWrite(() => {
      const tournament = this.tournaments.get(params.tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }
      if (tournament.status !== 'approved' && tournament.status !== 'active') {
        throw new BadRequestException('Tournament must be approved before creating matches');
      }

      const homeTeam = this.teams.get(params.homeTeamId);
      const awayTeam = this.teams.get(params.awayTeamId);
      if (!homeTeam || !awayTeam) {
        throw new BadRequestException('Both teams must exist');
      }
      if (
        homeTeam.tournamentId !== params.tournamentId ||
        awayTeam.tournamentId !== params.tournamentId
      ) {
        throw new BadRequestException('Both teams must belong to this tournament');
      }
      if (homeTeam.status !== 'approved' || awayTeam.status !== 'approved') {
        throw new BadRequestException('Both teams must be approved');
      }
      if (homeTeam.id === awayTeam.id) {
        throw new BadRequestException('A team cannot play itself');
      }

      const now = new Date().toISOString();
      const match: MatchRecord = {
        id: this.nextId('mch'),
        tournamentId: params.tournamentId,
        homeTeamId: params.homeTeamId,
        awayTeamId: params.awayTeamId,
        scheduledAt: params.scheduledAt,
        status: 'scheduled',
        createdBy: params.actor.id,
        createdAt: now,
        updatedAt: now,
      };

      this.matches.set(match.id, match);
      this.addAuditLog({
        actorUserId: params.actor.id,
        action: 'match.created',
        resource: 'match',
        resourceId: match.id,
        metadata: {
          tournamentId: params.tournamentId,
          homeTeamId: params.homeTeamId,
          awayTeamId: params.awayTeamId,
        },
      });
      this.tournaments.set(params.tournamentId, {
        ...tournament,
        matchIds: [...tournament.matchIds, match.id],
        updatedAt: new Date().toISOString(),
        status: tournament.status,
      });

      return { ...match };
    });
  }

  submitMatchResult(actor: AuthenticatedUser, matchId: string, payload: MatchReport) {
    return this.withWrite(() => {
      const match = this.matches.get(matchId);
      if (!match) {
        throw new NotFoundException('Match not found');
      }

      const homeScore = payload.homeScore;
      const awayScore = payload.awayScore;

      if (homeScore < 0 || awayScore < 0) {
        throw new BadRequestException('Scores must be positive');
      }

      match.status = 'played';
      match.homeScore = homeScore;
      match.awayScore = awayScore;
      match.report = {
        ...(payload.sportStats ?? {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      };
      match.submittedBy = actor.id;
      match.submittedAt = new Date().toISOString();
      match.updatedAt = new Date().toISOString();

      this.matches.set(match.id, match);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'match.result_submitted',
        resource: 'match',
        resourceId: match.id,
        metadata: {
          homeScore,
          awayScore,
        },
      });

      return { ...match };
    });
  }

  verifyMatch(actor: AuthenticatedUser, matchId: string) {
    return this.withWrite(() => {
      const match = this.matches.get(matchId);
      if (!match) {
        throw new NotFoundException('Match not found');
      }

      if (match.status !== 'played') {
        throw new BadRequestException('Match must be played before verification');
      }

      match.status = 'verified';
      match.verifiedBy = actor.id;
      match.verifiedAt = new Date().toISOString();
      match.updatedAt = new Date().toISOString();

      this.matches.set(match.id, match);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'match.verified',
        resource: 'match',
        resourceId: match.id,
        metadata: {
          resultHome: match.homeScore ?? 0,
          resultAway: match.awayScore ?? 0,
        },
      });

      return { ...match };
    });
  }

  submitMatchEvent(
    actor: AuthenticatedUser,
    matchId: string,
    payload: {
      athleteId: string;
      teamId: string;
      type: MatchEventType;
      minute?: number;
      details?: string;
      quantity?: number;
    },
  ) {
    return this.withWrite(() => {
      const match = this.matches.get(matchId);
      if (!match) {
        throw new NotFoundException('Match not found');
      }

      if (!this.isMatchCapturable(match.status)) {
        throw new BadRequestException('Match is not ready for stat capture');
      }

      this.validateAthleteTeamForMatch(match, payload.athleteId, payload.teamId);
      const now = new Date().toISOString();
      const validatedQuantity = this.validateEventQuantity(payload.quantity);
      const normalizedMinute = this.normalizeMatchMinute(payload.minute);
      const eventDetails = payload.details?.trim();

      const event: MatchEventRecord = {
        id: this.nextId('evt'),
        matchId: match.id,
        tournamentId: match.tournamentId,
        athleteId: payload.athleteId,
        teamId: payload.teamId,
        type: payload.type,
        quantity: validatedQuantity,
        status: 'active',
        createdBy: actor.id,
        createdAt: now,
        ...(normalizedMinute !== undefined ? { minute: normalizedMinute } : {}),
        ...(eventDetails ? { details: eventDetails } : {}),
      };

      this.matchEvents.set(event.id, event);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'match.event_submitted',
        resource: 'match_event',
        resourceId: event.id,
        metadata: {
          matchId: match.id,
          teamId: payload.teamId,
          athleteId: payload.athleteId,
          eventType: payload.type,
          quantity: validatedQuantity,
        },
      });

      return {
        ...event,
      };
    });
  }

  correctMatchEvent(
    actor: AuthenticatedUser,
    matchId: string,
    eventId: string,
    payload: {
      athleteId: string;
      teamId: string;
      type: MatchEventType;
      minute?: number;
      details?: string;
      quantity?: number;
      reason?: string;
    },
  ) {
    return this.withWrite(() => {
      const match = this.matches.get(matchId);
      if (!match) {
        throw new NotFoundException('Match not found');
      }

      if (!this.isMatchCapturable(match.status)) {
        throw new BadRequestException('Match is not ready for stat capture');
      }

      const currentEvent = this.matchEvents.get(eventId);
      if (!currentEvent || currentEvent.matchId !== matchId) {
        throw new NotFoundException('Match event not found');
      }

      if (currentEvent.status === 'superseded') {
        throw new BadRequestException('This event has already been corrected');
      }

      this.validateAthleteTeamForMatch(match, payload.athleteId, payload.teamId);
      const now = new Date().toISOString();
      const validatedQuantity = this.validateEventQuantity(payload.quantity);
      const normalizedMinute = this.normalizeMatchMinute(payload.minute);
      const eventDetails = payload.details?.trim();

      const correctedEvent: MatchEventRecord = {
        id: this.nextId('evt'),
        matchId: match.id,
        tournamentId: match.tournamentId,
        athleteId: payload.athleteId,
        teamId: payload.teamId,
        type: payload.type,
        quantity: validatedQuantity,
        status: 'active',
        createdBy: actor.id,
        createdAt: now,
        correctedFromEventId: eventId,
        ...(normalizedMinute !== undefined ? { minute: normalizedMinute } : {}),
        ...(eventDetails ? { details: eventDetails } : {}),
        ...(payload.reason ? { correctionReason: payload.reason } : {}),
      };

      this.matchEvents.set(correctedEvent.id, correctedEvent);
      this.matchEvents.set(eventId, {
        ...currentEvent,
        status: 'superseded',
        correctedBy: actor.id,
        correctedAt: now,
        ...(payload.reason ? { reason: payload.reason } : {}),
      });

      this.addAuditLog({
        actorUserId: actor.id,
        action: 'match.event_corrected',
        resource: 'match_event',
        resourceId: correctedEvent.id,
        metadata: {
          originalEventId: eventId,
          matchId: match.id,
          correctedEventId: correctedEvent.id,
          eventType: payload.type,
          quantity: validatedQuantity,
        },
      });

      return {
        ...correctedEvent,
      };
    });
  }

  linkGuardianToAthlete(
    actor: AuthenticatedUser,
    input: {
      guardianUserId: string;
      athleteId: string;
      relationship: string;
    },
  ) {
    return this.withWrite(() => {
      const guardian = this.users.get(input.guardianUserId);
      if (!guardian || !guardian.roles.includes('guardian')) {
        throw new NotFoundException('Guardian user not found');
      }
      const athlete = this.athletes.get(input.athleteId);
      if (!athlete) {
        throw new NotFoundException('Athlete not found');
      }
      if (actor.role !== 'super_admin' && !actor.schoolIds.includes(athlete.schoolId)) {
        throw new ForbiddenException('Cannot link guardian outside your school scope');
      }
      const existing = [...this.guardianAthleteLinks.values()].find(
        (link) => link.guardianUserId === guardian.id && link.athleteId === athlete.id,
      );
      if (existing) {
        return { ...existing };
      }
      const now = new Date().toISOString();
      const link: GuardianAthleteLinkRecord = {
        id: this.nextId('gal'),
        guardianUserId: guardian.id,
        athleteId: athlete.id,
        schoolId: athlete.schoolId,
        relationship: input.relationship,
        createdBy: actor.id,
        createdAt: now,
      };
      this.guardianAthleteLinks.set(link.id, link);
      if (!guardian.schoolIds.includes(athlete.schoolId)) {
        guardian.schoolIds = [...guardian.schoolIds, athlete.schoolId];
        guardian.updatedAt = now;
        this.users.set(guardian.id, guardian);
      }
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'communications.guardian_linked',
        resource: 'athlete',
        resourceId: athlete.id,
        metadata: { guardianUserId: guardian.id, schoolId: athlete.schoolId },
      });
      return { ...link };
    });
  }

  getFamilyDashboard(actor: AuthenticatedUser, guardianUserId?: string) {
    return this.readOperation(() => {
      const targetUserId = guardianUserId ?? actor.id;
      if (actor.role !== 'super_admin' && actor.id !== targetUserId) {
        throw new ForbiddenException('Cannot read another guardian dashboard');
      }
      const guardian = this.users.get(targetUserId);
      if (!guardian || !guardian.roles.includes('guardian')) {
        throw new NotFoundException('Guardian user not found');
      }
      const links = [...this.guardianAthleteLinks.values()].filter(
        (link) => link.guardianUserId === guardian.id,
      );
      const schoolIds = new Set(links.map((link) => link.schoolId));
      const athletes = links
        .map((link) => {
          const athlete = this.athletes.get(link.athleteId);
          return athlete
            ? {
                id: athlete.id,
                fullName: athlete.fullName,
                schoolId: athlete.schoolId,
                status: athlete.status,
                ...(athlete.athletiqId ? { athletiqId: athlete.athletiqId } : {}),
                relationship: link.relationship,
              }
            : undefined;
        })
        .filter((athlete): athlete is FamilyDashboardRecord['athletes'][number] =>
          Boolean(athlete),
        );
      const announcements = [...this.announcements.values()].filter((announcement) =>
        announcement.target.schoolIds.some((schoolId) => schoolIds.has(schoolId)),
      );
      const notifications = [...this.communicationNotifications.values()].filter(
        (notification) => notification.recipientUserId === guardian.id,
      );
      const threads = [...this.conversationThreads.values()].filter((thread) =>
        thread.participantUserIds.includes(guardian.id),
      );
      return {
        guardian: { id: guardian.id, email: guardian.email },
        athletes,
        announcements: announcements.map((announcement) => this.cloneAnnouncement(announcement)),
        notifications: notifications.map((notification) => ({ ...notification })),
        threads: threads.map((thread) => this.cloneThread(thread)),
      };
    });
  }

  createAnnouncement(
    actor: AuthenticatedUser,
    input: {
      title: string;
      body: string;
      category: CommunicationCategory;
      priority?: CommunicationPriority;
      locale?: CommunicationLocale;
      schoolIds?: string[];
      teamIds?: string[];
      role?: UserRole;
    },
  ) {
    return this.withWrite(() => {
      const schoolIds = [...new Set(input.schoolIds ?? [])];
      for (const schoolId of schoolIds) {
        if (!this.schools.has(schoolId)) {
          throw new NotFoundException('School not found');
        }
        if (actor.role !== 'super_admin' && !actor.schoolIds.includes(schoolId)) {
          throw new ForbiddenException('Cannot announce outside your school scope');
        }
      }
      const announcement: AnnouncementRecord = {
        id: this.nextId('ann'),
        title: input.title,
        body: input.body,
        category: input.category,
        priority: input.priority ?? 'normal',
        locale: input.locale ?? 'en',
        target: {
          schoolIds,
          teamIds: [...new Set(input.teamIds ?? [])],
          ...(input.role ? { role: input.role } : {}),
        },
        createdBy: actor.id,
        createdAt: new Date().toISOString(),
      };
      this.announcements.set(announcement.id, announcement);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'communications.announcement_created',
        resource: 'announcement',
        resourceId: announcement.id,
        metadata: { schoolIds: schoolIds.join(','), category: announcement.category },
      });
      return this.cloneAnnouncement(announcement);
    });
  }

  upsertNotificationPreference(
    actor: AuthenticatedUser,
    input: {
      userId?: string;
      channel: CommunicationChannel;
      category: CommunicationCategory;
      enabled: boolean;
      locale?: CommunicationLocale;
      quietHoursStart?: string;
      quietHoursEnd?: string;
    },
  ) {
    return this.withWrite(() => {
      const userId = input.userId ?? actor.id;
      if (actor.role !== 'super_admin' && actor.id !== userId) {
        throw new ForbiddenException('Cannot update another user preference');
      }
      if (!this.users.has(userId)) {
        throw new NotFoundException('User not found');
      }
      const key = `${userId}:${input.channel}:${input.category}`;
      const existing = [...this.notificationPreferences.values()].find(
        (preference) =>
          preference.userId === userId &&
          preference.channel === input.channel &&
          preference.category === input.category,
      );
      const preference: NotificationPreferenceRecord = {
        id: existing?.id ?? this.nextId('pref'),
        userId,
        channel: input.channel,
        category: input.category,
        enabled: input.enabled,
        locale: input.locale ?? existing?.locale ?? 'en',
        ...(input.quietHoursStart ? { quietHoursStart: input.quietHoursStart } : {}),
        ...(input.quietHoursEnd ? { quietHoursEnd: input.quietHoursEnd } : {}),
        updatedBy: actor.id,
        updatedAt: new Date().toISOString(),
      };
      this.notificationPreferences.set(key, preference);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'communications.preference_updated',
        resource: 'notification_preference',
        resourceId: preference.id,
        metadata: { userId, channel: preference.channel, category: preference.category },
      });
      return { ...preference };
    });
  }

  listNotificationPreferences(actor: AuthenticatedUser, userId?: string) {
    return this.readOperation(() => {
      const targetUserId = userId ?? actor.id;
      if (actor.role !== 'super_admin' && actor.id !== targetUserId) {
        throw new ForbiddenException('Cannot read another user preference');
      }
      return {
        preferences: [...this.notificationPreferences.values()]
          .filter((preference) => preference.userId === targetUserId)
          .map((preference) => ({ ...preference })),
      };
    });
  }

  createCommunicationTemplate(
    actor: AuthenticatedUser,
    input: {
      key: string;
      category: CommunicationCategory;
      required?: boolean;
      variants: Record<CommunicationLocale, { subject: string; body: string }>;
    },
  ) {
    return this.withWrite(() => {
      const existing = [...this.communicationTemplates.values()].find(
        (template) => template.key === input.key,
      );
      const now = new Date().toISOString();
      const template: CommunicationTemplateRecord = {
        id: existing?.id ?? this.nextId('tmpl'),
        key: input.key,
        category: input.category,
        required: input.required ?? false,
        variants: {
          en: { ...input.variants.en },
          ne: { ...input.variants.ne },
        },
        createdBy: existing?.createdBy ?? actor.id,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      this.communicationTemplates.set(template.id, template);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'communications.template_saved',
        resource: 'communication_template',
        resourceId: template.id,
        metadata: { key: template.key, required: template.required },
      });
      return this.cloneTemplate(template);
    });
  }

  sendTemplateNotification(
    actor: AuthenticatedUser,
    input: {
      templateKey: string;
      recipientUserId: string;
      channel: CommunicationChannel;
      locale?: CommunicationLocale;
      variables?: Record<string, string>;
      resourceType?: string;
      resourceId?: string;
    },
  ) {
    return this.withWrite(() => {
      const recipient = this.users.get(input.recipientUserId);
      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }
      const template = [...this.communicationTemplates.values()].find(
        (candidate) => candidate.key === input.templateKey,
      );
      if (!template) {
        throw new NotFoundException('Communication template not found');
      }
      const locale = input.locale ?? this.preferredLocale(recipient.id, template.category) ?? 'en';
      const variant = template.variants[locale] ?? template.variants.en;
      const subject = this.renderTemplate(variant.subject, input.variables ?? {});
      const body = this.renderTemplate(variant.body, input.variables ?? {});
      const preference = [...this.notificationPreferences.values()].find(
        (candidate) =>
          candidate.userId === recipient.id &&
          candidate.channel === input.channel &&
          candidate.category === template.category,
      );
      const suppressed = !template.required && preference?.enabled === false;
      const now = new Date().toISOString();
      const notification: CommunicationNotificationRecord = {
        id: this.nextId('cnotif'),
        recipientUserId: recipient.id,
        category: template.category,
        channel: input.channel,
        locale,
        subject,
        body,
        required: template.required,
        ...(input.resourceType ? { resourceType: input.resourceType } : {}),
        ...(input.resourceId ? { resourceId: input.resourceId } : {}),
        status: 'pending',
        createdBy: actor.id,
        createdAt: now,
      };
      const delivery: NotificationDeliveryRecord = {
        id: this.nextId('delivery'),
        notificationId: notification.id,
        channel: input.channel,
        provider: input.channel === 'in_app' ? 'stub' : input.channel,
        status: suppressed ? 'suppressed' : 'queued',
        attempt: suppressed ? 0 : 1,
        ...(suppressed ? { error: 'suppressed_by_preference' } : {}),
        createdAt: now,
      };
      this.communicationNotifications.set(notification.id, notification);
      this.notificationDeliveries.set(delivery.id, delivery);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'communications.notification_created',
        resource: 'communication_notification',
        resourceId: notification.id,
        metadata: {
          recipientUserId: recipient.id,
          templateKey: template.key,
          deliveryStatus: delivery.status,
        },
      });
      return { notification: { ...notification }, delivery: { ...delivery } };
    });
  }

  listCommunicationInbox(actor: AuthenticatedUser, userId?: string) {
    return this.readOperation(() => {
      const targetUserId = userId ?? actor.id;
      if (actor.role !== 'super_admin' && actor.id !== targetUserId) {
        throw new ForbiddenException('Cannot read another user inbox');
      }
      return {
        notifications: [...this.communicationNotifications.values()]
          .filter((notification) => notification.recipientUserId === targetUserId)
          .map((notification) => ({ ...notification })),
        deliveries: [...this.notificationDeliveries.values()]
          .filter((delivery) => {
            const notification = this.communicationNotifications.get(delivery.notificationId);
            return notification?.recipientUserId === targetUserId;
          })
          .map((delivery) => ({ ...delivery })),
      };
    });
  }

  createConversationThread(
    actor: AuthenticatedUser,
    input: {
      title: string;
      schoolId: string;
      teamId?: string;
      athleteId?: string;
      participantUserIds: string[];
    },
  ) {
    return this.withWrite(() => {
      if (!this.schools.has(input.schoolId)) {
        throw new NotFoundException('School not found');
      }
      if (actor.role !== 'super_admin' && !actor.schoolIds.includes(input.schoolId)) {
        throw new ForbiddenException('Cannot create thread outside your school scope');
      }
      const participants = [...new Set([actor.id, ...input.participantUserIds])];
      for (const userId of participants) {
        if (!this.users.has(userId)) {
          throw new NotFoundException('Thread participant not found');
        }
      }
      const now = new Date().toISOString();
      const thread: ConversationThreadRecord = {
        id: this.nextId('thread'),
        title: input.title,
        schoolId: input.schoolId,
        ...(input.teamId ? { teamId: input.teamId } : {}),
        ...(input.athleteId ? { athleteId: input.athleteId } : {}),
        participantUserIds: participants,
        status: 'open',
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      this.conversationThreads.set(thread.id, thread);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'communications.thread_created',
        resource: 'conversation_thread',
        resourceId: thread.id,
        metadata: { schoolId: thread.schoolId, participantCount: participants.length },
      });
      return this.cloneThread(thread);
    });
  }

  postThreadMessage(actor: AuthenticatedUser, threadId: string, body: string) {
    return this.withWrite(() => {
      const thread = this.conversationThreads.get(threadId);
      if (!thread) {
        throw new NotFoundException('Thread not found');
      }
      if (thread.status !== 'open') {
        throw new BadRequestException('Thread is not open');
      }
      if (!thread.participantUserIds.includes(actor.id) && actor.role !== 'super_admin') {
        throw new ForbiddenException('Cannot post to this thread');
      }
      const now = new Date().toISOString();
      const message: ThreadMessageRecord = {
        id: this.nextId('msg'),
        threadId,
        authorUserId: actor.id,
        body,
        status: 'visible',
        createdAt: now,
      };
      this.threadMessages.set(message.id, message);
      this.conversationThreads.set(thread.id, { ...thread, updatedAt: now });
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'communications.message_posted',
        resource: 'thread_message',
        resourceId: message.id,
        metadata: { threadId },
      });
      return { ...message };
    });
  }

  hideThreadMessage(actor: AuthenticatedUser, messageId: string, reason: string) {
    return this.withWrite(() => {
      const message = this.threadMessages.get(messageId);
      if (!message) {
        throw new NotFoundException('Thread message not found');
      }
      const thread = this.conversationThreads.get(message.threadId);
      if (!thread) {
        throw new NotFoundException('Thread not found');
      }
      if (actor.role !== 'super_admin' && !actor.schoolIds.includes(thread.schoolId)) {
        throw new ForbiddenException('Cannot moderate this thread');
      }
      const now = new Date().toISOString();
      const updated: ThreadMessageRecord = {
        ...message,
        status: 'hidden',
        hiddenAt: now,
        hiddenBy: actor.id,
        moderationReason: reason,
      };
      const action: MessageModerationActionRecord = {
        id: this.nextId('mod'),
        threadId: thread.id,
        messageId: message.id,
        action: 'hide',
        reason,
        actedBy: actor.id,
        actedAt: now,
      };
      this.threadMessages.set(updated.id, updated);
      this.messageModerationActions.set(action.id, action);
      this.addAuditLog({
        actorUserId: actor.id,
        action: 'communications.message_hidden',
        resource: 'thread_message',
        resourceId: message.id,
        metadata: { threadId: thread.id, reason },
      });
      return { message: { ...updated }, moderation: { ...action } };
    });
  }

  listConversationThread(actor: AuthenticatedUser, threadId: string) {
    return this.readOperation(() => {
      const thread = this.conversationThreads.get(threadId);
      if (!thread) {
        throw new NotFoundException('Thread not found');
      }
      if (!thread.participantUserIds.includes(actor.id) && actor.role !== 'super_admin') {
        throw new ForbiddenException('Cannot read this thread');
      }
      return {
        thread: this.cloneThread(thread),
        messages: [...this.threadMessages.values()]
          .filter((message) => message.threadId === thread.id)
          .map((message) => ({ ...message })),
        moderationActions: [...this.messageModerationActions.values()]
          .filter((action) => action.threadId === thread.id)
          .map((action) => ({ ...action })),
      };
    });
  }

  private getActiveMatchEvents(matchId: string) {
    return [...this.matchEvents.values()]
      .filter((event) => event.matchId === matchId)
      .filter((event) => event.status === 'active');
  }

  private aggregateMatchStats(match: MatchRecord, events: MatchEventRecord[]): MatchDerivedStats {
    const totals = {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      fouls: 0,
      ownGoals: 0,
    };

    const byAthlete = new Map<string, MatchAthleteStat>();
    const byTeam = new Map<string, MatchTeamStat>();

    for (const event of events) {
      const increment = this.eventContribution(event.type, event.quantity);
      totals.goals += increment.goals;
      totals.assists += increment.assists;
      totals.yellowCards += increment.yellowCards;
      totals.redCards += increment.redCards;
      totals.fouls += increment.fouls;
      totals.ownGoals += increment.ownGoals;

      const athleteStat = byAthlete.get(event.athleteId) ?? {
        athleteId: event.athleteId,
        teamId: event.teamId,
        matchesPlayed: 1,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        fouls: 0,
        ownGoals: 0,
      };
      if (!byAthlete.has(event.athleteId)) {
        byAthlete.set(event.athleteId, athleteStat);
      } else {
        const value = byAthlete.get(event.athleteId);
        if (value) {
          value.matchesPlayed = 1;
        }
      }

      const team = byTeam.get(event.teamId) ?? {
        teamId: event.teamId,
        matchesPlayed: 1,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        fouls: 0,
        ownGoals: 0,
      };
      if (!byTeam.has(event.teamId)) {
        byTeam.set(event.teamId, team);
      }

      const athleteTarget = byAthlete.get(event.athleteId);
      const teamTarget = byTeam.get(event.teamId);
      if (!athleteTarget || !teamTarget) {
        continue;
      }

      athleteTarget.matchesPlayed = 1;
      athleteTarget.goals += increment.goals;
      athleteTarget.assists += increment.assists;
      athleteTarget.yellowCards += increment.yellowCards;
      athleteTarget.redCards += increment.redCards;
      athleteTarget.fouls += increment.fouls;
      athleteTarget.ownGoals += increment.ownGoals;

      teamTarget.goals += increment.goals;
      teamTarget.assists += increment.assists;
      teamTarget.yellowCards += increment.yellowCards;
      teamTarget.redCards += increment.redCards;
      teamTarget.fouls += increment.fouls;
      teamTarget.ownGoals += increment.ownGoals;
    }

    if (!byTeam.has(match.homeTeamId)) {
      byTeam.set(match.homeTeamId, {
        teamId: match.homeTeamId,
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        fouls: 0,
        ownGoals: 0,
      });
    }
    if (!byTeam.has(match.awayTeamId)) {
      byTeam.set(match.awayTeamId, {
        teamId: match.awayTeamId,
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        fouls: 0,
        ownGoals: 0,
      });
    }

    return {
      matchId: match.id,
      tournamentId: match.tournamentId,
      totals,
      athleteStats: [...byAthlete.values()],
      teamStats: [...byTeam.values()],
    };
  }

  private computeAthleteTournamentStats(athleteId: string): TournamentAthleteStat[] {
    const result = new Map<string, TournamentAthleteStat>();
    const matchesPlayedByTournament = new Map<string, Set<string>>();

    for (const match of this.matches.values()) {
      if (match.status !== 'verified') {
        continue;
      }
      const activeEvents = this.getActiveMatchEvents(match.id);
      for (const event of activeEvents) {
        if (event.athleteId !== athleteId) {
          continue;
        }
        const contribution = this.eventContribution(event.type, event.quantity);
        const entry = result.get(match.tournamentId) ?? {
          athleteId,
          tournamentId: match.tournamentId,
          matchesPlayed: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          fouls: 0,
          ownGoals: 0,
        };
        const seenMatches = matchesPlayedByTournament.get(match.tournamentId) ?? new Set<string>();
        if (!seenMatches.has(match.id)) {
          entry.matchesPlayed += 1;
          seenMatches.add(match.id);
          matchesPlayedByTournament.set(match.tournamentId, seenMatches);
        }
        entry.goals += contribution.goals;
        entry.assists += contribution.assists;
        entry.yellowCards += contribution.yellowCards;
        entry.redCards += contribution.redCards;
        entry.fouls += contribution.fouls;
        entry.ownGoals += contribution.ownGoals;
        result.set(match.tournamentId, entry);
      }
    }
    return [...result.values()];
  }

  private computeTournamentAthleteStats(tournamentId: string): TournamentAthleteStat[] {
    const totals = new Map<string, TournamentAthleteStat>();
    const athleteMatchKeys = new Set<string>();

    const matches = [...this.matches.values()].filter(
      (match) => match.tournamentId === tournamentId && match.status === 'verified',
    );

    for (const match of matches) {
      const activeEvents = this.getActiveMatchEvents(match.id);
      for (const event of activeEvents) {
        const key = `${match.tournamentId}:${event.athleteId}`;
        const current = totals.get(key) ?? {
          athleteId: event.athleteId,
          tournamentId,
          matchesPlayed: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          fouls: 0,
          ownGoals: 0,
        };
        const contribution = this.eventContribution(event.type, event.quantity);
        const athleteMatchKey = `${match.tournamentId}:${event.athleteId}:${event.matchId}`;
        if (!athleteMatchKeys.has(athleteMatchKey)) {
          current.matchesPlayed += 1;
          athleteMatchKeys.add(athleteMatchKey);
        }
        current.goals += contribution.goals;
        current.assists += contribution.assists;
        current.yellowCards += contribution.yellowCards;
        current.redCards += contribution.redCards;
        current.fouls += contribution.fouls;
        current.ownGoals += contribution.ownGoals;
        totals.set(key, current);
      }
    }

    return [...totals.values()];
  }

  private eventContribution(type: MatchEventType, quantity: number) {
    switch (type) {
      case 'goal':
        return { goals: quantity, assists: 0, yellowCards: 0, redCards: 0, fouls: 0, ownGoals: 0 };
      case 'assist':
        return { goals: 0, assists: quantity, yellowCards: 0, redCards: 0, fouls: 0, ownGoals: 0 };
      case 'yellow_card':
        return { goals: 0, assists: 0, yellowCards: quantity, redCards: 0, fouls: 0, ownGoals: 0 };
      case 'red_card':
        return { goals: 0, assists: 0, yellowCards: 0, redCards: quantity, fouls: 0, ownGoals: 0 };
      case 'foul':
        return { goals: 0, assists: 0, yellowCards: 0, redCards: 0, fouls: quantity, ownGoals: 0 };
      case 'own_goal':
        return { goals: 0, assists: 0, yellowCards: 0, redCards: 0, fouls: 0, ownGoals: quantity };
      default:
        return { goals: 0, assists: 0, yellowCards: 0, redCards: 0, fouls: 0, ownGoals: 0 };
    }
  }

  private isMatchCapturable(status: MatchStatus) {
    return status === 'played' || status === 'verified';
  }

  private normalizeMatchMinute(minute?: number) {
    if (minute === undefined) {
      return undefined;
    }
    if (!Number.isInteger(minute) || minute < 0) {
      throw new BadRequestException('minute must be a non-negative integer');
    }
    return minute;
  }

  private validateEventQuantity(quantity?: number) {
    if (quantity === undefined) {
      return 1;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new BadRequestException('quantity must be a non-negative integer');
    }
    return quantity;
  }

  private validateAthleteTeamForMatch(match: MatchRecord, athleteId?: string, teamId?: string) {
    if (!athleteId?.trim()) {
      throw new BadRequestException('athleteId is required');
    }
    if (!teamId?.trim()) {
      throw new BadRequestException('teamId is required');
    }

    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      throw new BadRequestException('teamId must be homeTeamId or awayTeamId for this match');
    }

    const team = this.teams.get(teamId);
    if (!team) {
      throw new BadRequestException('Team not found');
    }

    const athlete = this.athletes.get(athleteId);
    if (!athlete) {
      throw new NotFoundException('athlete not found');
    }

    if (!team.athleteIds.includes(athleteId)) {
      throw new BadRequestException('athlete is not part of this team');
    }
  }

  private getResourceByTypeForQr(resourceType: QrResourceType, resourceId: string) {
    switch (resourceType) {
      case 'athlete':
        return this.athletes.get(resourceId);
      case 'match':
        return this.matches.get(resourceId);
      case 'team':
        return this.teams.get(resourceId);
      default:
        return undefined;
    }
  }

  private async applyMutation(
    actor: AuthenticatedUser,
    input: { mutationType: string; payload: Record<string, unknown> },
  ) {
    if (input.mutationType === 'match_event_submit') {
      const payload = input.payload as {
        matchId?: unknown;
        event?: {
          athleteId?: unknown;
          teamId?: unknown;
          type?: unknown;
          minute?: unknown;
          details?: unknown;
          quantity?: unknown;
        };
      };
      if (typeof payload.matchId !== 'string' || !payload.event) {
        throw new BadRequestException('Invalid mutation payload');
      }

      const eventPayload = payload.event;
      if (
        typeof eventPayload.athleteId !== 'string' ||
        typeof eventPayload.teamId !== 'string' ||
        typeof eventPayload.type !== 'string'
      ) {
        throw new BadRequestException('Invalid mutation payload');
      }

      await this.submitMatchEvent(actor, payload.matchId, {
        athleteId: eventPayload.athleteId,
        teamId: eventPayload.teamId,
        type: eventPayload.type as MatchEventType,
        ...(typeof eventPayload.minute === 'number' ? { minute: eventPayload.minute } : {}),
        ...(typeof eventPayload.details === 'string' ? { details: eventPayload.details } : {}),
        ...(typeof eventPayload.quantity === 'number' ? { quantity: eventPayload.quantity } : {}),
      });
      return;
    }

    if (input.mutationType === 'match_event_correct') {
      const payload = input.payload as {
        matchId?: unknown;
        eventId?: unknown;
        event?: {
          athleteId?: unknown;
          teamId?: unknown;
          type?: unknown;
          minute?: unknown;
          details?: unknown;
          quantity?: unknown;
          reason?: unknown;
        };
      };

      if (
        typeof payload.matchId !== 'string' ||
        typeof payload.eventId !== 'string' ||
        !payload.event
      ) {
        throw new BadRequestException('Invalid mutation payload');
      }
      const eventPayload = payload.event;
      if (
        typeof eventPayload.athleteId !== 'string' ||
        typeof eventPayload.teamId !== 'string' ||
        typeof eventPayload.type !== 'string'
      ) {
        throw new BadRequestException('Invalid mutation payload');
      }

      await this.correctMatchEvent(actor, payload.matchId, payload.eventId, {
        athleteId: eventPayload.athleteId,
        teamId: eventPayload.teamId,
        type: eventPayload.type as MatchEventType,
        ...(typeof eventPayload.minute === 'number' ? { minute: eventPayload.minute } : {}),
        ...(typeof eventPayload.details === 'string' ? { details: eventPayload.details } : {}),
        ...(typeof eventPayload.quantity === 'number' ? { quantity: eventPayload.quantity } : {}),
        ...(typeof eventPayload.reason === 'string' ? { reason: eventPayload.reason } : {}),
      });
      return;
    }

    throw new BadRequestException('Unsupported mutation type');
  }

  private requireBracketTournament(tournamentId: string) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (tournament.status !== 'approved' && tournament.status !== 'active') {
      throw new BadRequestException('Tournament must be approved before bracketing');
    }
    return tournament;
  }

  private requireTournament(tournamentId: string) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }

  private requireMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  private requireVenueUnit(venueUnitId: string) {
    const venueUnit = this.venueUnits.get(venueUnitId);
    if (!venueUnit || venueUnit.status !== 'active') {
      throw new NotFoundException('Venue unit not found');
    }
    return venueUnit;
  }

  private assertAvailabilityResourceExists(
    resourceType: AvailabilityResourceType,
    resourceId: string,
  ) {
    if (resourceType === 'venue_unit') {
      this.requireVenueUnit(resourceId);
      return;
    }
    if (resourceType === 'school') {
      if (!this.schools.has(resourceId)) {
        throw new NotFoundException('School not found');
      }
      return;
    }
    if (!this.officialProfiles.has(resourceId)) {
      throw new NotFoundException('Official profile not found');
    }
  }

  private normalizeIso(value: string, fieldName: string) {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
    return new Date(parsed).toISOString();
  }

  private assertValidWindow(startsAt: string, endsAt: string) {
    if (
      Date.parse(this.normalizeIso(startsAt, 'startsAt')) >=
      Date.parse(this.normalizeIso(endsAt, 'endsAt'))
    ) {
      throw new BadRequestException('startsAt must be before endsAt');
    }
  }

  private getMatchSchedule(matchId: string) {
    return [...this.matchSchedules.values()].find((schedule) => schedule.matchId === matchId);
  }

  private detectScheduleConflicts(input: {
    match: MatchRecord;
    venueUnitId: string;
    startsAt: string;
    endsAt: string;
    tournamentId: string;
    minRestMinutes: number;
    draftSchedules?: MatchScheduleRecord[];
    excludeMatchId?: string;
  }) {
    const warnings = new Set<string>();
    const candidateSchedules = [
      ...this.matchSchedules.values(),
      ...(input.draftSchedules ?? []),
    ].filter((schedule) => schedule.matchId !== input.excludeMatchId);

    for (const schedule of candidateSchedules) {
      if (
        schedule.venueUnitId === input.venueUnitId &&
        overlaps(input.startsAt, input.endsAt, schedule.startsAt, schedule.endsAt)
      ) {
        warnings.add('venue_unit_overlap');
      }
    }

    const teamsForMatch = this.getMatchTeams(input.match);
    const schoolIds = new Set(teamsForMatch.map((team) => team.schoolId));
    for (const window of this.availabilityWindows.values()) {
      if (
        window.status === 'blackout' &&
        window.resourceType === 'venue_unit' &&
        window.resourceId === input.venueUnitId &&
        (!window.tournamentId || window.tournamentId === input.tournamentId) &&
        overlaps(input.startsAt, input.endsAt, window.startsAt, window.endsAt)
      ) {
        warnings.add('venue_unit_blackout');
      }
      if (
        window.status === 'blackout' &&
        schoolIds.has(window.resourceId) &&
        window.resourceType === 'school' &&
        (!window.tournamentId || window.tournamentId === input.tournamentId) &&
        overlaps(input.startsAt, input.endsAt, window.startsAt, window.endsAt)
      ) {
        warnings.add('school_blackout');
      }
    }

    const assignedProfileIds = new Set(
      [...this.officialAssignments.values()]
        .filter(
          (assignment) => assignment.matchId === input.match.id && assignment.status !== 'declined',
        )
        .map((assignment) => assignment.officialProfileId),
    );
    for (const profileId of assignedProfileIds) {
      for (const window of this.availabilityWindows.values()) {
        if (
          window.status === 'blackout' &&
          window.resourceType === 'official' &&
          window.resourceId === profileId &&
          (!window.tournamentId || window.tournamentId === input.tournamentId) &&
          overlaps(input.startsAt, input.endsAt, window.startsAt, window.endsAt)
        ) {
          warnings.add('official_blackout');
        }
      }
      for (const assignment of this.officialAssignments.values()) {
        if (
          assignment.officialProfileId !== profileId ||
          assignment.matchId === input.match.id ||
          assignment.status === 'declined'
        ) {
          continue;
        }
        const schedule = this.getMatchSchedule(assignment.matchId);
        if (
          schedule &&
          overlaps(input.startsAt, input.endsAt, schedule.startsAt, schedule.endsAt)
        ) {
          warnings.add('official_assignment_overlap');
        }
      }
    }

    if (input.minRestMinutes > 0) {
      const teamIds = new Set([input.match.homeTeamId, input.match.awayTeamId]);
      for (const schedule of candidateSchedules) {
        const scheduledMatch = this.matches.get(schedule.matchId);
        if (!scheduledMatch) {
          continue;
        }
        const sharesTeam =
          teamIds.has(scheduledMatch.homeTeamId) || teamIds.has(scheduledMatch.awayTeamId);
        if (!sharesTeam) {
          continue;
        }
        const restAfterExisting = minutesBetween(schedule.endsAt, input.startsAt);
        const restBeforeExisting = minutesBetween(input.endsAt, schedule.startsAt);
        if (restAfterExisting < input.minRestMinutes && restBeforeExisting < input.minRestMinutes) {
          warnings.add('team_rest_window');
        }
      }
    }

    return [...warnings];
  }

  private getMatchTeams(match: MatchRecord) {
    const homeTeam = this.teams.get(match.homeTeamId);
    const awayTeam = this.teams.get(match.awayTeamId);
    if (!homeTeam || !awayTeam) {
      throw new BadRequestException('Match teams not found');
    }
    return [homeTeam, awayTeam];
  }

  private upsertMatchSchedule(
    actor: AuthenticatedUser,
    match: MatchRecord,
    input: {
      venueUnitId: string;
      startsAt: string;
      endsAt: string;
      status: MatchScheduleStatus;
      conflictWarnings: string[];
      overrideReason?: string;
      now: string;
    },
  ) {
    const existing = this.getMatchSchedule(match.id);
    const schedule: MatchScheduleRecord = {
      id: existing?.id ?? this.nextId('sched'),
      tournamentId: match.tournamentId,
      matchId: match.id,
      venueUnitId: input.venueUnitId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status,
      conflictWarnings: [...input.conflictWarnings],
      ...(input.overrideReason ? { overrideReason: input.overrideReason } : {}),
      createdBy: existing?.createdBy ?? actor.id,
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now,
      ...(existing?.publishedAt ? { publishedAt: existing.publishedAt } : {}),
      ...(existing?.publishedBy ? { publishedBy: existing.publishedBy } : {}),
    };
    this.matchSchedules.set(schedule.id, schedule);
    this.matches.set(match.id, {
      ...match,
      scheduledAt: input.startsAt,
      updatedAt: input.now,
    });
    return schedule;
  }

  private requireOfficialAssignmentForActor(actor: AuthenticatedUser, assignmentId: string) {
    const assignment = this.officialAssignments.get(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Official assignment not found');
    }
    if (actor.role === 'super_admin') {
      return assignment;
    }
    const profile = this.officialProfiles.get(assignment.officialProfileId);
    if (profile?.userId !== actor.id) {
      throw new ForbiddenException('Not assigned to this match');
    }
    return assignment;
  }

  private assignmentVisibleToActor(actor: AuthenticatedUser, assignment: OfficialAssignmentRecord) {
    if (
      actor.role === 'super_admin' ||
      actor.role === 'federation_admin' ||
      actor.role === 'government_viewer'
    ) {
      return true;
    }
    const profile = this.officialProfiles.get(assignment.officialProfileId);
    if (actor.role === 'referee') {
      return profile?.userId === actor.id;
    }
    const match = this.matches.get(assignment.matchId);
    if (!match) {
      return false;
    }
    const homeTeam = this.teams.get(match.homeTeamId);
    const awayTeam = this.teams.get(match.awayTeamId);
    return [homeTeam?.schoolId, awayTeam?.schoolId].some(
      (schoolId) => schoolId && actor.schoolIds.includes(schoolId),
    );
  }

  private cloneVenueUnit(unit: VenueUnitRecord) {
    return { ...unit, sports: [...unit.sports] };
  }

  private cloneOfficialProfile(profile: OfficialProfileRecord) {
    return { ...profile, sports: [...profile.sports] };
  }

  private cloneMatchSchedule(schedule: MatchScheduleRecord) {
    return { ...schedule, conflictWarnings: [...schedule.conflictWarnings] };
  }

  private cloneOfficialPayout(payout: OfficialPayoutExportRecord) {
    return { ...payout, assignmentIds: [...payout.assignmentIds] };
  }

  private requireBracket(bracketId: string) {
    const bracket = this.brackets.get(bracketId);
    if (!bracket) {
      throw new NotFoundException('Bracket not found');
    }
    return bracket;
  }

  private requireBracketVersion(versionId: string) {
    const version = this.bracketVersions.get(versionId);
    if (!version) {
      throw new NotFoundException('Bracket version not found');
    }
    return version;
  }

  private normalizeBracketSeeds(seeds: BracketSeedInput[]) {
    if (!Array.isArray(seeds) || seeds.length < 2) {
      throw new BadRequestException('At least two bracket seeds are required');
    }
    return seeds.map((seed) => {
      if (!seed.teamId?.trim()) {
        throw new BadRequestException('Each seed requires teamId');
      }
      if (!Number.isInteger(seed.seedNumber) || seed.seedNumber < 1) {
        throw new BadRequestException('Each seed requires a positive seedNumber');
      }
      return {
        teamId: seed.teamId.trim(),
        seedNumber: seed.seedNumber,
        ...(seed.groupKey?.trim() ? { groupKey: seed.groupKey.trim() } : {}),
        locked: seed.locked ?? false,
        withdrawn: seed.withdrawn ?? false,
      };
    });
  }

  private validateBracketSeedSet(
    tournament: TournamentRecord,
    seeds: ReturnType<AppDataStore['normalizeBracketSeeds']>,
  ) {
    if (seeds.filter((seed) => !seed.withdrawn).length < 2) {
      throw new BadRequestException('At least two active bracket seeds are required');
    }
    const teamIds = new Set<string>();
    const seedNumbers = new Set<number>();
    for (const seed of seeds) {
      if (teamIds.has(seed.teamId)) {
        throw new BadRequestException('Duplicate team in bracket seeds');
      }
      if (seedNumbers.has(seed.seedNumber)) {
        throw new BadRequestException('Duplicate seed number');
      }
      teamIds.add(seed.teamId);
      seedNumbers.add(seed.seedNumber);

      const team = this.teams.get(seed.teamId);
      if (!team) {
        throw new BadRequestException(`team ${seed.teamId} not found`);
      }
      if (team.tournamentId !== tournament.id) {
        throw new BadRequestException(`team ${seed.teamId} does not belong to tournament`);
      }
      if (team.status !== 'approved') {
        throw new BadRequestException(`team ${seed.teamId} must be approved`);
      }
    }
  }

  private assertBracketReadAccess(
    actor: AuthenticatedUser,
    bracket: BracketRecord,
    versionId: string,
  ) {
    if (
      actor.role === 'super_admin' ||
      actor.role === 'federation_admin' ||
      actor.role === 'government_viewer'
    ) {
      return;
    }

    const tournament = this.tournaments.get(bracket.tournamentId);
    const schoolIds = new Set<string>(tournament?.schoolIds ?? []);
    for (const seed of this.getVersionSeeds(versionId)) {
      const team = this.teams.get(seed.teamId);
      if (team) {
        schoolIds.add(team.schoolId);
      }
    }

    if (!actor.schoolIds.some((schoolId) => schoolIds.has(schoolId))) {
      throw new ForbiddenException('Not allowed to read this bracket');
    }
  }

  private assertLockedSeedsUnchanged(
    currentSeeds: BracketSeedRecord[],
    nextSeeds: ReturnType<AppDataStore['normalizeBracketSeeds']>,
  ) {
    for (const seed of currentSeeds.filter((candidate) => candidate.locked)) {
      const next = nextSeeds.find((candidate) => candidate.teamId === seed.teamId);
      if (
        !next ||
        next.seedNumber !== seed.seedNumber ||
        (next.groupKey ?? '') !== (seed.groupKey ?? '')
      ) {
        throw new BadRequestException('Locked seeds cannot be moved');
      }
    }
    const lockedSeedNumbers = new Set(
      currentSeeds.filter((seed) => seed.locked).map((seed) => seed.seedNumber),
    );
    for (const seed of nextSeeds) {
      const current = currentSeeds.find((candidate) => candidate.teamId === seed.teamId);
      if (!current?.locked && lockedSeedNumbers.has(seed.seedNumber)) {
        throw new BadRequestException('Locked seed number cannot be reused');
      }
    }
  }

  private createBracketSeedRecords(
    bracketId: string,
    versionId: string,
    seeds: ReturnType<AppDataStore['normalizeBracketSeeds']>,
    now: string,
  ) {
    return seeds.map(
      (seed): BracketSeedRecord => ({
        id: this.nextId('bseed'),
        bracketId,
        versionId,
        teamId: seed.teamId,
        seedNumber: seed.seedNumber,
        ...(seed.groupKey ? { groupKey: seed.groupKey } : {}),
        locked: seed.locked,
        withdrawn: seed.withdrawn,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  private generateBracketNodes(
    format: BracketFormat,
    bracketId: string,
    versionId: string,
    seeds: BracketSeedRecord[],
    now: string,
  ) {
    if (format === 'double_elimination') {
      const seedCount = seeds.filter((seed) => !seed.withdrawn).length;
      if (seedCount !== 4 && seedCount !== 8) {
        throw new BadRequestException('Double elimination currently supports 4 or 8 teams');
      }
    }
    const input = {
      bracketId,
      versionId,
      seeds,
      nextNodeId: () => this.nextId('bnode'),
      now,
    };
    switch (format) {
      case 'single_elimination':
        return generateSingleEliminationNodes(input);
      case 'double_elimination':
        return generateDoubleEliminationNodes(input);
      case 'group_stage_knockout':
      case 'round_robin':
      case 'league':
        return generateGroupStageNodes(input);
      default:
        throw new BadRequestException('Unsupported bracket format');
    }
  }

  private materializeReadyBracketMatches(
    actor: AuthenticatedUser,
    tournamentId: string,
    nodes: BracketNodeRecord[],
    now: string,
  ) {
    for (const node of nodes) {
      if (!node.homeTeamId || !node.awayTeamId || node.matchId) {
        continue;
      }
      if (node.homeTeamId === node.awayTeamId) {
        continue;
      }
      node.matchId = this.createBracketMatch(
        actor,
        tournamentId,
        node.homeTeamId,
        node.awayTeamId,
        now,
      );
      node.status = 'ready';
      node.updatedAt = now;
    }
  }

  private deleteDraftVersionMatches(tournamentId: string, nodes: BracketNodeRecord[], now: string) {
    const matchIds = nodes.flatMap((node) => (node.matchId ? [node.matchId] : []));
    if (!matchIds.length) {
      return;
    }

    const matchesToDelete = new Set<string>();
    for (const matchId of matchIds) {
      const match = this.matches.get(matchId);
      if (!match) {
        continue;
      }
      if (match.status !== 'scheduled') {
        throw new BadRequestException('Cannot reseed bracket after bracket matches have started');
      }
      matchesToDelete.add(matchId);
    }

    for (const matchId of matchesToDelete) {
      this.matches.delete(matchId);
    }

    if (!matchesToDelete.size) {
      return;
    }
    const tournament = this.tournaments.get(tournamentId);
    if (tournament) {
      this.tournaments.set(tournamentId, {
        ...tournament,
        matchIds: tournament.matchIds.filter((matchId) => !matchesToDelete.has(matchId)),
        updatedAt: now,
      });
    }
  }

  private createBracketMatch(
    actor: AuthenticatedUser,
    tournamentId: string,
    homeTeamId: string,
    awayTeamId: string,
    now: string,
  ) {
    const match: MatchRecord = {
      id: this.nextId('mch'),
      tournamentId,
      homeTeamId,
      awayTeamId,
      scheduledAt: now,
      status: 'scheduled',
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };
    this.matches.set(match.id, match);
    const tournament = this.tournaments.get(tournamentId);
    if (tournament && !tournament.matchIds.includes(match.id)) {
      this.tournaments.set(tournamentId, {
        ...tournament,
        matchIds: [...tournament.matchIds, match.id],
        updatedAt: now,
      });
    }
    this.addAuditLog({
      actorUserId: actor.id,
      action: 'match.created',
      resource: 'match',
      resourceId: match.id,
      metadata: { tournamentId, homeTeamId, awayTeamId },
    });
    return match.id;
  }

  private fillBracketNodeSlot(
    actor: AuthenticatedUser,
    tournamentId: string,
    nodeId: string,
    teamId: string,
    now: string,
    sourceNodeId?: string,
  ) {
    const target = this.bracketNodes.get(nodeId);
    if (!target) {
      throw new BadRequestException('Bracket advancement target not found');
    }
    if (target.homeTeamId === teamId || target.awayTeamId === teamId) {
      return;
    }
    const slot = this.resolveBracketNodeSlot(target, sourceNodeId);
    if (!slot) {
      throw new BadRequestException('Bracket node already has two teams');
    }
    const existingTeamId = slot === 'home' ? target.homeTeamId : target.awayTeamId;
    if (existingTeamId && existingTeamId !== teamId) {
      throw new BadRequestException('Bracket node slot is already occupied');
    }

    const updated: BracketNodeRecord = {
      ...target,
      sourceNodeIds: [...target.sourceNodeIds],
      updatedAt: now,
    };
    if (slot === 'home') {
      updated.homeTeamId = teamId;
    } else {
      updated.awayTeamId = teamId;
    }

    if (updated.homeTeamId && updated.awayTeamId && !updated.matchId) {
      updated.matchId = this.createBracketMatch(
        actor,
        tournamentId,
        updated.homeTeamId,
        updated.awayTeamId,
        now,
      );
      updated.status = 'ready';
    }
    this.bracketNodes.set(updated.id, updated);
  }

  private getBracketMatchOutcome(match: MatchRecord, node: BracketNodeRecord) {
    if (!node.homeTeamId || !node.awayTeamId) {
      throw new BadRequestException('Bracket node is missing teams');
    }
    if (match.homeScore === undefined || match.awayScore === undefined) {
      throw new BadRequestException('Verified match is missing scores');
    }
    if (match.homeScore === match.awayScore && node.bracketSide !== 'group') {
      throw new BadRequestException('Elimination bracket matches require a winner');
    }

    const winnerTeamId = match.homeScore >= match.awayScore ? match.homeTeamId : match.awayTeamId;
    const loserTeamId = winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    return { winnerTeamId, loserTeamId };
  }

  private resolveBracketNodeSlot(target: BracketNodeRecord, sourceNodeId?: string) {
    if (sourceNodeId && target.sourceNodeIds.length) {
      const sourceIndex = target.sourceNodeIds.indexOf(sourceNodeId);
      if (sourceIndex === -1 || sourceIndex > 1) {
        throw new BadRequestException('Bracket route is not connected to target node');
      }
      const slot = sourceIndex === 0 ? 'home' : 'away';
      return slot;
    }
    if (!target.homeTeamId) {
      return 'home';
    }
    if (!target.awayTeamId) {
      return 'away';
    }
    return undefined;
  }

  private assertBracketNodeSlotCanAccept(nodeId: string, teamId: string, sourceNodeId?: string) {
    const target = this.bracketNodes.get(nodeId);
    if (!target) {
      throw new BadRequestException('Bracket advancement target not found');
    }
    if (target.homeTeamId === teamId || target.awayTeamId === teamId) {
      return;
    }
    const slot = this.resolveBracketNodeSlot(target, sourceNodeId);
    if (!slot) {
      throw new BadRequestException('Bracket node already has two teams');
    }
    const existingTeamId = slot === 'home' ? target.homeTeamId : target.awayTeamId;
    if (existingTeamId && existingTeamId !== teamId) {
      throw new BadRequestException('Bracket node slot is already occupied');
    }
  }

  private assertIfNecessaryFinalCanResolve(
    node: BracketNodeRecord,
    winnerTeamId: string,
    loserTeamId: string,
  ) {
    const resetNode = this.findIfNecessaryFinal(node);
    if (!resetNode) {
      return;
    }
    if (winnerTeamId === node.homeTeamId) {
      return;
    }
    if (
      (resetNode.homeTeamId && resetNode.homeTeamId !== loserTeamId) ||
      (resetNode.awayTeamId && resetNode.awayTeamId !== winnerTeamId)
    ) {
      throw new BadRequestException('If-necessary final is already occupied');
    }
  }

  private resolveIfNecessaryFinal(
    actor: AuthenticatedUser,
    tournamentId: string,
    node: BracketNodeRecord,
    winnerTeamId: string,
    loserTeamId: string,
    now: string,
  ) {
    const resetNode = this.findIfNecessaryFinal(node);
    if (!resetNode || resetNode.status === 'completed') {
      return;
    }

    const updated: BracketNodeRecord = {
      ...resetNode,
      sourceNodeIds: [...resetNode.sourceNodeIds],
      updatedAt: now,
    };
    if (winnerTeamId === node.homeTeamId) {
      updated.winnerTeamId = winnerTeamId;
      updated.status = 'bye';
      this.bracketNodes.set(updated.id, updated);
      return;
    }

    updated.homeTeamId = loserTeamId;
    updated.awayTeamId = winnerTeamId;
    if (!updated.matchId) {
      updated.matchId = this.createBracketMatch(
        actor,
        tournamentId,
        loserTeamId,
        winnerTeamId,
        now,
      );
    }
    updated.status = 'ready';
    this.bracketNodes.set(updated.id, updated);
  }

  private findIfNecessaryFinal(node: BracketNodeRecord) {
    if (node.isIfNecessary) {
      return undefined;
    }
    return [...this.bracketNodes.values()].find(
      (candidate) =>
        candidate.versionId === node.versionId &&
        candidate.isIfNecessary &&
        candidate.sourceNodeIds.includes(node.id),
    );
  }

  private recalculateStandings(bracketId: string, versionId: string, now: string) {
    for (const row of this.getVersionStandings(versionId)) {
      this.standingRows.delete(row.id);
    }
    const seeds = this.getVersionSeeds(versionId);
    const nodes = this.getVersionNodes(versionId);
    if (!nodes.some((node) => node.bracketSide === 'group')) {
      return;
    }
    const matches = nodes
      .map((node) => (node.matchId ? this.matches.get(node.matchId) : undefined))
      .filter((match): match is MatchRecord => Boolean(match));
    const teams = seeds
      .map((seed) => this.teams.get(seed.teamId))
      .filter((team): team is TournamentTeamRecord => Boolean(team));
    const rows = calculateStandings({ bracketId, versionId, seeds, nodes, matches, teams, now });
    for (const row of rows) {
      this.standingRows.set(row.id, { ...row });
    }
  }

  private getVersionSeeds(versionId: string) {
    return [...this.bracketSeeds.values()]
      .filter((seed) => seed.versionId === versionId)
      .sort((first, second) => first.seedNumber - second.seedNumber)
      .map((seed) => ({ ...seed }));
  }

  private getVersionNodes(versionId: string) {
    return [...this.bracketNodes.values()]
      .filter((node) => node.versionId === versionId)
      .sort((first, second) => {
        if (first.bracketSide !== second.bracketSide) {
          return first.bracketSide.localeCompare(second.bracketSide);
        }
        if (first.round !== second.round) {
          return first.round - second.round;
        }
        return first.position - second.position;
      })
      .map((node) => this.cloneBracketNode(node));
  }

  private getVersionStandings(versionId: string) {
    return [...this.standingRows.values()]
      .filter((row) => row.versionId === versionId)
      .sort((first, second) => {
        if (first.groupKey !== second.groupKey) {
          return first.groupKey.localeCompare(second.groupKey);
        }
        return first.rank - second.rank;
      })
      .map((row) => ({ ...row }));
  }

  private buildBracketView(bracketId: string, versionId?: string): BracketView | undefined {
    const bracket = this.brackets.get(bracketId);
    if (!bracket) {
      return undefined;
    }
    const version = this.bracketVersions.get(versionId ?? bracket.activeVersionId);
    if (!version || version.bracketId !== bracket.id) {
      return undefined;
    }
    const seeds = this.getVersionSeeds(version.id);
    const nodes = this.getVersionNodes(version.id);
    const standings = this.getVersionStandings(version.id);
    const teamIds = new Set<string>();
    for (const seed of seeds) {
      teamIds.add(seed.teamId);
    }
    for (const node of nodes) {
      if (node.homeTeamId) {
        teamIds.add(node.homeTeamId);
      }
      if (node.awayTeamId) {
        teamIds.add(node.awayTeamId);
      }
      if (node.winnerTeamId) {
        teamIds.add(node.winnerTeamId);
      }
      if (node.loserTeamId) {
        teamIds.add(node.loserTeamId);
      }
    }
    const teams = [...teamIds]
      .map((teamId) => this.teams.get(teamId))
      .filter((team): team is TournamentTeamRecord => Boolean(team))
      .map((team) => ({ id: team.id, name: team.name, schoolId: team.schoolId }));

    return {
      bracket: this.cloneBracket(bracket),
      version: { ...version },
      seeds,
      nodes,
      standings,
      teams,
    };
  }

  private toPublicBracketView(view: BracketView, publicSlug: string): PublicBracketView {
    return {
      bracket: {
        id: view.bracket.id,
        tournamentId: view.bracket.tournamentId,
        format: view.bracket.format,
        status: view.bracket.status,
        publicSlug,
      },
      version: {
        id: view.version.id,
        versionNumber: view.version.versionNumber,
      },
      seeds: view.seeds.map((seed) => ({
        teamId: seed.teamId,
        seedNumber: seed.seedNumber,
        ...(seed.groupKey ? { groupKey: seed.groupKey } : {}),
      })),
      nodes: view.nodes.map((node) => {
        const match = node.matchId ? this.matches.get(node.matchId) : undefined;
        return {
          id: node.id,
          ...(node.matchId ? { matchId: node.matchId } : {}),
          ...(node.groupKey ? { groupKey: node.groupKey } : {}),
          round: node.round,
          position: node.position,
          bracketSide: node.bracketSide,
          ...(node.homeTeamId ? { homeTeamId: node.homeTeamId } : {}),
          ...(node.awayTeamId ? { awayTeamId: node.awayTeamId } : {}),
          ...(node.winnerTeamId ? { winnerTeamId: node.winnerTeamId } : {}),
          ...(node.loserTeamId ? { loserTeamId: node.loserTeamId } : {}),
          status: node.status,
          ...(match?.homeScore !== undefined ? { homeScore: match.homeScore } : {}),
          ...(match?.awayScore !== undefined ? { awayScore: match.awayScore } : {}),
        };
      }),
      standings: view.standings.map((row) => ({ ...row })),
      teams: view.teams.map((team) => ({ ...team })),
    };
  }

  private uniquePublicBracketSlug(tournamentId: string) {
    let slug = `bracket-${tournamentId}-${this.randomToken(5)}`.toLowerCase();
    while ([...this.brackets.values()].some((bracket) => bracket.publicSlug === slug)) {
      slug = `bracket-${tournamentId}-${this.randomToken(5)}`.toLowerCase();
    }
    return slug;
  }

  private cloneBracket(bracket: BracketRecord): BracketRecord {
    return { ...bracket };
  }

  private cloneBracketNode(node: BracketNodeRecord): BracketNodeRecord {
    return {
      ...node,
      sourceNodeIds: [...node.sourceNodeIds],
    };
  }

  private cloneAnnouncement(announcement: AnnouncementRecord): AnnouncementRecord {
    return {
      ...announcement,
      target: {
        schoolIds: [...announcement.target.schoolIds],
        teamIds: [...announcement.target.teamIds],
        ...(announcement.target.role ? { role: announcement.target.role } : {}),
      },
    };
  }

  private cloneThread(thread: ConversationThreadRecord): ConversationThreadRecord {
    return {
      ...thread,
      participantUserIds: [...thread.participantUserIds],
    };
  }

  private cloneTemplate(template: CommunicationTemplateRecord): CommunicationTemplateRecord {
    return {
      ...template,
      variants: {
        en: { ...template.variants.en },
        ne: { ...template.variants.ne },
      },
    };
  }

  private preferredLocale(
    userId: string,
    category: CommunicationCategory,
  ): CommunicationLocale | undefined {
    return [...this.notificationPreferences.values()].find(
      (preference) => preference.userId === userId && preference.category === category,
    )?.locale;
  }

  private renderTemplate(template: string, variables: Record<string, string>) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
      return variables[key] ?? '';
    });
  }

  private async readOperation<T>(operation: () => T): Promise<T> {
    return operation();
  }

  private async withWrite<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }

  private addAuditLog(params: Omit<AuditRecord, 'id' | 'createdAt'>) {
    const entry: AuditRecord = {
      ...params,
      id: this.nextId('audit'),
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.push(entry);
    return { ...entry };
  }

  private addSchoolUser(userId: string, schoolId: string) {
    const user = this.users.get(userId);
    if (!user) {
      return;
    }

    if (!user.schoolIds.includes(schoolId)) {
      user.schoolIds = [...user.schoolIds, schoolId];
    }

    user.updatedAt = new Date().toISOString();
    this.users.set(user.id, user);
  }

  private seedDefaults() {
    this.ensureDefaultSuperAdmin();
  }

  private ensureDefaultSuperAdmin() {
    if (this.users.has(DEFAULT_USER_ID)) {
      return;
    }

    const now = new Date().toISOString();
    const superAdmin: UserRecord = {
      id: DEFAULT_USER_ID,
      email: 'admin@athletiq.local',
      password: `LOCKED:${this.randomToken(32)}`,
      roles: ['super_admin'],
      schoolIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(superAdmin.id, superAdmin);
  }

  private nextId(prefix: string) {
    return `${prefix}_${Date.now()}_${this.randomToken(6)}`;
  }

  private randomToken(length: number) {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();
  }

  private generateAthletiqId() {
    return `ATQ-${this.randomToken(3)}-${this.randomToken(6)}-${this.randomToken(3)}`;
  }

  private isAthleteInSchool(athleteId: string, schoolId: string) {
    const athlete = this.athletes.get(athleteId);
    return athlete?.schoolId === schoolId;
  }

  private actorIncludesSchool(actor: AuthenticatedUser, schoolId: string) {
    return actor.role === 'super_admin' || actor.schoolIds.includes(schoolId);
  }

  private assertDocumentActorAccess(actor: AuthenticatedUser, document: IdentityDocumentRecord) {
    if (!this.actorIncludesSchool(actor, document.schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }
  }

  private buildDocumentReviewQueueItem(document: IdentityDocumentRecord): DocumentReviewQueueItem {
    const extraction = this.latestDocumentExtraction(document.id);
    const reviewFlags = [...this.documentReviewFlags.values()]
      .filter((flag) => flag.documentId === document.id)
      .map((flag) => ({ ...flag }));
    const duplicateCandidates = [...this.documentDuplicateCandidates.values()]
      .filter((candidate) => candidate.documentId === document.id)
      .map((candidate) => ({ ...candidate, reasonCodes: [...candidate.reasonCodes] }));

    return {
      document: { ...document },
      ...(extraction
        ? {
            extraction: {
              ...extraction,
              extracted: { ...extraction.extracted },
              fieldConfidence: { ...extraction.fieldConfidence },
            },
          }
        : {}),
      reviewFlags,
      duplicateCandidates,
    };
  }

  private latestDocumentExtraction(documentId: string) {
    return [...this.documentExtractions.values()]
      .filter((extraction) => extraction.documentId === documentId)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt))[0];
  }

  private detectDocumentDuplicates(
    document: IdentityDocumentRecord,
    extraction: DocumentExtractionRecord,
    createdAt: string,
  ) {
    const candidates: DocumentDuplicateCandidateRecord[] = [];
    const documentNumber = this.normalizeIdentityValue(extraction.extracted.documentNumber);
    const fullName = this.normalizeIdentityValue(extraction.extracted.fullName);
    const dateOfBirth = this.normalizeIdentityValue(extraction.extracted.dateOfBirth);
    const fatherName = this.normalizeIdentityValue(extraction.extracted.fatherName);
    const motherName = this.normalizeIdentityValue(extraction.extracted.motherName);

    for (const existingExtraction of this.documentExtractions.values()) {
      if (existingExtraction.documentId === document.id) {
        continue;
      }
      const existingDocument = this.identityDocuments.get(existingExtraction.documentId);
      if (!existingDocument || existingDocument.schoolId !== document.schoolId) {
        continue;
      }

      const reasonCodes: string[] = [];
      let score = 0;
      const existingDocumentNumber = this.normalizeIdentityValue(
        existingExtraction.extracted.documentNumber,
      );
      if (documentNumber && documentNumber === existingDocumentNumber) {
        score = 100;
        reasonCodes.push('document_number_exact');
      }

      const existingFullName = this.normalizeIdentityValue(existingExtraction.extracted.fullName);
      const existingDateOfBirth = this.normalizeIdentityValue(
        existingExtraction.extracted.dateOfBirth,
      );
      if (
        fullName &&
        dateOfBirth &&
        fullName === existingFullName &&
        dateOfBirth === existingDateOfBirth
      ) {
        score = Math.max(score, 85);
        reasonCodes.push('name_dob_match');
      }

      const existingFatherName = this.normalizeIdentityValue(
        existingExtraction.extracted.fatherName,
      );
      const existingMotherName = this.normalizeIdentityValue(
        existingExtraction.extracted.motherName,
      );
      if (fatherName && fatherName === existingFatherName) {
        reasonCodes.push('father_name_match');
      }
      if (motherName && motherName === existingMotherName) {
        reasonCodes.push('mother_name_match');
      }

      if (score > 0) {
        const candidate: DocumentDuplicateCandidateRecord = {
          id: this.nextId('ddup'),
          documentId: document.id,
          matchedDocumentId: existingDocument.id,
          matchedAthleteId: existingDocument.athleteId,
          score,
          reasonCodes,
          status: 'open',
          createdAt,
        };
        this.documentDuplicateCandidates.set(candidate.id, candidate);
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  private normalizeIdentityValue(value?: string) {
    return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  }

  private toEndOfDayIso(date: string) {
    const parsed = Date.parse(date);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    const target = new Date(parsed);
    target.setUTCHours(23, 59, 59, 999);
    return target.toISOString();
  }

  private cloneTournament(tournament: TournamentRecord): TournamentRecord {
    return {
      ...tournament,
      schoolIds: [...tournament.schoolIds],
      teamIds: [...tournament.teamIds],
      matchIds: [...tournament.matchIds],
    };
  }

  private cloneInvoice(invoice: InvoiceRecord): InvoiceRecord {
    return {
      ...invoice,
      installments: invoice.installments.map((installment) => ({ ...installment })),
    };
  }

  private findActiveDiscount(code: string, currency: string) {
    const normalizedCode = code.trim().toUpperCase();
    const discount = [...this.discountCodes.values()].find(
      (candidate) => candidate.code === normalizedCode && candidate.isActive,
    );
    if (!discount) {
      throw new NotFoundException('Discount code not found');
    }
    if (discount.currency !== currency) {
      throw new BadRequestException('Discount currency does not match invoice currency');
    }
    return discount;
  }

  private buildInstallments(
    invoiceId: string,
    totalAmount: number,
    installmentCount: number | undefined,
    paid: boolean,
    createdAt: string,
  ): InvoiceInstallmentRecord[] {
    const count = Math.max(1, Math.floor(installmentCount ?? 1));
    const baseAmount = Math.floor(totalAmount / count);
    const remainder = totalAmount - baseAmount * count;

    return Array.from({ length: count }, (_, index) => ({
      id: this.nextId('inst'),
      invoiceId,
      amount: baseAmount + (index === count - 1 ? remainder : 0),
      status: paid ? 'paid' : 'open',
      createdAt,
    }));
  }

  private membershipActiveWindow(startsAt: string, durationDays: number) {
    const startDate = new Date(startsAt);
    return {
      startsAt: startDate.toISOString(),
      expiresAt: new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private recalculateInvoice(invoice: InvoiceRecord): InvoiceRecord {
    const netPaidAmount = Math.max(invoice.paidAmount - invoice.refundedAmount, 0);
    const balanceAmount = Math.max(invoice.totalAmount - netPaidAmount, 0);
    const status: InvoiceStatus =
      invoice.refundedAmount >= invoice.paidAmount && invoice.paidAmount > 0
        ? 'refunded'
        : balanceAmount === 0
          ? 'paid'
          : 'open';
    let remainingPaidAmount = netPaidAmount;

    return {
      ...invoice,
      balanceAmount,
      status,
      installments: invoice.installments.map((installment) => {
        const installmentPaid = remainingPaidAmount >= installment.amount;
        remainingPaidAmount = Math.max(remainingPaidAmount - installment.amount, 0);
        return {
          ...installment,
          status: installmentPaid ? 'paid' : 'open',
        };
      }),
    };
  }

  private activateMembershipForPaidInvoice(invoice: InvoiceRecord, activatedAt: string) {
    if (invoice.entityType !== 'school_membership' || invoice.status !== 'paid') {
      return undefined;
    }

    const membership = this.schoolMemberships.get(invoice.entityId);
    if (!membership || membership.status === 'active') {
      return membership;
    }

    const plan = this.membershipPlans.get(membership.planId);
    const updated: SchoolMembershipRecord = {
      ...membership,
      status: 'active',
      ...(plan ? this.membershipActiveWindow(activatedAt, plan.durationDays) : {}),
      updatedAt: activatedAt,
    };
    this.schoolMemberships.set(updated.id, updated);
    return updated;
  }

  private tournamentRegistrationEntityId(tournamentId: string, schoolId: string) {
    return `${tournamentId}:${schoolId}`;
  }

  private createUserSync(params: {
    email: string;
    passwordHash: string;
    roles: UserRole[];
    schoolIds?: string[];
  }) {
    this.assertSafeStoredPassword(params.passwordHash);
    if ([...this.users.values()].some((user) => user.email === params.email)) {
      throw new BadRequestException('Email already exists');
    }

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: this.nextId('usr'),
      email: params.email,
      password: params.passwordHash,
      roles: [...params.roles],
      schoolIds: [...(params.schoolIds ?? [])],
      createdAt: now,
      updatedAt: now,
    };

    return user;
  }

  private cloneAnalyticsReportDraft(record: AnalyticsReportDraftRecord) {
    return {
      ...record,
      sections: record.sections.map((section) => ({
        ...section,
        metrics: { ...section.metrics },
      })),
    };
  }

  private cloneSpreadsheetImport(record: SpreadsheetImportRecord) {
    return {
      ...record,
      errors: record.errors.map((error) => ({ ...error })),
      rows: record.rows.map((row) => ({ ...row })),
    };
  }

  private validateImportRow(
    entityType: ImportEntityType,
    row: Record<string, string | number | boolean | null>,
    rowIndex: number,
  ) {
    const errors: ImportErrorRecord[] = [];
    const requiredFields =
      entityType === 'athletes'
        ? ['schoolId', 'fullName']
        : entityType === 'schools'
          ? ['name']
          : ['tournamentId', 'schoolId', 'name'];
    for (const field of requiredFields) {
      const value = row[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        errors.push({ rowIndex, field, message: `${field} is required` });
      }
    }
    return errors;
  }

  private assertSafeStoredPassword(value: string) {
    if (
      value.startsWith('$argon2id$') ||
      value.startsWith('$argon2i$') ||
      value.startsWith('$argon2d$') ||
      value.startsWith('LOCKED:')
    ) {
      return;
    }

    throw new BadRequestException('passwordHash must be an Argon2 hash or locked credential');
  }
}
