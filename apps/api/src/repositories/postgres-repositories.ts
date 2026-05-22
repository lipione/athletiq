import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, inArray, lte, ne } from 'drizzle-orm';
import {
  athletes,
  auditLogs,
  availabilityWindows,
  bracketNodes,
  brackets,
  bracketSeeds,
  bracketVersions,
  discountCodes,
  documentDuplicateCandidates,
  documentExtractions,
  documentReviewFlags,
  documentReviewLinks,
  documentReviews,
  facilities,
  federationOverrides,
  guardianConsents,
  identityDocuments,
  invoiceInstallments,
  invoices,
  matchEvents,
  matchSchedules,
  matches,
  membershipPlans,
  officialAssignments,
  officialPayoutExports,
  officialProfiles,
  payments,
  qrCodes,
  refreshSessions,
  refunds,
  scheduleNotifications,
  schoolUsers,
  schoolMemberships,
  schools,
  standingRows,
  syncMutations,
  teamMembers,
  teams,
  tenants,
  tournamentRegistrations,
  tournamentWaiverRequirements,
  tournaments,
  users,
  venueUnits,
  waiverSignatures,
  waiverTemplates,
} from '@athletiq/db';
import { DatabaseService } from '../database/database.service.js';
import {
  calculateStandings,
  generateDoubleEliminationNodes,
  generateGroupStageNodes,
  generateSingleEliminationNodes,
} from '../brackets/bracket-engine.js';
import { addMinutes, minutesBetween, overlaps } from '../scheduling/scheduling-engine.js';
import { AppDataStore } from '../common/store.js';
import type {
  AuthenticatedUser,
  BracketFormat,
  BracketNodeRecord,
  BracketRecord,
  BracketSeedRecord,
  BracketStatus,
  BracketTeamSummary,
  BracketVersionRecord,
  BracketView,
  DocumentDuplicateCandidateRecord,
  DocumentExtractionRecord,
  DocumentReviewFlagRecord,
  DocumentReviewLinkRecord,
  DocumentReviewQueueItem,
  DocumentReviewRecord,
  ExtractedIdentityFields,
  DiscountCodeRecord,
  DocumentExpiryRunResult,
  DocumentReviewResult,
  AvailabilityWindowRecord,
  FacilityRecord,
  FinanceReportRecord,
  IdentityDocumentRecord,
  IdentityDocumentStatus,
  InvoiceInstallmentRecord,
  InvoiceRecord,
  MembershipPlanRecord,
  MatchScheduleRecord,
  MatchEventRecord,
  MatchEventType,
  MatchReport,
  GuardianConsentRecord,
  MatchStats,
  MatchTeamStat,
  MatchAthleteStat,
  MatchDerivedStats,
  MatchRecord,
  OfficialAssignmentRecord,
  OfficialPayoutExportRecord,
  OfficialProfileRecord,
  PaymentRecord,
  PublicBracketView,
  QrCodeRecord,
  RefundRecord,
  ScheduleNotificationRecord,
  SearchResults,
  SchoolMembershipRecord,
  StandingRowRecord,
  SyncMutationRecord,
  TournamentAthleteStat,
  TournamentFormat,
  TournamentRecord,
  TournamentTeamRecord,
  UserRecord,
  TournamentWaiverRequirementRecord,
  VenueUnitRecord,
  WaiverSignatureRecord,
  WaiverTemplateRecord,
} from '../common/store.js';
import type { UserRole } from '../common/roles.js';
import type {
  AnalyticsRepository,
  AuthSessionRepository,
  AthleteRepository,
  AuditRepository,
  AssignOfficialInput,
  AvailabilityFilter,
  BillingRepository,
  BracketRepository,
  BracketSeedInput,
  CommunicationRepository,
  ConfigureTournamentRegistrationFeeInput,
  CreateAnnouncementInput,
  CreateAvailabilityInput,
  CorrectMatchEventInput,
  CreateDocumentReviewLinkInput,
  CreateAthleteDraftInput,
  CreateBracketInput,
  CreateCommunicationTemplateInput,
  CreateConversationThreadInput,
  CreateDiscountCodeInput,
  CreateFacilityInput,
  CreateMembershipPlanInput,
  CreateMatchEventInput,
  CreateMatchInput,
  CreateOfficialProfileInput,
  CreateRefreshSessionInput,
  CreateSchoolInput,
  CreateTeamInput,
  CreateTournamentInput,
  CreateTournamentRegistrationInvoiceInput,
  CreateTournamentWaiverRequirementInput,
  CreateVenueUnitInput,
  CreateUserInput,
  CreateWaiverTemplateInput,
  DocumentRepository,
  EnsureTournamentWaiversInput,
  ExtractIdentityDocumentInput,
  FederationOverrideInput,
  FinanceReportInput,
  GenerateScheduleInput,
  LinkGuardianInput,
  ListDocumentReviewQueueInput,
  ListExpiringDocumentsInput,
  MatchRepository,
  OverrideMatchScheduleInput,
  PurchaseSchoolMembershipInput,
  PushSyncMutationsInput,
  QrRepository,
  QrResourceType,
  RefreshSessionRecord,
  RecordManualPaymentInput,
  RegenerateBracketInput,
  RefundPaymentInput,
  RespondAssignmentInput,
  RotateRefreshSessionInput,
  RecordDocumentReviewInput,
  SchoolInviteResult,
  SchoolRepository,
  SearchRepository,
  SchedulingRepository,
  SendTemplateNotificationInput,
  SignWaiverInput,
  SyncRepository,
  TeamRepository,
  TournamentRepository,
  UpdateBracketSeedsInput,
  UpsertNotificationPreferenceInput,
  UserRepository,
  UploadIdentityDocumentInput,
  WaiverRepository,
} from './repository.types.js';

type TenantRow = typeof tenants.$inferSelect;
type UserRow = typeof users.$inferSelect;
type SchoolRow = typeof schools.$inferSelect;
type AthleteRow = typeof athletes.$inferSelect;
type GuardianConsentRow = typeof guardianConsents.$inferSelect;
type AuditLogRow = typeof auditLogs.$inferSelect;
type TournamentRow = typeof tournaments.$inferSelect;
type BracketRow = typeof brackets.$inferSelect;
type BracketVersionRow = typeof bracketVersions.$inferSelect;
type BracketSeedRow = typeof bracketSeeds.$inferSelect;
type BracketNodeRow = typeof bracketNodes.$inferSelect;
type StandingRow = typeof standingRows.$inferSelect;
type MembershipPlanRow = typeof membershipPlans.$inferSelect;
type SchoolMembershipRow = typeof schoolMemberships.$inferSelect;
type DiscountCodeRow = typeof discountCodes.$inferSelect;
type InvoiceRow = typeof invoices.$inferSelect;
type InvoiceInstallmentRow = typeof invoiceInstallments.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;
type RefundRow = typeof refunds.$inferSelect;
type WaiverTemplateRow = typeof waiverTemplates.$inferSelect;
type TournamentWaiverRequirementRow = typeof tournamentWaiverRequirements.$inferSelect;
type WaiverSignatureRow = typeof waiverSignatures.$inferSelect;
type IdentityDocumentRow = typeof identityDocuments.$inferSelect;
type DocumentExtractionRow = typeof documentExtractions.$inferSelect;
type DocumentReviewFlagRow = typeof documentReviewFlags.$inferSelect;
type DocumentReviewRow = typeof documentReviews.$inferSelect;
type DocumentReviewLinkRow = typeof documentReviewLinks.$inferSelect;
type DocumentDuplicateCandidateRow = typeof documentDuplicateCandidates.$inferSelect;
type TeamRow = typeof teams.$inferSelect;
type MatchRow = typeof matches.$inferSelect;
type MatchEventRow = typeof matchEvents.$inferSelect;
type FacilityRow = typeof facilities.$inferSelect;
type VenueUnitRow = typeof venueUnits.$inferSelect;
type AvailabilityWindowRow = typeof availabilityWindows.$inferSelect;
type OfficialProfileRow = typeof officialProfiles.$inferSelect;
type MatchScheduleRow = typeof matchSchedules.$inferSelect;
type OfficialAssignmentRow = typeof officialAssignments.$inferSelect;
type ScheduleNotificationRow = typeof scheduleNotifications.$inferSelect;
type OfficialPayoutExportRow = typeof officialPayoutExports.$inferSelect;
type QrCodeRow = typeof qrCodes.$inferSelect;
type SyncMutationRow = typeof syncMutations.$inferSelect;
type RefreshSessionRow = typeof refreshSessions.$inferSelect;
type DatabaseExecutor = DatabaseService['db'];

const DEFAULT_USER_ID = 'usr_super_admin';

abstract class PostgresRepositoryBase {
  constructor(protected readonly database: DatabaseService) {}

  protected get db() {
    return this.database.db;
  }

  protected nextId(prefix: string) {
    return `${prefix}_${Date.now()}_${this.randomToken(6)}`;
  }

  protected randomToken(length: number) {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();
  }

  protected generateAthletiqId() {
    return `ATQ-${this.randomToken(3)}-${this.randomToken(6)}-${this.randomToken(3)}`;
  }

  protected toIso(value: Date | string) {
    return value instanceof Date ? value.toISOString() : value;
  }

  protected assertSafeStoredPassword(value: string) {
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

  protected async ensurePlatformTenant(db: DatabaseExecutor = this.db) {
    await db
      .insert(tenants)
      .values({
        id: 'platform',
        type: 'platform',
        name: 'ATHLETIQ Platform',
        status: 'active',
      })
      .onConflictDoNothing();
  }

  protected async ensureSchoolTenant(
    input: {
      id: string;
      name: string;
      status: TenantRow['status'];
    },
    db: DatabaseExecutor = this.db,
  ) {
    await db
      .insert(tenants)
      .values({
        id: input.id,
        type: 'school',
        name: input.name,
        status: input.status,
      })
      .onConflictDoNothing();
  }

  protected async ensureDefaultSuperAdmin() {
    await this.ensurePlatformTenant();
    await this.db
      .insert(users)
      .values({
        id: DEFAULT_USER_ID,
        tenantId: 'platform',
        email: 'admin@athletiq.local',
        password: `LOCKED:${this.randomToken(32)}`,
        roles: ['super_admin'],
        schoolIds: [],
      })
      .onConflictDoNothing();
  }

  protected async addAuditLog(
    input: {
      tenantId: string;
      actorUserId: string;
      action: string;
      resource: string;
      resourceId: string;
      metadata: Record<string, string | number | null | boolean>;
    },
    db: DatabaseExecutor = this.db,
  ) {
    await db.insert(auditLogs).values({
      id: this.nextId('audit'),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      metadata: input.metadata,
    });
  }

  protected mapUser(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      roles: row.roles as UserRole[],
      schoolIds: [...row.schoolIds],
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected async schoolIdsForUser(userId: string) {
    const memberships = await this.db
      .select({ schoolId: schoolUsers.schoolId })
      .from(schoolUsers)
      .where(and(eq(schoolUsers.userId, userId), eq(schoolUsers.status, 'active')));

    return memberships.map((membership) => membership.schoolId);
  }

  protected async mapUserWithMemberships(row: UserRow): Promise<UserRecord> {
    const membershipSchoolIds = await this.schoolIdsForUser(row.id);
    return {
      ...this.mapUser(row),
      schoolIds: membershipSchoolIds.length > 0 ? membershipSchoolIds : [...row.schoolIds],
    };
  }

  protected mapSchool(row: SchoolRow) {
    return {
      id: row.id,
      name: row.name,
      ...(row.location ? { location: row.location } : {}),
      status: row.status as 'pending' | 'approved',
      createdBy: row.createdBy,
      ...(row.approvedBy ? { approvedBy: row.approvedBy } : {}),
      adminUserIds: [...row.adminUserIds],
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapAthlete(row: AthleteRow) {
    return {
      id: row.id,
      schoolId: row.schoolId,
      fullName: row.fullName,
      ...(row.dateOfBirth ? { dateOfBirth: row.dateOfBirth } : {}),
      ...(row.gender ? { gender: row.gender } : {}),
      status: row.status as 'draft' | 'identity_approved',
      ...(row.athletiqId ? { athletiqId: row.athletiqId } : {}),
      createdBy: row.createdBy,
      ...(row.approvedBy ? { approvedBy: row.approvedBy } : {}),
      publicProfileStatus: (row.publicProfileStatus as 'private' | 'public') ?? 'private',
      guardianConsentRequired: row.guardianConsentRequired,
      ...(row.guardianConsentGrantedAt
        ? { guardianConsentGrantedAt: this.toIso(row.guardianConsentGrantedAt) }
        : {}),
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapGuardianConsent(row: GuardianConsentRow): GuardianConsentRecord {
    return {
      id: row.id,
      athleteId: row.athleteId,
      schoolId: row.schoolId,
      guardianName: row.guardianName,
      relationship: row.relationship,
      consentType: row.consentType,
      grantedAt: this.toIso(row.grantedAt),
      ...(row.revokedAt ? { revokedAt: this.toIso(row.revokedAt) } : {}),
      recordedBy: row.recordedBy,
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapAuditLog(row: AuditLogRow) {
    return {
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      resource: row.resource,
      resourceId: row.resourceId,
      metadata: row.metadata as Record<string, string | number | null | boolean>,
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapMembershipPlan(row: MembershipPlanRow): MembershipPlanRecord {
    return {
      id: row.id,
      name: row.name,
      ...(row.description ? { description: row.description } : {}),
      amount: row.amount,
      currency: row.currency,
      durationDays: row.durationDays,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapSchoolMembership(row: SchoolMembershipRow): SchoolMembershipRecord {
    return {
      id: row.id,
      schoolId: row.schoolId,
      planId: row.planId,
      invoiceId: row.invoiceId,
      status: row.status as SchoolMembershipRecord['status'],
      ...(row.startsAt ? { startsAt: this.toIso(row.startsAt) } : {}),
      ...(row.expiresAt ? { expiresAt: this.toIso(row.expiresAt) } : {}),
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapDiscountCode(row: DiscountCodeRow): DiscountCodeRecord {
    return {
      id: row.id,
      code: row.code,
      amount: row.amount,
      currency: row.currency,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapInvoiceInstallment(row: InvoiceInstallmentRow): InvoiceInstallmentRecord {
    return {
      id: row.id,
      invoiceId: row.invoiceId,
      amount: row.amount,
      ...(row.dueAt ? { dueAt: this.toIso(row.dueAt) } : {}),
      status: row.status as InvoiceInstallmentRecord['status'],
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected async mapInvoice(
    row: InvoiceRow,
    db: DatabaseExecutor = this.db,
  ): Promise<InvoiceRecord> {
    const installments = await db
      .select()
      .from(invoiceInstallments)
      .where(eq(invoiceInstallments.invoiceId, row.id));

    return {
      id: row.id,
      schoolId: row.schoolId,
      entityType: row.entityType as InvoiceRecord['entityType'],
      entityId: row.entityId,
      subtotalAmount: row.subtotalAmount,
      discountAmount: row.discountAmount,
      totalAmount: row.totalAmount,
      paidAmount: row.paidAmount,
      refundedAmount: row.refundedAmount,
      balanceAmount: row.balanceAmount,
      currency: row.currency,
      status: row.status as InvoiceRecord['status'],
      ...(row.discountCode ? { discountCode: row.discountCode } : {}),
      installments: installments.map((installment) => this.mapInvoiceInstallment(installment)),
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapPayment(row: PaymentRow): PaymentRecord {
    return {
      id: row.id,
      invoiceId: row.invoiceId,
      schoolId: row.schoolId,
      amount: row.amount,
      currency: row.currency,
      method: row.method as PaymentRecord['method'],
      status: row.status as PaymentRecord['status'],
      provider: 'manual',
      ...(row.reference ? { reference: row.reference } : {}),
      ...(row.notes ? { notes: row.notes } : {}),
      approvedBy: row.approvedBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapRefund(row: RefundRow): RefundRecord {
    return {
      id: row.id,
      paymentId: row.paymentId,
      invoiceId: row.invoiceId,
      schoolId: row.schoolId,
      amount: row.amount,
      currency: row.currency,
      ...(row.reason ? { reason: row.reason } : {}),
      status: row.status as RefundRecord['status'],
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapWaiverTemplate(row: WaiverTemplateRow): WaiverTemplateRecord {
    return {
      id: row.id,
      name: row.name,
      body: row.body,
      version: row.version,
      ...(row.expiresAfterDays ? { expiresAfterDays: row.expiresAfterDays } : {}),
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapTournamentWaiverRequirement(
    row: TournamentWaiverRequirementRow,
  ): TournamentWaiverRequirementRecord {
    return {
      id: row.id,
      tournamentId: row.tournamentId,
      waiverTemplateId: row.waiverTemplateId,
      requiredFor: row.requiredFor as 'athlete',
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapWaiverSignature(row: WaiverSignatureRow): WaiverSignatureRecord {
    return {
      id: row.id,
      waiverTemplateId: row.waiverTemplateId,
      waiverTemplateVersion: row.waiverTemplateVersion,
      ...(row.tournamentId ? { tournamentId: row.tournamentId } : {}),
      athleteId: row.athleteId,
      schoolId: row.schoolId,
      guardianName: row.guardianName,
      relationship: row.relationship,
      signedBy: row.signedBy,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      signedAt: this.toIso(row.signedAt),
      ...(row.expiresAt ? { expiresAt: this.toIso(row.expiresAt) } : {}),
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapIdentityDocument(row: IdentityDocumentRow): IdentityDocumentRecord {
    return {
      id: row.id,
      schoolId: row.schoolId,
      athleteId: row.athleteId,
      documentType: row.documentType as IdentityDocumentRecord['documentType'],
      status: row.status as IdentityDocumentStatus,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      byteSize: row.sizeBytes,
      sha256Hash: row.sha256Hash,
      storageKey: row.storageKey,
      malwareScanStatus: row.malwareScanStatus as IdentityDocumentRecord['malwareScanStatus'],
      uploadedBy: row.uploadedBy,
      ...(row.verifiedBy ? { reviewedBy: row.verifiedBy } : {}),
      ...(row.verifiedAt ? { verifiedAt: this.toIso(row.verifiedAt) } : {}),
      ...(row.expiresAt ? { expiresAt: this.toIso(row.expiresAt) } : {}),
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapDocumentExtraction(row: DocumentExtractionRow): DocumentExtractionRecord {
    return {
      id: row.id,
      documentId: row.documentId,
      schoolId: row.schoolId,
      athleteId: row.athleteId,
      provider: row.provider as DocumentExtractionRecord['provider'],
      extracted: row.extracted as ExtractedIdentityFields,
      fieldConfidence: row.fieldConfidence as Partial<
        Record<keyof ExtractedIdentityFields, number>
      >,
      confidence: row.overallConfidence,
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapDocumentReviewFlag(row: DocumentReviewFlagRow): DocumentReviewFlagRecord {
    const metadata = row.metadata as {
      field?: DocumentReviewFlagRecord['field'];
      severity?: DocumentReviewFlagRecord['severity'];
      message?: string;
    };
    const reasonCodes = row.reasonCodes as string[];
    return {
      id: row.id,
      documentId: row.documentId,
      extractionId: row.extractionId ?? '',
      field: metadata.field ?? (reasonCodes[0] as DocumentReviewFlagRecord['field']) ?? 'document',
      severity: metadata.severity ?? 'medium',
      message: metadata.message ?? (reasonCodes.join(', ') || 'Document needs reviewer attention'),
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapDocumentReview(row: DocumentReviewRow): DocumentReviewRecord {
    const metadata = row.reviewMetadata as {
      notes?: string;
      reason?: string;
      overrideReason?: string;
    };
    const corrections = row.corrections as ExtractedIdentityFields;
    return {
      id: row.id,
      documentId: row.documentId,
      schoolId: row.schoolId,
      athleteId: row.athleteId,
      action: row.action as DocumentReviewRecord['action'],
      ...(metadata.notes ? { notes: metadata.notes } : {}),
      ...(metadata.reason ? { reason: metadata.reason } : {}),
      ...(metadata.overrideReason ? { overrideReason: metadata.overrideReason } : {}),
      ...(Object.keys(corrections).length > 0 ? { correctedFields: corrections } : {}),
      reviewedBy: row.reviewedBy,
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapDocumentReviewLink(row: DocumentReviewLinkRow): DocumentReviewLinkRecord {
    return {
      id: row.id,
      documentId: row.documentId,
      tokenHash: row.tokenHash,
      expiresAt: this.toIso(row.expiresAt),
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapDocumentDuplicateCandidate(
    row: DocumentDuplicateCandidateRow,
  ): DocumentDuplicateCandidateRecord {
    return {
      id: row.id,
      documentId: row.documentId,
      matchedDocumentId: row.matchedDocumentId,
      matchedAthleteId: row.matchedAthleteId,
      score: row.score,
      reasonCodes: row.reasonCodes as string[],
      status: row.status as DocumentDuplicateCandidateRecord['status'],
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected async mapTournament(row: TournamentRow): Promise<TournamentRecord> {
    const [registrations, tournamentTeams, tournamentMatches] = await Promise.all([
      this.db
        .select({ schoolId: tournamentRegistrations.schoolId })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, row.id)),
      this.db.select({ id: teams.id }).from(teams).where(eq(teams.tournamentId, row.id)),
      this.db.select({ id: matches.id }).from(matches).where(eq(matches.tournamentId, row.id)),
    ]);

    return {
      id: row.id,
      name: row.name,
      sport: row.sport,
      format: row.format as TournamentFormat,
      status: row.status as TournamentRecord['status'],
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
      ...(row.maxTeams ? { maxTeams: row.maxTeams } : {}),
      ...(row.approvedBy ? { approvedBy: row.approvedBy } : {}),
      schoolIds:
        registrations.length > 0
          ? registrations.map((registration) => registration.schoolId)
          : [...row.schoolIds],
      teamIds:
        tournamentTeams.length > 0 ? tournamentTeams.map((team) => team.id) : [...row.teamIds],
      matchIds:
        tournamentMatches.length > 0
          ? tournamentMatches.map((match) => match.id)
          : [...row.matchIds],
      ...(row.season ? { season: row.season } : {}),
      ...(row.registrationFeeAmount ? { registrationFeeAmount: row.registrationFeeAmount } : {}),
      ...(row.registrationFeeCurrency
        ? { registrationFeeCurrency: row.registrationFeeCurrency }
        : {}),
      registrationFeeRequiredBeforeApproval: row.registrationFeeRequiredBeforeApproval,
    };
  }

  protected async mapTeam(row: TeamRow): Promise<TournamentTeamRecord> {
    const members = await this.db
      .select({ athleteId: teamMembers.athleteId })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, row.id));

    return {
      id: row.id,
      tournamentId: row.tournamentId,
      schoolId: row.schoolId,
      name: row.name,
      athleteIds:
        members.length > 0 ? members.map((member) => member.athleteId) : [...row.athleteIds],
      ...(row.coachUserId ? { coachUserId: row.coachUserId } : {}),
      status: row.status as TournamentTeamRecord['status'],
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapMatch(row: MatchRow): MatchRecord {
    return {
      id: row.id,
      tournamentId: row.tournamentId,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      scheduledAt: row.scheduledAt,
      status: row.status as MatchRecord['status'],
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
      ...(row.homeScore !== null ? { homeScore: row.homeScore } : {}),
      ...(row.awayScore !== null ? { awayScore: row.awayScore } : {}),
      ...(row.report ? { report: row.report as MatchStats } : {}),
      ...(row.submittedBy ? { submittedBy: row.submittedBy } : {}),
      ...(row.submittedAt ? { submittedAt: row.submittedAt } : {}),
      ...(row.verifiedBy ? { verifiedBy: row.verifiedBy } : {}),
      ...(row.verifiedAt ? { verifiedAt: row.verifiedAt } : {}),
    };
  }

  protected mapFacility(row: FacilityRow): FacilityRecord {
    return {
      id: row.id,
      name: row.name,
      location: row.location,
      timezone: row.timezone,
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapVenueUnit(row: VenueUnitRow): VenueUnitRecord {
    return {
      id: row.id,
      facilityId: row.facilityId,
      name: row.name,
      unitType: row.unitType as VenueUnitRecord['unitType'],
      sports: [...row.sports],
      status: row.status as VenueUnitRecord['status'],
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapAvailabilityWindow(row: AvailabilityWindowRow): AvailabilityWindowRecord {
    return {
      id: row.id,
      resourceType: row.resourceType as AvailabilityWindowRecord['resourceType'],
      resourceId: row.resourceId,
      ...(row.tournamentId ? { tournamentId: row.tournamentId } : {}),
      startsAt: this.toIso(row.startsAt),
      endsAt: this.toIso(row.endsAt),
      status: row.status as AvailabilityWindowRecord['status'],
      ...(row.reason ? { reason: row.reason } : {}),
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapOfficialProfile(row: OfficialProfileRow): OfficialProfileRecord {
    return {
      id: row.id,
      userId: row.userId,
      displayName: row.displayName,
      sports: [...row.sports],
      ...(row.certificationLevel ? { certificationLevel: row.certificationLevel } : {}),
      ...(row.homeSchoolId ? { homeSchoolId: row.homeSchoolId } : {}),
      ...(row.payoutRate !== null ? { payoutRate: row.payoutRate } : {}),
      ...(row.payoutCurrency ? { payoutCurrency: row.payoutCurrency } : {}),
      status: row.status as OfficialProfileRecord['status'],
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapMatchSchedule(row: MatchScheduleRow): MatchScheduleRecord {
    return {
      id: row.id,
      tournamentId: row.tournamentId,
      matchId: row.matchId,
      venueUnitId: row.venueUnitId,
      startsAt: this.toIso(row.startsAt),
      endsAt: this.toIso(row.endsAt),
      status: row.status as MatchScheduleRecord['status'],
      conflictWarnings: [...row.conflictWarnings],
      ...(row.overrideReason ? { overrideReason: row.overrideReason } : {}),
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
      ...(row.publishedAt ? { publishedAt: this.toIso(row.publishedAt) } : {}),
      ...(row.publishedBy ? { publishedBy: row.publishedBy } : {}),
    };
  }

  protected mapOfficialAssignment(row: OfficialAssignmentRow): OfficialAssignmentRecord {
    return {
      id: row.id,
      matchId: row.matchId,
      officialProfileId: row.officialProfileId,
      role: row.role as OfficialAssignmentRecord['role'],
      status: row.status as OfficialAssignmentRecord['status'],
      assignedBy: row.assignedBy,
      assignedAt: this.toIso(row.assignedAt),
      ...(row.respondedAt ? { respondedAt: this.toIso(row.respondedAt) } : {}),
      ...(row.checkedInAt ? { checkedInAt: this.toIso(row.checkedInAt) } : {}),
      ...(row.report ? { report: row.report } : {}),
    };
  }

  protected mapScheduleNotification(row: ScheduleNotificationRow): ScheduleNotificationRecord {
    return {
      id: row.id,
      recipientUserId: row.recipientUserId,
      tournamentId: row.tournamentId,
      resourceType: row.resourceType as ScheduleNotificationRecord['resourceType'],
      resourceId: row.resourceId,
      type: row.type as ScheduleNotificationRecord['type'],
      message: row.message,
      status: row.status as ScheduleNotificationRecord['status'],
      createdAt: this.toIso(row.createdAt),
      ...(row.readAt ? { readAt: this.toIso(row.readAt) } : {}),
    };
  }

  protected mapOfficialPayoutExport(row: OfficialPayoutExportRow): OfficialPayoutExportRecord {
    return {
      id: row.id,
      tournamentId: row.tournamentId,
      officialProfileId: row.officialProfileId,
      assignmentIds: [...row.assignmentIds],
      amount: row.amount,
      currency: row.currency,
      status: row.status as OfficialPayoutExportRecord['status'],
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      ...(row.reconciledAt ? { reconciledAt: this.toIso(row.reconciledAt) } : {}),
    };
  }

  protected mapMatchEvent(row: MatchEventRow): MatchEventRecord {
    return {
      id: row.id,
      matchId: row.matchId,
      tournamentId: row.tournamentId,
      athleteId: row.athleteId,
      teamId: row.teamId,
      type: row.type as MatchEventType,
      ...(row.minute !== null ? { minute: row.minute } : {}),
      ...(row.details ? { details: row.details } : {}),
      quantity: row.quantity,
      status: row.status as MatchEventRecord['status'],
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      ...(row.correctedBy ? { correctedBy: row.correctedBy } : {}),
      ...(row.correctedAt ? { correctedAt: this.toIso(row.correctedAt) } : {}),
      ...(row.correctedFromEventId ? { correctedFromEventId: row.correctedFromEventId } : {}),
      ...(row.correctionReason ? { correctionReason: row.correctionReason } : {}),
      ...(row.reason ? { reason: row.reason } : {}),
    };
  }

  protected mapQrCode(row: QrCodeRow): QrCodeRecord {
    return {
      code: row.code,
      resourceType: row.resourceType as QrResourceType,
      resourceId: row.resourceId,
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
    };
  }

  protected mapSyncMutation(row: SyncMutationRow): SyncMutationRecord {
    return {
      id: row.mutationId,
      tenantId: row.tenantId,
      clientId: row.clientId,
      actorUserId: row.actorUserId,
      status: row.status as SyncMutationRecord['status'],
      mutationType: row.mutationType,
      mutationPayload: row.mutationPayload as Record<string, unknown>,
      ...(row.errorReason ? { errorReason: row.errorReason } : {}),
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected mapRefreshSession(row: RefreshSessionRow): RefreshSessionRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      tokenHash: row.tokenHash,
      familyId: row.familyId,
      ...(row.rotatedFromSessionId ? { rotatedFromSessionId: row.rotatedFromSessionId } : {}),
      ...(row.userAgent ? { userAgent: row.userAgent } : {}),
      ...(row.ipAddress ? { ipAddress: row.ipAddress } : {}),
      expiresAt: this.toIso(row.expiresAt),
      ...(row.revokedAt ? { revokedAt: this.toIso(row.revokedAt) } : {}),
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  protected eventContribution(type: MatchEventType, quantity: number) {
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

  protected validateEventQuantity(quantity?: number) {
    if (quantity === undefined) {
      return 1;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new BadRequestException('quantity must be a non-negative integer');
    }
    return quantity;
  }

  protected normalizeMatchMinute(minute?: number) {
    if (minute === undefined) {
      return undefined;
    }
    if (!Number.isInteger(minute) || minute < 0) {
      throw new BadRequestException('minute must be a non-negative integer');
    }
    return minute;
  }

  protected isMatchCapturable(status: MatchRecord['status']) {
    return status === 'played' || status === 'verified';
  }

  protected aggregateMatchStats(match: MatchRecord, events: MatchEventRecord[]): MatchDerivedStats {
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
      byAthlete.set(event.athleteId, athleteStat);

      const teamStat = byTeam.get(event.teamId) ?? {
        teamId: event.teamId,
        matchesPlayed: 1,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        fouls: 0,
        ownGoals: 0,
      };
      byTeam.set(event.teamId, teamStat);

      athleteStat.goals += increment.goals;
      athleteStat.assists += increment.assists;
      athleteStat.yellowCards += increment.yellowCards;
      athleteStat.redCards += increment.redCards;
      athleteStat.fouls += increment.fouls;
      athleteStat.ownGoals += increment.ownGoals;

      teamStat.goals += increment.goals;
      teamStat.assists += increment.assists;
      teamStat.yellowCards += increment.yellowCards;
      teamStat.redCards += increment.redCards;
      teamStat.fouls += increment.fouls;
      teamStat.ownGoals += increment.ownGoals;
    }

    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      if (!byTeam.has(teamId)) {
        byTeam.set(teamId, {
          teamId,
          matchesPlayed: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          fouls: 0,
          ownGoals: 0,
        });
      }
    }

    return {
      matchId: match.id,
      tournamentId: match.tournamentId,
      totals,
      athleteStats: [...byAthlete.values()],
      teamStats: [...byTeam.values()],
    };
  }

  protected expectReturned<T>(row: T | undefined, action: string): T {
    if (!row) {
      throw new Error(`Database did not return row for ${action}`);
    }
    return row;
  }

  protected buildInstallments(
    invoiceId: string,
    tenantId: string,
    totalAmount: number,
    installmentCount: number | undefined,
    paid: boolean,
  ) {
    const count = Math.max(1, Math.floor(installmentCount ?? 1));
    const baseAmount = Math.floor(totalAmount / count);
    const remainder = totalAmount - baseAmount * count;

    return Array.from({ length: count }, (_, index) => ({
      id: this.nextId('inst'),
      tenantId,
      invoiceId,
      amount: baseAmount + (index === count - 1 ? remainder : 0),
      status: paid ? 'paid' : 'open',
    }));
  }

  protected recalculateInvoiceValues(input: {
    totalAmount: number;
    paidAmount: number;
    refundedAmount: number;
    installments: InvoiceInstallmentRow[];
  }) {
    const netPaidAmount = Math.max(input.paidAmount - input.refundedAmount, 0);
    const balanceAmount = Math.max(input.totalAmount - netPaidAmount, 0);
    const status =
      input.refundedAmount >= input.paidAmount && input.paidAmount > 0
        ? 'refunded'
        : balanceAmount === 0
          ? 'paid'
          : 'open';
    let remainingPaidAmount = netPaidAmount;
    const installmentStatuses = input.installments.map((installment) => {
      const installmentPaid = remainingPaidAmount >= installment.amount;
      remainingPaidAmount = Math.max(remainingPaidAmount - installment.amount, 0);
      return {
        id: installment.id,
        status: installmentPaid ? 'paid' : 'open',
      };
    });

    return { balanceAmount, status, installmentStatuses };
  }

  protected membershipActiveWindow(startsAt: Date, durationDays: number) {
    return {
      startsAt,
      expiresAt: new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000),
    };
  }

  protected tournamentRegistrationEntityId(tournamentId: string, schoolId: string) {
    return `${tournamentId}:${schoolId}`;
  }

  protected async lockTournamentRow(
    tournamentId: string,
    db: DatabaseExecutor,
  ): Promise<TournamentRow> {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .for('update')
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }
}

@Injectable()
export class PostgresUserRepository extends PostgresRepositoryBase implements UserRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async create(input: CreateUserInput) {
    this.assertSafeStoredPassword(input.passwordHash);
    await this.ensurePlatformTenant();
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const [created] = await this.db
      .insert(users)
      .values({
        id: this.nextId('usr'),
        tenantId: input.schoolIds?.[0] ?? 'platform',
        email: input.email,
        password: input.passwordHash,
        roles: [...input.roles],
        schoolIds: [...(input.schoolIds ?? [])],
      })
      .returning();

    return this.mapUser(this.expectReturned(created, 'user.create'));
  }

  async findById(userId: string) {
    if (userId === DEFAULT_USER_ID) {
      await this.ensureDefaultSuperAdmin();
    }

    const [found] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return found ? this.mapUserWithMemberships(found) : undefined;
  }

  async findByEmail(email: string) {
    const [found] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return found ? this.mapUserWithMemberships(found) : undefined;
  }

  async updatePassword(userId: string, passwordHash: string) {
    this.assertSafeStoredPassword(passwordHash);
    const [updated] = await this.db
      .update(users)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    const user = this.expectReturned(updated, 'user.updatePassword');
    return this.mapUserWithMemberships(user);
  }
}

@Injectable()
export class PostgresAuthSessionRepository
  extends PostgresRepositoryBase
  implements AuthSessionRepository
{
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async createRefreshSession(input: CreateRefreshSessionInput) {
    const [created] = await this.db
      .insert(refreshSessions)
      .values({
        id: this.nextId('ses'),
        tenantId: input.tenantId,
        userId: input.userId,
        tokenHash: input.tokenHash,
        familyId: input.familyId,
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        expiresAt: input.expiresAt,
      })
      .returning();

    return this.mapRefreshSession(this.expectReturned(created, 'authSession.createRefreshSession'));
  }

  async findRefreshSessionByTokenHash(tokenHash: string) {
    const [found] = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.tokenHash, tokenHash))
      .limit(1);
    return found ? this.mapRefreshSession(found) : undefined;
  }

  async rotateRefreshSession(input: RotateRefreshSessionInput) {
    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const now = new Date();
      const [current] = await db
        .select()
        .from(refreshSessions)
        .where(eq(refreshSessions.id, input.currentSessionId))
        .for('update')
        .limit(1);

      const currentSession = this.expectReturned(
        current,
        'authSession.rotateRefreshSession.current',
      );
      if (currentSession.revokedAt || currentSession.expiresAt.getTime() <= now.getTime()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await db
        .update(refreshSessions)
        .set({ revokedAt: currentSession.revokedAt ?? now, updatedAt: now })
        .where(eq(refreshSessions.id, input.currentSessionId));

      const [inserted] = await db
        .insert(refreshSessions)
        .values({
          id: this.nextId('ses'),
          tenantId: input.tenantId,
          userId: input.userId,
          tokenHash: input.tokenHash,
          familyId: input.familyId,
          rotatedFromSessionId: input.currentSessionId,
          ...(input.userAgent ? { userAgent: input.userAgent } : {}),
          ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
          expiresAt: input.expiresAt,
        })
        .returning();

      return this.expectReturned(inserted, 'authSession.rotateRefreshSession.next');
    });

    return this.mapRefreshSession(created);
  }

  async revokeRefreshSession(sessionId: string) {
    const now = new Date();
    const [updated] = await this.db
      .update(refreshSessions)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(refreshSessions.id, sessionId))
      .returning();
    return this.mapRefreshSession(this.expectReturned(updated, 'authSession.revokeRefreshSession'));
  }
}

@Injectable()
export class PostgresSchoolRepository extends PostgresRepositoryBase implements SchoolRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async create(input: CreateSchoolInput) {
    const now = new Date();
    const schoolId = this.nextId('sch');
    const adminUserIds = input.actor.role === 'school_admin' ? [input.actor.id] : [];

    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      await this.ensurePlatformTenant(db);
      await this.ensureSchoolTenant(
        {
          id: schoolId,
          name: input.name,
          status: 'pending',
        },
        db,
      );

      const [inserted] = await db
        .insert(schools)
        .values({
          id: schoolId,
          tenantId: schoolId,
          name: input.name,
          ...(input.location ? { location: input.location } : {}),
          status: 'pending',
          createdBy: input.actor.id,
          adminUserIds,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (input.actor.role === 'school_admin') {
        await this.linkUserToSchool(input.actor.id, schoolId, 'school_admin', undefined, db);
      }

      return this.expectReturned(inserted, 'school.create');
    });

    return this.mapSchool(created);
  }

  async approve(actor: AuthenticatedUser, schoolId: string) {
    const [school] = await this.db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const updated = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [row] = await db
        .update(schools)
        .set({
          status: 'approved',
          approvedBy: actor.id,
          updatedAt: new Date(),
        })
        .where(eq(schools.id, schoolId))
        .returning();

      await db
        .update(tenants)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(tenants.id, schoolId));
      await this.addAuditLog(
        {
          tenantId: schoolId,
          actorUserId: actor.id,
          action: 'school.approved',
          resource: 'school',
          resourceId: schoolId,
          metadata: {
            schoolStatus: 'approved',
          },
        },
        db,
      );

      return this.expectReturned(row, 'school.approve');
    });

    return this.mapSchool(updated);
  }

  async inviteUser(
    actor: AuthenticatedUser,
    schoolId: string,
    email: string,
    role: UserRole = 'coach',
  ): Promise<SchoolInviteResult> {
    const [school] = await this.db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const isSchoolAdmin = actor.role === 'super_admin' || school.adminUserIds.includes(actor.id);
    if (!isSchoolAdmin) {
      throw new ForbiddenException('Only school admin can invite users');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      const roles = existingUser.roles.includes(role)
        ? existingUser.roles
        : [...existingUser.roles, role];

      await this.db.transaction(async (tx) => {
        const db = tx as unknown as DatabaseExecutor;
        await db
          .update(users)
          .set({ roles, updatedAt: new Date() })
          .where(eq(users.id, existingUser.id));
        await this.linkUserToSchool(existingUser.id, schoolId, role, actor.id, db);
      });

      return { email: normalizedEmail, userId: existingUser.id, role, schoolId };
    }

    const userId = this.nextId('usr');
    await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      await db.insert(users).values({
        id: userId,
        tenantId: schoolId,
        email: normalizedEmail,
        password: `LOCKED:${this.randomToken(32)}`,
        roles: [role],
        schoolIds: [schoolId],
      });
      await this.linkUserToSchool(userId, schoolId, role, actor.id, db);
    });

    return {
      email: normalizedEmail,
      userId,
      role,
      schoolId,
      requiresPasswordSetup: true,
    };
  }

  async list() {
    const rows = await this.db.select().from(schools);
    return rows.map((row) => this.mapSchool(row));
  }

  private async linkUserToSchool(
    userId: string,
    schoolId: string,
    role: UserRole,
    invitedBy?: string,
    db: DatabaseExecutor = this.db,
  ) {
    await db
      .insert(schoolUsers)
      .values({
        id: this.nextId('schusr'),
        tenantId: schoolId,
        schoolId,
        userId,
        role,
        ...(invitedBy ? { invitedBy } : {}),
      })
      .onConflictDoNothing({
        target: [schoolUsers.schoolId, schoolUsers.userId, schoolUsers.role],
      });
  }
}

@Injectable()
export class PostgresAthleteRepository extends PostgresRepositoryBase implements AthleteRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async createDraft(actor: AuthenticatedUser, input: CreateAthleteDraftInput) {
    const [school] = await this.db
      .select()
      .from(schools)
      .where(eq(schools.id, input.schoolId))
      .limit(1);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    if (!actor.schoolIds.includes(input.schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }
    if (school.status !== 'approved') {
      throw new BadRequestException('School must be approved before registering athletes');
    }

    const [created] = await this.db
      .insert(athletes)
      .values({
        id: this.nextId('ath'),
        tenantId: input.schoolId,
        schoolId: input.schoolId,
        fullName: input.fullName,
        ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
        ...(input.gender ? { gender: input.gender } : {}),
        status: 'draft',
        createdBy: actor.id,
        publicProfileStatus: 'private',
        guardianConsentRequired: true,
      })
      .returning();

    return this.mapAthlete(this.expectReturned(created, 'athlete.createDraft'));
  }

  async approveIdentity(actor: AuthenticatedUser, athleteId: string) {
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.id, athleteId))
      .limit(1);
    if (!athlete) {
      throw new NotFoundException('Athlete not found');
    }

    const athletiqId = this.generateAthletiqId();
    const updated = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [row] = await db
        .update(athletes)
        .set({
          status: 'identity_approved',
          athletiqId,
          approvedBy: actor.id,
          updatedAt: new Date(),
        })
        .where(eq(athletes.id, athleteId))
        .returning();

      await this.addAuditLog(
        {
          tenantId: athlete.tenantId,
          actorUserId: actor.id,
          action: 'athlete.identity_approved',
          resource: 'athlete',
          resourceId: athleteId,
          metadata: { athletiqId },
        },
        db,
      );

      return this.expectReturned(row, 'athlete.approveIdentity');
    });

    return this.mapAthlete(updated);
  }

  async findById(athleteId: string) {
    const [found] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.id, athleteId))
      .limit(1);
    return found ? this.mapAthlete(found) : undefined;
  }

  async findWithVerifiedStats(athleteId: string) {
    const athlete = await this.findById(athleteId);
    if (!athlete) {
      return undefined;
    }

    return {
      ...athlete,
      verifiedTournamentStats: [] as TournamentAthleteStat[],
    };
  }

  async recordGuardianConsent(
    actor: AuthenticatedUser,
    athleteId: string,
    input: { guardianName: string; relationship: string; consentType?: string },
  ) {
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.id, athleteId))
      .limit(1);
    if (!athlete) {
      throw new NotFoundException('Athlete not found');
    }
    if (actor.role !== 'super_admin' && !actor.schoolIds.includes(athlete.schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }

    const now = new Date();
    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [consent] = await db
        .insert(guardianConsents)
        .values({
          id: this.nextId('gco'),
          tenantId: athlete.tenantId,
          athleteId,
          schoolId: athlete.schoolId,
          guardianName: input.guardianName,
          relationship: input.relationship,
          consentType: input.consentType ?? 'public_profile',
          grantedAt: now,
          recordedBy: actor.id,
        })
        .returning();

      if ((input.consentType ?? 'public_profile') === 'public_profile') {
        await db
          .update(athletes)
          .set({
            guardianConsentRequired: true,
            guardianConsentGrantedAt: now,
            updatedAt: now,
          })
          .where(eq(athletes.id, athleteId));
      } else {
        await db.update(athletes).set({ updatedAt: now }).where(eq(athletes.id, athleteId));
      }

      await this.addAuditLog(
        {
          tenantId: athlete.tenantId,
          actorUserId: actor.id,
          action: 'privacy.guardian_consent_recorded',
          resource: 'athlete',
          resourceId: athleteId,
          metadata: { consentType: input.consentType ?? 'public_profile' },
        },
        db,
      );

      return this.expectReturned(consent, 'privacy.recordGuardianConsent');
    });

    return this.mapGuardianConsent(created);
  }

  async setPublicProfileStatus(
    actor: AuthenticatedUser,
    athleteId: string,
    status: 'private' | 'public',
  ) {
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.id, athleteId))
      .limit(1);
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

    const [updated] = await this.db
      .update(athletes)
      .set({ publicProfileStatus: status, updatedAt: new Date() })
      .where(eq(athletes.id, athleteId))
      .returning();
    return this.mapAthlete(this.expectReturned(updated, 'privacy.setPublicProfileStatus'));
  }

  async getPublicProfile(athleteId: string) {
    const athlete = await this.findById(athleteId);
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
  }

  async list() {
    const rows = await this.db.select().from(athletes);
    return rows.map((row) => this.mapAthlete(row));
  }

  async listIds() {
    const rows = await this.db.select({ id: athletes.id }).from(athletes);
    return rows.map((row) => row.id);
  }
}

@Injectable()
export class PostgresAuditRepository extends PostgresRepositoryBase implements AuditRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async list() {
    const rows = await this.db.select().from(auditLogs);
    return rows.map((row) => this.mapAuditLog(row));
  }

  async record(input: Parameters<AuditRepository['record']>[0]) {
    const [created] = await this.db
      .insert(auditLogs)
      .values({
        id: this.nextId('audit'),
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: input.metadata,
      })
      .returning();

    return this.mapAuditLog(this.expectReturned(created, 'audit.record'));
  }
}

@Injectable()
export class PostgresBillingRepository extends PostgresRepositoryBase implements BillingRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async createMembershipPlan(actor: AuthenticatedUser, input: CreateMembershipPlanInput) {
    await this.ensurePlatformTenant();
    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [plan] = await db
        .insert(membershipPlans)
        .values({
          id: this.nextId('mplan'),
          tenantId: 'platform',
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          amount: input.amount,
          currency: input.currency,
          durationDays: input.durationDays,
          isActive: true,
          createdBy: actor.id,
        })
        .returning();
      const inserted = this.expectReturned(plan, 'billing.createMembershipPlan');
      await this.addAuditLog(
        {
          tenantId: 'platform',
          actorUserId: actor.id,
          action: 'billing.membership_plan_created',
          resource: 'membership_plan',
          resourceId: inserted.id,
          metadata: {
            name: inserted.name,
            amount: inserted.amount,
            currency: inserted.currency,
          },
        },
        db,
      );
      return inserted;
    });

    return this.mapMembershipPlan(created);
  }

  async listMembershipPlans() {
    const rows = await this.db.select().from(membershipPlans);
    return rows.map((row) => this.mapMembershipPlan(row));
  }

  async createDiscountCode(actor: AuthenticatedUser, input: CreateDiscountCodeInput) {
    await this.ensurePlatformTenant();
    const normalizedCode = input.code.trim().toUpperCase();
    const [existing] = await this.db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, normalizedCode))
      .limit(1);
    if (existing) {
      throw new BadRequestException('discount code already exists');
    }

    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [discountCode] = await db
        .insert(discountCodes)
        .values({
          id: this.nextId('disc'),
          tenantId: 'platform',
          code: normalizedCode,
          amount: input.amount,
          currency: input.currency,
          isActive: true,
          createdBy: actor.id,
        })
        .returning();
      const inserted = this.expectReturned(discountCode, 'billing.createDiscountCode');
      await this.addAuditLog(
        {
          tenantId: 'platform',
          actorUserId: actor.id,
          action: 'billing.discount_code_created',
          resource: 'discount_code',
          resourceId: inserted.id,
          metadata: {
            code: inserted.code,
            amount: inserted.amount,
            currency: inserted.currency,
          },
        },
        db,
      );
      return inserted;
    });

    return this.mapDiscountCode(created);
  }

  async purchaseSchoolMembership(
    actor: AuthenticatedUser,
    schoolId: string,
    input: PurchaseSchoolMembershipInput,
  ) {
    if (actor.role !== 'super_admin' && !actor.schoolIds.includes(schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }

    const [school] = await this.db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const [plan] = await this.db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.id, input.planId))
      .limit(1);
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Membership plan not found');
    }

    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const discount = input.discountCode
        ? await this.findActiveDiscount(db, input.discountCode, plan.currency)
        : undefined;
      const discountAmount = Math.min(discount?.amount ?? 0, plan.amount);
      const totalAmount = Math.max(plan.amount - discountAmount, 0);
      const invoiceStatus = totalAmount === 0 ? 'paid' : 'open';
      const membershipId = this.nextId('mship');
      const invoiceId = this.nextId('inv');
      const now = new Date();
      const [invoice] = await db
        .insert(invoices)
        .values({
          id: invoiceId,
          tenantId: schoolId,
          schoolId,
          entityType: 'school_membership',
          entityId: membershipId,
          subtotalAmount: plan.amount,
          discountAmount,
          totalAmount,
          paidAmount: totalAmount === 0 ? totalAmount : 0,
          refundedAmount: 0,
          balanceAmount: invoiceStatus === 'paid' ? 0 : totalAmount,
          currency: plan.currency,
          status: invoiceStatus,
          ...(discount ? { discountCode: discount.code } : {}),
          createdBy: actor.id,
        })
        .returning();
      const insertedInvoice = this.expectReturned(invoice, 'billing.purchase.invoice');
      await db
        .insert(invoiceInstallments)
        .values(
          this.buildInstallments(
            insertedInvoice.id,
            schoolId,
            totalAmount,
            input.installmentCount,
            invoiceStatus === 'paid',
          ),
        );
      const [membership] = await db
        .insert(schoolMemberships)
        .values({
          id: membershipId,
          tenantId: schoolId,
          schoolId,
          planId: plan.id,
          invoiceId: insertedInvoice.id,
          status: invoiceStatus === 'paid' ? 'active' : 'pending',
          ...(invoiceStatus === 'paid' ? this.membershipActiveWindow(now, plan.durationDays) : {}),
          createdBy: actor.id,
        })
        .returning();
      const insertedMembership = this.expectReturned(membership, 'billing.purchase.membership');
      await this.addAuditLog(
        {
          tenantId: schoolId,
          actorUserId: actor.id,
          action: 'billing.school_membership_purchased',
          resource: 'school_membership',
          resourceId: insertedMembership.id,
          metadata: {
            schoolId,
            planId: plan.id,
            invoiceId: insertedInvoice.id,
            totalAmount,
          },
        },
        db,
      );

      return { invoice: insertedInvoice, membership: insertedMembership };
    });

    return {
      membership: this.mapSchoolMembership(result.membership),
      invoice: await this.mapInvoice(result.invoice),
    };
  }

  async configureTournamentRegistrationFee(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: ConfigureTournamentRegistrationFeeInput,
  ) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const updated = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [row] = await db
        .update(tournaments)
        .set({
          registrationFeeAmount: input.amount,
          registrationFeeCurrency: input.currency,
          registrationFeeRequiredBeforeApproval: input.requiredBeforeApproval ?? true,
          updatedAt: new Date(),
        })
        .where(eq(tournaments.id, tournamentId))
        .returning();
      const result = this.expectReturned(row, 'billing.configureTournamentFee');
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'billing.tournament_registration_fee_configured',
          resource: 'tournament',
          resourceId: tournamentId,
          metadata: {
            amount: input.amount,
            currency: input.currency,
            requiredBeforeApproval: input.requiredBeforeApproval ?? true,
          },
        },
        db,
      );
      return result;
    });

    return this.mapTournament(updated);
  }

  async createTournamentRegistrationInvoice(
    actor: AuthenticatedUser,
    tournamentId: string,
    schoolId: string,
    input: CreateTournamentRegistrationInvoiceInput,
  ) {
    if (actor.role !== 'super_admin' && !actor.schoolIds.includes(schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }

    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    const [school] = await this.db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const entityId = this.tournamentRegistrationEntityId(tournamentId, schoolId);

    const inserted = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [existing] = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.entityType, 'tournament_registration'),
            eq(invoices.entityId, entityId),
            ne(invoices.status, 'void'),
          ),
        )
        .limit(1);
      if (existing && existing.status !== 'void') {
        return existing;
      }

      const subtotalAmount = tournament.registrationFeeAmount ?? 0;
      const currency = tournament.registrationFeeCurrency ?? 'NPR';
      const discount = input.discountCode
        ? await this.findActiveDiscount(db, input.discountCode, currency)
        : undefined;
      const discountAmount = Math.min(discount?.amount ?? 0, subtotalAmount);
      const totalAmount = Math.max(subtotalAmount - discountAmount, 0);
      const status = totalAmount === 0 ? 'paid' : 'open';
      const [invoice] = await db
        .insert(invoices)
        .values({
          id: this.nextId('inv'),
          tenantId: schoolId,
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
          createdBy: actor.id,
        })
        .onConflictDoNothing()
        .returning();
      if (!invoice) {
        const [conflictingInvoice] = await db
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.entityType, 'tournament_registration'),
              eq(invoices.entityId, entityId),
              ne(invoices.status, 'void'),
            ),
          )
          .limit(1);
        return this.expectReturned(
          conflictingInvoice,
          'billing.createTournamentRegistrationInvoice.conflict',
        );
      }

      const insertedInvoice = invoice;
      await db
        .insert(invoiceInstallments)
        .values(
          this.buildInstallments(
            insertedInvoice.id,
            schoolId,
            totalAmount,
            input.installmentCount,
            status === 'paid',
          ),
        );
      await this.addAuditLog(
        {
          tenantId: schoolId,
          actorUserId: actor.id,
          action: 'billing.tournament_registration_invoice_created',
          resource: 'invoice',
          resourceId: insertedInvoice.id,
          metadata: {
            tournamentId,
            schoolId,
            totalAmount,
          },
        },
        db,
      );
      return insertedInvoice;
    });

    return this.mapInvoice(inserted);
  }

  async ensureTournamentRegistrationPaymentSatisfied(tournamentId: string, schoolId: string) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
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
    const registrationInvoices = await this.db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.entityType, 'tournament_registration'), eq(invoices.entityId, entityId)),
      );
    if (
      !registrationInvoices.some(
        (invoice) => invoice.status === 'paid' && invoice.balanceAmount === 0,
      )
    ) {
      throw new BadRequestException('Tournament registration payment required');
    }
    return true;
  }

  async recordManualPayment(
    actor: AuthenticatedUser,
    invoiceId: string,
    input: RecordManualPaymentInput,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .for('update')
        .limit(1);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (actor.role !== 'super_admin' && !actor.schoolIds.includes(invoice.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }
      if (input.amount > invoice.balanceAmount) {
        throw new BadRequestException('payment amount exceeds invoice balance');
      }

      const [payment] = await db
        .insert(payments)
        .values({
          id: this.nextId('pay'),
          tenantId: invoice.tenantId,
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
        })
        .returning();
      const insertedPayment = this.expectReturned(payment, 'billing.recordManualPayment.payment');
      const currentInstallments = await db
        .select()
        .from(invoiceInstallments)
        .where(eq(invoiceInstallments.invoiceId, invoice.id));
      const recalculated = this.recalculateInvoiceValues({
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount + input.amount,
        refundedAmount: invoice.refundedAmount,
        installments: currentInstallments,
      });
      const [updatedInvoice] = await db
        .update(invoices)
        .set({
          paidAmount: invoice.paidAmount + input.amount,
          balanceAmount: recalculated.balanceAmount,
          status: recalculated.status,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id))
        .returning();
      for (const installment of recalculated.installmentStatuses) {
        await db
          .update(invoiceInstallments)
          .set({ status: installment.status })
          .where(eq(invoiceInstallments.id, installment.id));
      }
      const resultInvoice = this.expectReturned(
        updatedInvoice,
        'billing.recordManualPayment.invoice',
      );
      const membership = await this.activateMembershipForPaidInvoice(db, resultInvoice);
      await this.addAuditLog(
        {
          tenantId: invoice.tenantId,
          actorUserId: actor.id,
          action: 'billing.manual_payment_approved',
          resource: 'payment',
          resourceId: insertedPayment.id,
          metadata: {
            invoiceId: invoice.id,
            schoolId: invoice.schoolId,
            amount: insertedPayment.amount,
            method: insertedPayment.method,
          },
        },
        db,
      );
      return { invoice: resultInvoice, payment: insertedPayment, membership };
    });

    return {
      invoice: await this.mapInvoice(result.invoice),
      payment: this.mapPayment(result.payment),
      ...(result.membership ? { membership: this.mapSchoolMembership(result.membership) } : {}),
    };
  }

  async refundPayment(actor: AuthenticatedUser, paymentId: string, input: RefundPaymentInput) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .for('update')
        .limit(1);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, payment.invoiceId))
        .for('update')
        .limit(1);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      const existingRefunds = await db
        .select()
        .from(refunds)
        .where(eq(refunds.paymentId, paymentId));
      const refundedForPayment = existingRefunds.reduce((sum, refund) => sum + refund.amount, 0);
      if (input.amount > payment.amount - refundedForPayment) {
        throw new BadRequestException('refund amount exceeds refundable payment balance');
      }

      const [refund] = await db
        .insert(refunds)
        .values({
          id: this.nextId('rfnd'),
          tenantId: payment.tenantId,
          paymentId,
          invoiceId: invoice.id,
          schoolId: payment.schoolId,
          amount: input.amount,
          currency: payment.currency,
          ...(input.reason ? { reason: input.reason } : {}),
          status: 'approved',
          createdBy: actor.id,
        })
        .returning();
      const insertedRefund = this.expectReturned(refund, 'billing.refundPayment.refund');
      const [updatedPayment] = await db
        .update(payments)
        .set({
          status: input.amount + refundedForPayment >= payment.amount ? 'refunded' : 'approved',
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id))
        .returning();
      const currentInstallments = await db
        .select()
        .from(invoiceInstallments)
        .where(eq(invoiceInstallments.invoiceId, invoice.id));
      const recalculated = this.recalculateInvoiceValues({
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        refundedAmount: invoice.refundedAmount + input.amount,
        installments: currentInstallments,
      });
      const [updatedInvoice] = await db
        .update(invoices)
        .set({
          refundedAmount: invoice.refundedAmount + input.amount,
          balanceAmount: recalculated.balanceAmount,
          status: recalculated.status,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id))
        .returning();
      for (const installment of recalculated.installmentStatuses) {
        await db
          .update(invoiceInstallments)
          .set({ status: installment.status })
          .where(eq(invoiceInstallments.id, installment.id));
      }
      await this.addAuditLog(
        {
          tenantId: payment.tenantId,
          actorUserId: actor.id,
          action: 'billing.payment_refunded',
          resource: 'refund',
          resourceId: insertedRefund.id,
          metadata: {
            paymentId,
            invoiceId: invoice.id,
            amount: insertedRefund.amount,
          },
        },
        db,
      );
      return {
        invoice: this.expectReturned(updatedInvoice, 'billing.refundPayment.invoice'),
        payment: this.expectReturned(updatedPayment, 'billing.refundPayment.payment'),
        refund: insertedRefund,
      };
    });

    return {
      invoice: await this.mapInvoice(result.invoice),
      payment: this.mapPayment(result.payment),
      refund: this.mapRefund(result.refund),
    };
  }

  async getFinanceReport(input: FinanceReportInput): Promise<FinanceReportRecord> {
    const rows = await this.db.select().from(invoices);
    const filteredInvoices = rows.filter((invoice) => {
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
    const invoiceIds = new Set(filteredInvoices.map((invoice) => invoice.id));
    const [allPayments, allRefunds] = await Promise.all([
      this.db.select().from(payments),
      this.db.select().from(refunds),
    ]);
    const currency = input.currency ?? filteredInvoices[0]?.currency ?? 'NPR';
    const matchingInvoices = filteredInvoices.filter((invoice) => invoice.currency === currency);
    const matchingInvoiceIds = new Set(matchingInvoices.map((invoice) => invoice.id));
    const matchingPayments = allPayments
      .filter((payment) => invoiceIds.has(payment.invoiceId))
      .filter((payment) => matchingInvoiceIds.has(payment.invoiceId))
      .filter((payment) => payment.currency === currency);
    const matchingRefunds = allRefunds
      .filter((refund) => invoiceIds.has(refund.invoiceId))
      .filter((refund) => matchingInvoiceIds.has(refund.invoiceId))
      .filter((refund) => refund.currency === currency);
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
      payments: matchingPayments.map((payment) => this.mapPayment(payment)),
      refunds: matchingRefunds.map((refund) => this.mapRefund(refund)),
    };
  }

  private async findActiveDiscount(db: DatabaseExecutor, code: string, currency: string) {
    const [discount] = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, code.trim().toUpperCase()))
      .limit(1);
    if (!discount || !discount.isActive) {
      throw new NotFoundException('Discount code not found');
    }
    if (discount.currency !== currency) {
      throw new BadRequestException('Discount currency does not match invoice currency');
    }
    return discount;
  }

  private async activateMembershipForPaidInvoice(db: DatabaseExecutor, invoice: InvoiceRow) {
    if (invoice.entityType !== 'school_membership' || invoice.status !== 'paid') {
      return undefined;
    }
    const [membership] = await db
      .select()
      .from(schoolMemberships)
      .where(eq(schoolMemberships.id, invoice.entityId))
      .limit(1);
    if (!membership || membership.status === 'active') {
      return membership;
    }
    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.id, membership.planId))
      .limit(1);
    const now = new Date();
    const [updated] = await db
      .update(schoolMemberships)
      .set({
        status: 'active',
        ...(plan ? this.membershipActiveWindow(now, plan.durationDays) : {}),
        updatedAt: now,
      })
      .where(eq(schoolMemberships.id, membership.id))
      .returning();
    return this.expectReturned(updated, 'billing.activateMembership');
  }
}

@Injectable()
export class PostgresWaiverRepository extends PostgresRepositoryBase implements WaiverRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async createWaiverTemplate(actor: AuthenticatedUser, input: CreateWaiverTemplateInput) {
    await this.ensurePlatformTenant();
    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [template] = await db
        .insert(waiverTemplates)
        .values({
          id: this.nextId('wvt'),
          tenantId: 'platform',
          name: input.name,
          body: input.body,
          version: input.version,
          ...(input.expiresAfterDays ? { expiresAfterDays: input.expiresAfterDays } : {}),
          isActive: true,
          createdBy: actor.id,
        })
        .returning();
      const inserted = this.expectReturned(template, 'waiver.createTemplate');
      await this.addAuditLog(
        {
          tenantId: 'platform',
          actorUserId: actor.id,
          action: 'waiver.template_created',
          resource: 'waiver_template',
          resourceId: inserted.id,
          metadata: {
            name: inserted.name,
            version: inserted.version,
          },
        },
        db,
      );
      return inserted;
    });

    return this.mapWaiverTemplate(created);
  }

  async createTournamentWaiverRequirement(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: CreateTournamentWaiverRequirementInput,
  ) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    const [template] = await this.db
      .select()
      .from(waiverTemplates)
      .where(eq(waiverTemplates.id, input.waiverTemplateId))
      .limit(1);
    if (!template || !template.isActive) {
      throw new NotFoundException('Waiver template not found');
    }

    const [existing] = await this.db
      .select()
      .from(tournamentWaiverRequirements)
      .where(
        and(
          eq(tournamentWaiverRequirements.tournamentId, tournamentId),
          eq(tournamentWaiverRequirements.waiverTemplateId, template.id),
        ),
      )
      .limit(1);
    if (existing && existing.isActive) {
      return this.mapTournamentWaiverRequirement(existing);
    }

    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [requirement] = await db
        .insert(tournamentWaiverRequirements)
        .values({
          id: this.nextId('wreq'),
          tenantId: tournament.tenantId,
          tournamentId,
          waiverTemplateId: template.id,
          requiredFor: 'athlete',
          isActive: true,
          createdBy: actor.id,
        })
        .returning();
      const inserted = this.expectReturned(requirement, 'waiver.createRequirement');
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'waiver.tournament_requirement_created',
          resource: 'tournament_waiver_requirement',
          resourceId: inserted.id,
          metadata: {
            tournamentId,
            waiverTemplateId: template.id,
          },
        },
        db,
      );
      return inserted;
    });

    return this.mapTournamentWaiverRequirement(created);
  }

  async signWaiver(actor: AuthenticatedUser, input: SignWaiverInput) {
    if (actor.role !== 'super_admin' && !actor.schoolIds.includes(input.schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }

    const [template] = await this.db
      .select()
      .from(waiverTemplates)
      .where(eq(waiverTemplates.id, input.waiverTemplateId))
      .limit(1);
    if (!template || !template.isActive) {
      throw new NotFoundException('Waiver template not found');
    }
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.id, input.athleteId))
      .limit(1);
    if (!athlete || athlete.schoolId !== input.schoolId) {
      throw new BadRequestException(`athlete ${input.athleteId} not found in school`);
    }
    if (input.tournamentId) {
      const [tournament] = await this.db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, input.tournamentId))
        .limit(1);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }
    }

    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const signedAt = new Date();
      const expiresAt = template.expiresAfterDays
        ? new Date(signedAt.getTime() + template.expiresAfterDays * 24 * 60 * 60 * 1000)
        : undefined;
      const [signature] = await db
        .insert(waiverSignatures)
        .values({
          id: this.nextId('wsig'),
          tenantId: input.schoolId,
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
          signedAt,
          ...(expiresAt ? { expiresAt } : {}),
        })
        .returning();
      const inserted = this.expectReturned(signature, 'waiver.sign');
      await this.addAuditLog(
        {
          tenantId: input.schoolId,
          actorUserId: actor.id,
          action: 'waiver.signature_recorded',
          resource: 'waiver_signature',
          resourceId: inserted.id,
          metadata: {
            waiverTemplateId: template.id,
            athleteId: input.athleteId,
            schoolId: input.schoolId,
            tournamentId: input.tournamentId ?? null,
          },
        },
        db,
      );
      return inserted;
    });

    return this.mapWaiverSignature(created);
  }

  async listWaiverSignatures(athleteId: string) {
    const rows = await this.db
      .select()
      .from(waiverSignatures)
      .where(eq(waiverSignatures.athleteId, athleteId));
    return rows.map((row) => this.mapWaiverSignature(row));
  }

  async ensureTournamentWaiversSatisfied(input: EnsureTournamentWaiversInput) {
    const requirements = await this.db
      .select()
      .from(tournamentWaiverRequirements)
      .where(eq(tournamentWaiverRequirements.tournamentId, input.tournamentId));
    const activeRequirements = requirements.filter((requirement) => requirement.isActive);
    if (activeRequirements.length === 0) {
      return true;
    }

    const signatures = await this.db
      .select()
      .from(waiverSignatures)
      .where(eq(waiverSignatures.schoolId, input.schoolId));
    const templateRows = await this.db.select().from(waiverTemplates);
    const templateVersions = new Map(
      templateRows.map((template) => [template.id, template.version] as const),
    );
    const now = Date.now();
    const missing = input.athleteIds.filter((athleteId) => {
      return activeRequirements.some((requirement) => {
        const requiredVersion = templateVersions.get(requirement.waiverTemplateId);
        return !signatures.some((signature) => {
          const signatureTournamentMatches =
            !signature.tournamentId || signature.tournamentId === input.tournamentId;
          const notExpired = !signature.expiresAt || signature.expiresAt.getTime() > now;
          return (
            requiredVersion !== undefined &&
            signature.athleteId === athleteId &&
            signature.waiverTemplateId === requirement.waiverTemplateId &&
            signature.waiverTemplateVersion === requiredVersion &&
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
  }
}

@Injectable()
export class PostgresTournamentRepository
  extends PostgresRepositoryBase
  implements TournamentRepository
{
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async create(input: CreateTournamentInput) {
    await this.ensurePlatformTenant();

    const tournament = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [created] = await db
        .insert(tournaments)
        .values({
          id: this.nextId('tmb'),
          tenantId: 'platform',
          name: input.name,
          sport: input.sport,
          format: input.format,
          status: 'draft',
          createdBy: input.actor.id,
          schoolIds: [],
          teamIds: [],
          matchIds: [],
          ...(input.maxTeams ? { maxTeams: input.maxTeams } : {}),
          ...(input.season ? { season: input.season } : {}),
        })
        .returning();

      const inserted = this.expectReturned(created, 'tournament.create');
      await this.addAuditLog(
        {
          tenantId: inserted.tenantId,
          actorUserId: input.actor.id,
          action: 'tournament.created',
          resource: 'tournament',
          resourceId: inserted.id,
          metadata: {
            tournamentName: inserted.name,
            sport: inserted.sport,
          },
        },
        db,
      );
      return inserted;
    });

    return this.mapTournament(tournament);
  }

  async approve(actor: AuthenticatedUser, tournamentId: string) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const updated = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [row] = await db
        .update(tournaments)
        .set({
          status: 'approved',
          approvedBy: actor.id,
          updatedAt: new Date(),
        })
        .where(eq(tournaments.id, tournamentId))
        .returning();

      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'tournament.approved',
          resource: 'tournament',
          resourceId: tournament.id,
          metadata: {
            tournamentName: tournament.name,
          },
        },
        db,
      );

      return this.expectReturned(row, 'tournament.approve');
    });

    return this.mapTournament(updated);
  }

  async registerSchool(actor: AuthenticatedUser, tournamentId: string, schoolId: string) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const [school] = await this.db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
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

    const { exists } = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const lockedTournament = await this.lockTournamentRow(tournamentId, db);
      if (lockedTournament.status === 'draft' || !lockedTournament.status) {
        throw new BadRequestException('Tournament must be approved before enrollment');
      }
      const existingRegistrations = await db
        .select()
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, tournamentId));
      if (existingRegistrations.some((registration) => registration.schoolId === schoolId)) {
        return { exists: true };
      }
      if (lockedTournament.maxTeams && existingRegistrations.length >= lockedTournament.maxTeams) {
        throw new BadRequestException('Tournament is already full');
      }
      await this.ensureTournamentRegistrationPaymentSatisfiedForSchool(
        db,
        lockedTournament,
        schoolId,
      );

      await db.insert(tournamentRegistrations).values({
        id: this.nextId('treg'),
        tenantId: schoolId,
        tournamentId,
        schoolId,
        status: 'approved',
        registeredBy: actor.id,
        approvedBy: actor.role === 'super_admin' ? actor.id : null,
      });
      await db
        .update(tournaments)
        .set({
          schoolIds: [...lockedTournament.schoolIds, schoolId],
          updatedAt: new Date(),
        })
        .where(eq(tournaments.id, tournamentId));
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'tournament.school_registered',
          resource: 'tournament',
          resourceId: tournamentId,
          metadata: { schoolId },
        },
        db,
      );
      return { exists: false };
    });

    const refreshed = await this.findById(tournamentId);
    return {
      ...this.expectReturned(refreshed, 'tournament.registerSchool'),
      exists,
    };
  }

  private async ensureTournamentRegistrationPaymentSatisfiedForSchool(
    db: DatabaseExecutor,
    tournament: TournamentRow,
    schoolId: string,
  ) {
    const required =
      tournament.registrationFeeRequiredBeforeApproval &&
      (tournament.registrationFeeAmount ?? 0) > 0;
    if (!required) {
      return;
    }

    const registrationInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.entityType, 'tournament_registration'),
          eq(invoices.entityId, this.tournamentRegistrationEntityId(tournament.id, schoolId)),
        ),
      );

    if (
      !registrationInvoices.some(
        (invoice) => invoice.status === 'paid' && invoice.balanceAmount === 0,
      )
    ) {
      throw new BadRequestException('Tournament registration payment required');
    }
  }

  async findById(tournamentId: string) {
    const [found] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    return found ? this.mapTournament(found) : undefined;
  }

  async list() {
    const rows = await this.db.select().from(tournaments);
    return Promise.all(rows.map((row) => this.mapTournament(row)));
  }

  async getLeaderboard(tournamentId: string, limit = 50) {
    const tournament = await this.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const tournamentMatches = await this.db
      .select()
      .from(matches)
      .where(and(eq(matches.tournamentId, tournamentId), eq(matches.status, 'verified')));
    const totals = new Map<string, TournamentAthleteStat>();
    const athleteMatchKeys = new Set<string>();

    for (const match of tournamentMatches) {
      const activeEvents = await this.db
        .select()
        .from(matchEvents)
        .where(and(eq(matchEvents.matchId, match.id), eq(matchEvents.status, 'active')));
      for (const event of activeEvents) {
        const key = `${event.tournamentId}:${event.athleteId}`;
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
        const contribution = this.eventContribution(event.type as MatchEventType, event.quantity);
        const athleteMatchKey = `${event.tournamentId}:${event.athleteId}:${event.matchId}`;
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

    const ranked = [...totals.values()].sort((first, second) => {
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
  }
}

@Injectable()
export class PostgresTeamRepository extends PostgresRepositoryBase implements TeamRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async create(input: CreateTeamInput) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, input.tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const [school] = await this.db
      .select()
      .from(schools)
      .where(eq(schools.id, input.schoolId))
      .limit(1);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    if (!school.adminUserIds.includes(input.actor.id) && input.actor.role !== 'super_admin') {
      throw new ForbiddenException('Only school admin can create teams');
    }
    if (!input.actor.schoolIds.includes(input.schoolId) && input.actor.role !== 'super_admin') {
      throw new ForbiddenException('Not a member of this school');
    }

    const [registration] = await this.db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, input.tournamentId),
          eq(tournamentRegistrations.schoolId, input.schoolId),
        ),
      )
      .limit(1);
    if (!registration) {
      throw new BadRequestException('School must be registered in tournament');
    }
    if (tournament.status !== 'approved' && tournament.status !== 'active') {
      throw new BadRequestException('Tournament not open for team registration');
    }
    if (input.athleteIds.length === 0) {
      throw new BadRequestException('At least one athlete is required');
    }

    for (const athleteId of input.athleteIds) {
      const [athlete] = await this.db
        .select()
        .from(athletes)
        .where(eq(athletes.id, athleteId))
        .limit(1);
      if (!athlete || athlete.schoolId !== input.schoolId) {
        throw new BadRequestException(`athlete ${athleteId} not found in school`);
      }
      if (athlete.status !== 'identity_approved') {
        throw new BadRequestException(`athlete ${athleteId} must be identity approved`);
      }
    }

    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const lockedTournament = await this.lockTournamentRow(input.tournamentId, db);
      if (lockedTournament.status !== 'approved' && lockedTournament.status !== 'active') {
        throw new BadRequestException('Tournament not open for team registration');
      }
      const existingTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.tournamentId, input.tournamentId));
      if (lockedTournament.maxTeams && existingTeams.length >= lockedTournament.maxTeams) {
        throw new BadRequestException('Tournament is already full');
      }
      if (
        existingTeams.some(
          (team) =>
            team.schoolId === input.schoolId &&
            team.name.toLowerCase() === input.name.toLowerCase(),
        )
      ) {
        throw new BadRequestException('team name already exists');
      }

      const [team] = await db
        .insert(teams)
        .values({
          id: this.nextId('tm'),
          tenantId: input.schoolId,
          tournamentId: input.tournamentId,
          schoolId: input.schoolId,
          name: input.name,
          athleteIds: [...input.athleteIds],
          status: 'approved',
          createdBy: input.actor.id,
          ...(input.coachUserId ? { coachUserId: input.coachUserId } : {}),
        })
        .returning();
      const insertedTeam = this.expectReturned(team, 'team.create');

      for (const athleteId of input.athleteIds) {
        await db.insert(teamMembers).values({
          id: this.nextId('tmem'),
          tenantId: input.schoolId,
          teamId: insertedTeam.id,
          athleteId,
          createdBy: input.actor.id,
        });
      }
      await db
        .update(tournaments)
        .set({
          teamIds: [...lockedTournament.teamIds, insertedTeam.id],
          updatedAt: new Date(),
        })
        .where(eq(tournaments.id, input.tournamentId));
      await this.addAuditLog(
        {
          tenantId: input.schoolId,
          actorUserId: input.actor.id,
          action: 'team.created',
          resource: 'team',
          resourceId: insertedTeam.id,
          metadata: {
            tournamentId: input.tournamentId,
            schoolId: input.schoolId,
          },
        },
        db,
      );

      return insertedTeam;
    });

    return this.mapTeam(created);
  }

  async approve(actor: AuthenticatedUser, teamId: string) {
    const [team] = await this.db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const updated = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [row] = await db
        .update(teams)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(teams.id, teamId))
        .returning();
      await this.addAuditLog(
        {
          tenantId: team.tenantId,
          actorUserId: actor.id,
          action: 'team.approved',
          resource: 'team',
          resourceId: team.id,
          metadata: { tournamentId: team.tournamentId },
        },
        db,
      );
      return this.expectReturned(row, 'team.approve');
    });

    return this.mapTeam(updated);
  }

  async findById(teamId: string) {
    const [found] = await this.db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    return found ? this.mapTeam(found) : undefined;
  }

  async list(tournamentId?: string, schoolId?: string) {
    const rows = await this.db.select().from(teams);
    const filtered = rows
      .filter((team) => (tournamentId ? team.tournamentId === tournamentId : true))
      .filter((team) => (schoolId ? team.schoolId === schoolId : true));
    return Promise.all(filtered.map((team) => this.mapTeam(team)));
  }
}

@Injectable()
export class PostgresMatchRepository extends PostgresRepositoryBase implements MatchRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async create(input: CreateMatchInput) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, input.tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (tournament.status !== 'approved' && tournament.status !== 'active') {
      throw new BadRequestException('Tournament must be approved before creating matches');
    }

    const [homeTeam] = await this.db
      .select()
      .from(teams)
      .where(eq(teams.id, input.homeTeamId))
      .limit(1);
    const [awayTeam] = await this.db
      .select()
      .from(teams)
      .where(eq(teams.id, input.awayTeamId))
      .limit(1);
    if (!homeTeam || !awayTeam) {
      throw new BadRequestException('Both teams must exist');
    }
    if (
      homeTeam.tournamentId !== input.tournamentId ||
      awayTeam.tournamentId !== input.tournamentId
    ) {
      throw new BadRequestException('Both teams must belong to this tournament');
    }
    if (homeTeam.status !== 'approved' || awayTeam.status !== 'approved') {
      throw new BadRequestException('Both teams must be approved');
    }
    if (homeTeam.id === awayTeam.id) {
      throw new BadRequestException('A team cannot play itself');
    }

    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const lockedTournament = await this.lockTournamentRow(input.tournamentId, db);
      if (lockedTournament.status !== 'approved' && lockedTournament.status !== 'active') {
        throw new BadRequestException('Tournament must be approved before creating matches');
      }
      const [match] = await db
        .insert(matches)
        .values({
          id: this.nextId('mch'),
          tenantId: lockedTournament.tenantId,
          tournamentId: input.tournamentId,
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId,
          scheduledAt: input.scheduledAt,
          status: 'scheduled',
          createdBy: input.actor.id,
        })
        .returning();
      const insertedMatch = this.expectReturned(match, 'match.create');

      await db
        .update(tournaments)
        .set({
          matchIds: [...lockedTournament.matchIds, insertedMatch.id],
          updatedAt: new Date(),
        })
        .where(eq(tournaments.id, input.tournamentId));
      await this.addAuditLog(
        {
          tenantId: lockedTournament.tenantId,
          actorUserId: input.actor.id,
          action: 'match.created',
          resource: 'match',
          resourceId: insertedMatch.id,
          metadata: {
            tournamentId: input.tournamentId,
            homeTeamId: input.homeTeamId,
            awayTeamId: input.awayTeamId,
          },
        },
        db,
      );
      return insertedMatch;
    });

    return this.mapMatch(created);
  }

  async submitResult(actor: AuthenticatedUser, matchId: string, report: MatchReport) {
    const [match] = await this.db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    if (report.homeScore < 0 || report.awayScore < 0) {
      throw new BadRequestException('Scores must be positive');
    }

    const updated = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [row] = await db
        .update(matches)
        .set({
          status: 'played',
          homeScore: report.homeScore,
          awayScore: report.awayScore,
          report: {
            ...(report.sportStats ?? {}),
            ...(report.notes ? { notes: report.notes } : {}),
          },
          submittedBy: actor.id,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId))
        .returning();
      const updatedMatch = this.expectReturned(row, 'match.submitResult');

      await this.addAuditLog(
        {
          tenantId: match.tenantId,
          actorUserId: actor.id,
          action: 'match.result_submitted',
          resource: 'match',
          resourceId: match.id,
          metadata: {
            homeScore: report.homeScore,
            awayScore: report.awayScore,
          },
        },
        db,
      );
      return updatedMatch;
    });

    return this.mapMatch(updated);
  }

  async verify(actor: AuthenticatedUser, matchId: string) {
    const [match] = await this.db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    if (match.status !== 'played') {
      throw new BadRequestException('Match must be played before verification');
    }

    const updated = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [row] = await db
        .update(matches)
        .set({
          status: 'verified',
          verifiedBy: actor.id,
          verifiedAt: new Date().toISOString(),
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId))
        .returning();
      const updatedMatch = this.expectReturned(row, 'match.verify');

      await this.addAuditLog(
        {
          tenantId: match.tenantId,
          actorUserId: actor.id,
          action: 'match.verified',
          resource: 'match',
          resourceId: match.id,
          metadata: {
            resultHome: match.homeScore ?? 0,
            resultAway: match.awayScore ?? 0,
          },
        },
        db,
      );
      return updatedMatch;
    });

    return this.mapMatch(updated);
  }

  async submitEvent(actor: AuthenticatedUser, matchId: string, input: CreateMatchEventInput) {
    return this.db.transaction((tx) =>
      this.submitEventWithExecutor(tx as unknown as DatabaseExecutor, actor, matchId, input),
    );
  }

  async submitEventWithExecutor(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    matchId: string,
    input: CreateMatchEventInput,
  ) {
    const match = await this.findMatchRow(matchId, db);
    if (!this.isMatchCapturable(match.status as MatchRecord['status'])) {
      throw new BadRequestException('Match is not ready for stat capture');
    }

    const team = await this.validateAthleteTeamForMatch(match, input.athleteId, input.teamId, db);
    const quantity = this.validateEventQuantity(input.quantity);
    const minute = this.normalizeMatchMinute(input.minute);
    const details = input.details?.trim();

    const [created] = await db
      .insert(matchEvents)
      .values({
        id: this.nextId('evt'),
        tenantId: team.tenantId,
        matchId: match.id,
        tournamentId: match.tournamentId,
        athleteId: input.athleteId,
        teamId: input.teamId,
        type: input.type,
        quantity,
        status: 'active',
        createdBy: actor.id,
        ...(minute !== undefined ? { minute } : {}),
        ...(details ? { details } : {}),
      })
      .returning();

    const event = this.expectReturned(created, 'match.submitEvent');
    await this.addAuditLog(
      {
        tenantId: team.tenantId,
        actorUserId: actor.id,
        action: 'match.event_submitted',
        resource: 'match_event',
        resourceId: event.id,
        metadata: {
          matchId: match.id,
          teamId: input.teamId,
          athleteId: input.athleteId,
          eventType: input.type,
          quantity,
        },
      },
      db,
    );

    return this.mapMatchEvent(event);
  }

  async correctEvent(
    actor: AuthenticatedUser,
    matchId: string,
    eventId: string,
    input: CorrectMatchEventInput,
  ) {
    const corrected = await this.db.transaction((tx) =>
      this.correctEventWithExecutor(
        tx as unknown as DatabaseExecutor,
        actor,
        matchId,
        eventId,
        input,
      ),
    );
    return corrected;
  }

  async correctEventWithExecutor(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    matchId: string,
    eventId: string,
    input: CorrectMatchEventInput,
  ) {
    const match = await this.findMatchRow(matchId, db);
    if (!this.isMatchCapturable(match.status as MatchRecord['status'])) {
      throw new BadRequestException('Match is not ready for stat capture');
    }
    const [currentEvent] = await db
      .select()
      .from(matchEvents)
      .where(and(eq(matchEvents.id, eventId), eq(matchEvents.matchId, matchId)))
      .limit(1);
    if (!currentEvent) {
      throw new NotFoundException('Match event not found');
    }
    if (currentEvent.status === 'superseded') {
      throw new BadRequestException('This event has already been corrected');
    }

    const team = await this.validateAthleteTeamForMatch(match, input.athleteId, input.teamId, db);
    const quantity = this.validateEventQuantity(input.quantity);
    const minute = this.normalizeMatchMinute(input.minute);
    const details = input.details?.trim();
    const now = new Date();

    const [event] = await db
      .insert(matchEvents)
      .values({
        id: this.nextId('evt'),
        tenantId: team.tenantId,
        matchId: match.id,
        tournamentId: match.tournamentId,
        athleteId: input.athleteId,
        teamId: input.teamId,
        type: input.type,
        quantity,
        status: 'active',
        createdBy: actor.id,
        correctedFromEventId: eventId,
        ...(minute !== undefined ? { minute } : {}),
        ...(details ? { details } : {}),
        ...(input.reason ? { correctionReason: input.reason } : {}),
      })
      .returning();

    await db
      .update(matchEvents)
      .set({
        status: 'superseded',
        correctedBy: actor.id,
        correctedAt: now,
        ...(input.reason ? { reason: input.reason } : {}),
      })
      .where(eq(matchEvents.id, eventId));

    const correctedEvent = this.expectReturned(event, 'match.correctEvent');
    await this.addAuditLog(
      {
        tenantId: team.tenantId,
        actorUserId: actor.id,
        action: 'match.event_corrected',
        resource: 'match_event',
        resourceId: correctedEvent.id,
        metadata: {
          originalEventId: eventId,
          matchId: match.id,
          correctedEventId: correctedEvent.id,
          eventType: input.type,
          quantity,
        },
      },
      db,
    );

    return this.mapMatchEvent(correctedEvent);
  }

  async findById(matchId: string) {
    const [found] = await this.db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    return found ? this.mapMatch(found) : undefined;
  }

  async list(tournamentId?: string) {
    const rows = await this.db.select().from(matches);
    return rows
      .filter((match) => (tournamentId ? match.tournamentId === tournamentId : true))
      .map((match) => this.mapMatch(match));
  }

  async listEvents(matchId: string) {
    const rows = await this.db.select().from(matchEvents).where(eq(matchEvents.matchId, matchId));
    return rows.map((row) => this.mapMatchEvent(row));
  }

  async getDerivedStats(matchId: string) {
    const match = await this.findById(matchId);
    if (!match) {
      return undefined;
    }
    const events = (await this.listEvents(matchId)).filter((event) => event.status === 'active');
    return this.aggregateMatchStats(match, events);
  }

  private async findMatchRow(matchId: string, db: DatabaseExecutor = this.db) {
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  private async validateAthleteTeamForMatch(
    match: MatchRow,
    athleteId?: string,
    teamId?: string,
    db: DatabaseExecutor = this.db,
  ) {
    if (!athleteId?.trim()) {
      throw new BadRequestException('athleteId is required');
    }
    if (!teamId?.trim()) {
      throw new BadRequestException('teamId is required');
    }
    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      throw new BadRequestException('teamId must be homeTeamId or awayTeamId for this match');
    }

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) {
      throw new BadRequestException('Team not found');
    }
    const [athlete] = await db.select().from(athletes).where(eq(athletes.id, athleteId)).limit(1);
    if (!athlete) {
      throw new NotFoundException('athlete not found');
    }

    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.athleteId, athleteId)))
      .limit(1);
    if (!member) {
      throw new BadRequestException('athlete is not part of this team');
    }

    return team;
  }
}

@Injectable()
export class PostgresSchedulingRepository
  extends PostgresRepositoryBase
  implements SchedulingRepository
{
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async createFacility(actor: AuthenticatedUser, input: CreateFacilityInput) {
    const now = new Date();
    const [facility] = await this.db
      .insert(facilities)
      .values({
        id: this.nextId('fac'),
        tenantId: 'platform',
        name: input.name,
        location: input.location,
        timezone: input.timezone ?? 'Asia/Kathmandu',
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = this.expectReturned(facility, 'facility.create');
    await this.addAuditLog({
      tenantId: created.tenantId,
      actorUserId: actor.id,
      action: 'facility.created',
      resource: 'facility',
      resourceId: created.id,
      metadata: { name: created.name },
    });
    return this.mapFacility(created);
  }

  async createVenueUnit(actor: AuthenticatedUser, facilityId: string, input: CreateVenueUnitInput) {
    const facility = await this.requireFacility(facilityId);
    const now = new Date();
    const [unit] = await this.db
      .insert(venueUnits)
      .values({
        id: this.nextId('vunit'),
        tenantId: facility.tenantId,
        facilityId: facility.id,
        name: input.name,
        unitType: input.unitType,
        sports: [...input.sports],
        status: input.status ?? 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = this.expectReturned(unit, 'venue_unit.create');
    await this.addAuditLog({
      tenantId: created.tenantId,
      actorUserId: actor.id,
      action: 'venue_unit.created',
      resource: 'venue_unit',
      resourceId: created.id,
      metadata: { facilityId, unitType: created.unitType },
    });
    return this.mapVenueUnit(created);
  }

  async listFacilities() {
    const [facilityRows, unitRows] = await Promise.all([
      this.db.select().from(facilities),
      this.db.select().from(venueUnits),
    ]);
    return {
      facilities: facilityRows.map((row) => this.mapFacility(row)),
      venueUnits: unitRows.map((row) => this.mapVenueUnit(row)),
    };
  }

  async createAvailability(actor: AuthenticatedUser, input: CreateAvailabilityInput) {
    if (input.tournamentId) {
      await this.requireTournamentRow(input.tournamentId);
    }
    await this.assertAvailabilityResourceExists(input.resourceType, input.resourceId);
    const now = new Date();
    const [window] = await this.db
      .insert(availabilityWindows)
      .values({
        id: this.nextId('avail'),
        tenantId: 'platform',
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        tournamentId: input.tournamentId ?? null,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        status: input.status,
        reason: input.reason ?? null,
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = this.expectReturned(window, 'availability.create');
    await this.addAuditLog({
      tenantId: created.tenantId,
      actorUserId: actor.id,
      action: 'availability.created',
      resource: 'availability_window',
      resourceId: created.id,
      metadata: {
        resourceType: created.resourceType,
        resourceId: created.resourceId,
        ...(created.tournamentId ? { tournamentId: created.tournamentId } : {}),
      },
    });
    return this.mapAvailabilityWindow(created);
  }

  async listAvailability(filter: AvailabilityFilter) {
    const rows = await this.db.select().from(availabilityWindows);
    return {
      windows: rows
        .filter((row) => (filter.resourceType ? row.resourceType === filter.resourceType : true))
        .filter((row) => (filter.resourceId ? row.resourceId === filter.resourceId : true))
        .filter((row) => (filter.tournamentId ? row.tournamentId === filter.tournamentId : true))
        .map((row) => this.mapAvailabilityWindow(row)),
    };
  }

  async createOfficialProfile(actor: AuthenticatedUser, input: CreateOfficialProfileInput) {
    const [user] = await this.db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.roles.includes('referee') && !user.roles.includes('super_admin')) {
      throw new BadRequestException('Official profile user must be a referee');
    }
    const existing = await this.db
      .select()
      .from(officialProfiles)
      .where(eq(officialProfiles.userId, input.userId))
      .limit(1);
    if (existing.length) {
      throw new BadRequestException('Official profile already exists for user');
    }
    if (input.homeSchoolId) {
      const [school] = await this.db
        .select()
        .from(schools)
        .where(eq(schools.id, input.homeSchoolId))
        .limit(1);
      if (!school) {
        throw new NotFoundException('School not found');
      }
    }
    const now = new Date();
    const [profile] = await this.db
      .insert(officialProfiles)
      .values({
        id: this.nextId('off'),
        tenantId: 'platform',
        userId: input.userId,
        displayName: input.displayName,
        sports: [...input.sports],
        certificationLevel: input.certificationLevel ?? null,
        homeSchoolId: input.homeSchoolId ?? null,
        payoutRate: input.payoutRate ?? null,
        payoutCurrency: input.payoutCurrency ?? null,
        status: 'active',
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = this.expectReturned(profile, 'official.create');
    await this.addAuditLog({
      tenantId: created.tenantId,
      actorUserId: actor.id,
      action: 'official.created',
      resource: 'official_profile',
      resourceId: created.id,
      metadata: { userId: created.userId },
    });
    return this.mapOfficialProfile(created);
  }

  async listOfficialProfiles() {
    const rows = await this.db.select().from(officialProfiles);
    return { officials: rows.map((row) => this.mapOfficialProfile(row)) };
  }

  async generateSchedule(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: GenerateScheduleInput,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const tournament = await this.requireTournamentRow(tournamentId, db);
      const unitRows = await this.requireVenueUnits(input.venueUnitIds, db);
      const matchRows = (
        await db.select().from(matches).where(eq(matches.tournamentId, tournament.id))
      ).sort(
        (first, second) =>
          first.scheduledAt.localeCompare(second.scheduledAt) || first.id.localeCompare(second.id),
      );
      if (!matchRows.length) {
        throw new BadRequestException('Tournament has no matches to schedule');
      }
      const generated: MatchScheduleRow[] = [];
      const now = new Date();
      for (const match of matchRows) {
        let candidateStart = new Date(input.startsAt).toISOString();
        let scheduled: MatchScheduleRow | undefined;
        for (let attempt = 0; attempt < 240 && !scheduled; attempt += 1) {
          for (const unit of unitRows) {
            const candidateEnd = addMinutes(candidateStart, input.matchDurationMinutes);
            const warnings = await this.detectScheduleConflicts(db, {
              match,
              venueUnitId: unit.id,
              startsAt: candidateStart,
              endsAt: candidateEnd,
              tournamentId,
              minRestMinutes: input.minRestMinutes ?? 0,
              draftSchedules: generated,
              excludeMatchId: match.id,
            });
            if (!warnings.length) {
              scheduled = await this.upsertMatchSchedule(db, actor, match, {
                venueUnitId: unit.id,
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
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'schedule.generated',
          resource: 'tournament',
          resourceId: tournament.id,
          metadata: { scheduleCount: generated.length },
        },
        db,
      );
      return generated;
    });
    return { schedules: result.map((row) => this.mapMatchSchedule(row)) };
  }

  async overrideMatchSchedule(
    actor: AuthenticatedUser,
    matchId: string,
    input: OverrideMatchScheduleInput,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const match = await this.requireMatchRow(matchId, db);
      await this.requireVenueUnit(input.venueUnitId, db);
      const warnings = await this.detectScheduleConflicts(db, {
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
      const now = new Date();
      const schedule = await this.upsertMatchSchedule(db, actor, match, {
        venueUnitId: input.venueUnitId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        conflictWarnings: warnings,
        status: 'draft',
        ...(input.reason?.trim() ? { overrideReason: input.reason.trim() } : {}),
        now,
      });
      await this.addAuditLog(
        {
          tenantId: schedule.tenantId,
          actorUserId: actor.id,
          action: 'schedule.override',
          resource: 'match',
          resourceId: match.id,
          metadata: {
            tournamentId: match.tournamentId,
            conflictCount: warnings.length,
            ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
          },
        },
        db,
      );
      return schedule;
    });
    return this.mapMatchSchedule(result);
  }

  async listTournamentSchedule(actor: AuthenticatedUser, tournamentId: string) {
    await this.requireTournamentRow(tournamentId);
    const [scheduleRows, assignmentRows] = await Promise.all([
      this.db.select().from(matchSchedules).where(eq(matchSchedules.tournamentId, tournamentId)),
      this.db.select().from(officialAssignments),
    ]);
    const tournamentMatchIds = new Set(
      (
        await this.db
          .select({ id: matches.id })
          .from(matches)
          .where(eq(matches.tournamentId, tournamentId))
      ).map((match) => match.id),
    );
    const visibleAssignments: OfficialAssignmentRow[] = [];
    for (const assignment of assignmentRows) {
      if (
        tournamentMatchIds.has(assignment.matchId) &&
        (await this.assignmentVisibleToActor(actor, assignment))
      ) {
        visibleAssignments.push(assignment);
      }
    }
    return {
      schedules: scheduleRows.map((row) => this.mapMatchSchedule(row)),
      assignments: visibleAssignments.map((row) => this.mapOfficialAssignment(row)),
    };
  }

  async publishSchedule(actor: AuthenticatedUser, tournamentId: string) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const tournament = await this.requireTournamentRow(tournamentId, db);
      const now = new Date();
      const updatedSchedules = await db
        .update(matchSchedules)
        .set({
          status: 'published',
          publishedAt: now,
          publishedBy: actor.id,
          updatedAt: now,
        })
        .where(eq(matchSchedules.tournamentId, tournament.id))
        .returning();
      const assignmentRows = await db.select().from(officialAssignments);
      const tournamentMatchIds = new Set(
        (
          await db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.tournamentId, tournament.id))
        ).map((match) => match.id),
      );
      const notifications: ScheduleNotificationRow[] = [];
      for (const assignment of assignmentRows.filter((candidate) =>
        tournamentMatchIds.has(candidate.matchId),
      )) {
        const profile = await this.requireOfficialProfile(assignment.officialProfileId, db);
        const [notification] = await db
          .insert(scheduleNotifications)
          .values({
            id: this.nextId('notif'),
            tenantId: tournament.tenantId,
            recipientUserId: profile.userId,
            tournamentId: tournament.id,
            resourceType: 'official_assignment',
            resourceId: assignment.id,
            type: 'schedule_published',
            message: 'Tournament schedule published',
            status: 'pending',
            createdAt: now,
          })
          .returning();
        notifications.push(this.expectReturned(notification, 'schedule.notification.create'));
      }
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'schedule.published',
          resource: 'tournament',
          resourceId: tournament.id,
          metadata: {
            scheduleCount: updatedSchedules.length,
            notificationCount: notifications.length,
          },
        },
        db,
      );
      return { schedules: updatedSchedules, notifications };
    });
    return {
      schedules: result.schedules.map((row) => this.mapMatchSchedule(row)),
      notifications: result.notifications.map((row) => this.mapScheduleNotification(row)),
    };
  }

  async unpublishSchedule(actor: AuthenticatedUser, tournamentId: string) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const tournament = await this.requireTournamentRow(tournamentId, db);
      const updatedSchedules = await db
        .update(matchSchedules)
        .set({ status: 'unpublished', updatedAt: new Date() })
        .where(eq(matchSchedules.tournamentId, tournament.id))
        .returning();
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'schedule.unpublished',
          resource: 'tournament',
          resourceId: tournament.id,
          metadata: { scheduleCount: updatedSchedules.length },
        },
        db,
      );
      return updatedSchedules;
    });
    return { schedules: result.map((row) => this.mapMatchSchedule(row)) };
  }

  async assignOfficial(actor: AuthenticatedUser, matchId: string, input: AssignOfficialInput) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const match = await this.requireMatchRow(matchId, db);
      const profile = await this.requireOfficialProfile(input.officialProfileId, db);
      const schedule = await this.requireScheduleForMatch(match.id, db);
      const unavailableWindows = await db.select().from(availabilityWindows);
      const unavailable = unavailableWindows.some(
        (window) =>
          window.status === 'blackout' &&
          window.resourceType === 'official' &&
          window.resourceId === profile.id &&
          (!window.tournamentId || window.tournamentId === match.tournamentId) &&
          overlaps(
            this.toIso(schedule.startsAt),
            this.toIso(schedule.endsAt),
            this.toIso(window.startsAt),
            this.toIso(window.endsAt),
          ),
      );
      if (unavailable) {
        throw new BadRequestException('Official is unavailable during this match');
      }
      const existingAssignments = await db
        .select()
        .from(officialAssignments)
        .where(eq(officialAssignments.officialProfileId, profile.id));
      const duplicate = existingAssignments.find(
        (assignment) => assignment.matchId === match.id && assignment.role === input.role,
      );
      if (duplicate) {
        throw new BadRequestException('Official is already assigned to this role');
      }
      for (const assignment of existingAssignments.filter(
        (candidate) => candidate.status !== 'declined',
      )) {
        const otherSchedule = await this.getScheduleForMatch(assignment.matchId, db);
        if (
          otherSchedule &&
          overlaps(
            this.toIso(schedule.startsAt),
            this.toIso(schedule.endsAt),
            this.toIso(otherSchedule.startsAt),
            this.toIso(otherSchedule.endsAt),
          )
        ) {
          throw new BadRequestException('Official has an overlapping assignment');
        }
      }
      const now = new Date();
      const [assignment] = await db
        .insert(officialAssignments)
        .values({
          id: this.nextId('assign'),
          tenantId: match.tenantId,
          matchId,
          officialProfileId: profile.id,
          role: input.role,
          status: 'proposed',
          assignedBy: actor.id,
          assignedAt: now,
        })
        .returning();
      const created = this.expectReturned(assignment, 'official.assignment.create');
      await this.addAuditLog(
        {
          tenantId: created.tenantId,
          actorUserId: actor.id,
          action: 'official.assigned',
          resource: 'official_assignment',
          resourceId: created.id,
          metadata: { matchId, officialProfileId: profile.id },
        },
        db,
      );
      return created;
    });
    return this.mapOfficialAssignment(result);
  }

  async respondToAssignment(
    actor: AuthenticatedUser,
    assignmentId: string,
    input: RespondAssignmentInput,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const assignment = await this.requireAssignmentForActor(actor, assignmentId, db);
      if (assignment.status !== 'proposed') {
        throw new BadRequestException('Assignment can only be responded to while proposed');
      }
      const [updated] = await db
        .update(officialAssignments)
        .set({ status: input.status, respondedAt: new Date() })
        .where(eq(officialAssignments.id, assignment.id))
        .returning();
      const row = this.expectReturned(updated, 'official.assignment.respond');
      await this.addAuditLog(
        {
          tenantId: row.tenantId,
          actorUserId: actor.id,
          action: 'official.responded',
          resource: 'official_assignment',
          resourceId: row.id,
          metadata: { status: row.status },
        },
        db,
      );
      return row;
    });
    return this.mapOfficialAssignment(result);
  }

  async checkInAssignment(actor: AuthenticatedUser, assignmentId: string) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const assignment = await this.requireAssignmentForActor(actor, assignmentId, db);
      if (assignment.status !== 'accepted') {
        throw new BadRequestException('Assignment must be accepted before check-in');
      }
      const [updated] = await db
        .update(officialAssignments)
        .set({ status: 'checked_in', checkedInAt: new Date() })
        .where(eq(officialAssignments.id, assignment.id))
        .returning();
      const row = this.expectReturned(updated, 'official.assignment.checkIn');
      await this.addAuditLog(
        {
          tenantId: row.tenantId,
          actorUserId: actor.id,
          action: 'official.checked_in',
          resource: 'official_assignment',
          resourceId: row.id,
          metadata: { matchId: row.matchId },
        },
        db,
      );
      return row;
    });
    return this.mapOfficialAssignment(result);
  }

  async listNotifications(actor: AuthenticatedUser) {
    const rows = await this.db.select().from(scheduleNotifications);
    return {
      notifications: rows
        .filter((row) => (actor.role === 'super_admin' ? true : row.recipientUserId === actor.id))
        .map((row) => this.mapScheduleNotification(row)),
    };
  }

  async exportOfficialPayouts(actor: AuthenticatedUser, tournamentId: string) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const tournament = await this.requireTournamentRow(tournamentId, db);
      const assignmentRows = await db.select().from(officialAssignments);
      const tournamentMatchIds = new Set(
        (
          await db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.tournamentId, tournament.id))
        ).map((match) => match.id),
      );
      const exports: OfficialPayoutExportRow[] = [];
      for (const assignment of assignmentRows.filter(
        (candidate) =>
          candidate.status === 'checked_in' && tournamentMatchIds.has(candidate.matchId),
      )) {
        const profile = await this.requireOfficialProfile(assignment.officialProfileId, db);
        const [payout] = await db
          .insert(officialPayoutExports)
          .values({
            id: this.nextId('payout'),
            tenantId: tournament.tenantId,
            tournamentId: tournament.id,
            officialProfileId: profile.id,
            assignmentIds: [assignment.id],
            amount: profile.payoutRate ?? 0,
            currency: profile.payoutCurrency ?? 'NPR',
            status: 'exported',
            createdBy: actor.id,
            createdAt: new Date(),
          })
          .returning();
        exports.push(this.expectReturned(payout, 'official.payout.export'));
      }
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'official_payout.exported',
          resource: 'tournament',
          resourceId: tournament.id,
          metadata: { exportCount: exports.length },
        },
        db,
      );
      return exports;
    });
    return { exports: result.map((row) => this.mapOfficialPayoutExport(row)) };
  }

  private async requireTournamentRow(
    tournamentId: string,
    db: DatabaseExecutor = this.db,
  ): Promise<TournamentRow> {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }

  private async requireMatchRow(
    matchId: string,
    db: DatabaseExecutor = this.db,
  ): Promise<MatchRow> {
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  private async requireFacility(
    facilityId: string,
    db: DatabaseExecutor = this.db,
  ): Promise<FacilityRow> {
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);
    if (!facility) {
      throw new NotFoundException('Facility not found');
    }
    return facility;
  }

  private async requireVenueUnit(
    venueUnitId: string,
    db: DatabaseExecutor = this.db,
  ): Promise<VenueUnitRow> {
    const [unit] = await db
      .select()
      .from(venueUnits)
      .where(eq(venueUnits.id, venueUnitId))
      .limit(1);
    if (!unit || unit.status !== 'active') {
      throw new NotFoundException('Venue unit not found');
    }
    return unit;
  }

  private async requireVenueUnits(
    venueUnitIds: string[],
    db: DatabaseExecutor,
  ): Promise<VenueUnitRow[]> {
    const units: VenueUnitRow[] = [];
    for (const venueUnitId of venueUnitIds) {
      units.push(await this.requireVenueUnit(venueUnitId, db));
    }
    return units;
  }

  private async assertAvailabilityResourceExists(
    resourceType: CreateAvailabilityInput['resourceType'],
    resourceId: string,
    db: DatabaseExecutor = this.db,
  ) {
    if (resourceType === 'venue_unit') {
      await this.requireVenueUnit(resourceId, db);
      return;
    }
    if (resourceType === 'school') {
      const [school] = await db.select().from(schools).where(eq(schools.id, resourceId)).limit(1);
      if (!school) {
        throw new NotFoundException('School not found');
      }
      return;
    }
    await this.requireOfficialProfile(resourceId, db);
  }

  private async requireOfficialProfile(
    officialProfileId: string,
    db: DatabaseExecutor = this.db,
  ): Promise<OfficialProfileRow> {
    const [profile] = await db
      .select()
      .from(officialProfiles)
      .where(eq(officialProfiles.id, officialProfileId))
      .limit(1);
    if (!profile || profile.status !== 'active') {
      throw new NotFoundException('Official profile not found');
    }
    return profile;
  }

  private async getScheduleForMatch(
    matchId: string,
    db: DatabaseExecutor = this.db,
  ): Promise<MatchScheduleRow | undefined> {
    const [schedule] = await db
      .select()
      .from(matchSchedules)
      .where(eq(matchSchedules.matchId, matchId))
      .limit(1);
    return schedule;
  }

  private async requireScheduleForMatch(
    matchId: string,
    db: DatabaseExecutor = this.db,
  ): Promise<MatchScheduleRow> {
    const schedule = await this.getScheduleForMatch(matchId, db);
    if (!schedule) {
      throw new BadRequestException('Match must be scheduled before assigning officials');
    }
    return schedule;
  }

  private async getMatchTeams(match: MatchRow, db: DatabaseExecutor) {
    const [homeTeam, awayTeam] = await Promise.all([
      db.select().from(teams).where(eq(teams.id, match.homeTeamId)).limit(1),
      db.select().from(teams).where(eq(teams.id, match.awayTeamId)).limit(1),
    ]);
    const home = homeTeam[0];
    const away = awayTeam[0];
    if (!home || !away) {
      throw new BadRequestException('Match teams not found');
    }
    return [home, away] as const;
  }

  private async detectScheduleConflicts(
    db: DatabaseExecutor,
    input: {
      match: MatchRow;
      venueUnitId: string;
      startsAt: string;
      endsAt: string;
      tournamentId: string;
      minRestMinutes: number;
      draftSchedules?: MatchScheduleRow[];
      excludeMatchId?: string;
    },
  ) {
    const warnings = new Set<string>();
    const persistedSchedules = await db.select().from(matchSchedules);
    const candidateSchedules = [...persistedSchedules, ...(input.draftSchedules ?? [])].filter(
      (schedule) => schedule.matchId !== input.excludeMatchId,
    );

    for (const schedule of candidateSchedules) {
      if (
        schedule.venueUnitId === input.venueUnitId &&
        overlaps(
          input.startsAt,
          input.endsAt,
          this.toIso(schedule.startsAt),
          this.toIso(schedule.endsAt),
        )
      ) {
        warnings.add('venue_unit_overlap');
      }
    }

    const matchTeams = await this.getMatchTeams(input.match, db);
    const schoolIds = new Set(matchTeams.map((team) => team.schoolId));
    const windows = await db.select().from(availabilityWindows);
    for (const window of windows) {
      if (
        window.status === 'blackout' &&
        window.resourceType === 'venue_unit' &&
        window.resourceId === input.venueUnitId &&
        (!window.tournamentId || window.tournamentId === input.tournamentId) &&
        overlaps(
          input.startsAt,
          input.endsAt,
          this.toIso(window.startsAt),
          this.toIso(window.endsAt),
        )
      ) {
        warnings.add('venue_unit_blackout');
      }
      if (
        window.status === 'blackout' &&
        window.resourceType === 'school' &&
        schoolIds.has(window.resourceId) &&
        (!window.tournamentId || window.tournamentId === input.tournamentId) &&
        overlaps(
          input.startsAt,
          input.endsAt,
          this.toIso(window.startsAt),
          this.toIso(window.endsAt),
        )
      ) {
        warnings.add('school_blackout');
      }
    }

    const assignedProfileIds = new Set(
      (await db.select().from(officialAssignments))
        .filter(
          (assignment) => assignment.matchId === input.match.id && assignment.status !== 'declined',
        )
        .map((assignment) => assignment.officialProfileId),
    );
    for (const profileId of assignedProfileIds) {
      for (const window of windows) {
        if (
          window.status === 'blackout' &&
          window.resourceType === 'official' &&
          window.resourceId === profileId &&
          (!window.tournamentId || window.tournamentId === input.tournamentId) &&
          overlaps(
            input.startsAt,
            input.endsAt,
            this.toIso(window.startsAt),
            this.toIso(window.endsAt),
          )
        ) {
          warnings.add('official_blackout');
        }
      }
      for (const assignment of await db.select().from(officialAssignments)) {
        if (
          assignment.officialProfileId !== profileId ||
          assignment.matchId === input.match.id ||
          assignment.status === 'declined'
        ) {
          continue;
        }
        const schedule = await this.getScheduleForMatch(assignment.matchId, db);
        if (
          schedule &&
          overlaps(
            input.startsAt,
            input.endsAt,
            this.toIso(schedule.startsAt),
            this.toIso(schedule.endsAt),
          )
        ) {
          warnings.add('official_assignment_overlap');
        }
      }
    }

    if (input.minRestMinutes > 0) {
      const teamIds = new Set([input.match.homeTeamId, input.match.awayTeamId]);
      for (const schedule of candidateSchedules) {
        const scheduledMatch = await this.requireMatchRow(schedule.matchId, db);
        const sharesTeam =
          teamIds.has(scheduledMatch.homeTeamId) || teamIds.has(scheduledMatch.awayTeamId);
        if (!sharesTeam) {
          continue;
        }
        const restAfterExisting = minutesBetween(this.toIso(schedule.endsAt), input.startsAt);
        const restBeforeExisting = minutesBetween(input.endsAt, this.toIso(schedule.startsAt));
        if (restAfterExisting < input.minRestMinutes && restBeforeExisting < input.minRestMinutes) {
          warnings.add('team_rest_window');
        }
      }
    }

    return [...warnings];
  }

  private async upsertMatchSchedule(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    match: MatchRow,
    input: {
      venueUnitId: string;
      startsAt: string;
      endsAt: string;
      status: MatchScheduleRow['status'];
      conflictWarnings: string[];
      overrideReason?: string;
      now: Date;
    },
  ): Promise<MatchScheduleRow> {
    const existing = await this.getScheduleForMatch(match.id, db);
    if (existing) {
      const [updated] = await db
        .update(matchSchedules)
        .set({
          venueUnitId: input.venueUnitId,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          status: input.status,
          conflictWarnings: [...input.conflictWarnings],
          overrideReason: input.overrideReason ?? null,
          updatedAt: input.now,
        })
        .where(eq(matchSchedules.id, existing.id))
        .returning();
      await db
        .update(matches)
        .set({ scheduledAt: input.startsAt, updatedAt: input.now })
        .where(eq(matches.id, match.id));
      return this.expectReturned(updated, 'match_schedule.update');
    }

    const [created] = await db
      .insert(matchSchedules)
      .values({
        id: this.nextId('sched'),
        tenantId: match.tenantId,
        tournamentId: match.tournamentId,
        matchId: match.id,
        venueUnitId: input.venueUnitId,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        status: input.status,
        conflictWarnings: [...input.conflictWarnings],
        overrideReason: input.overrideReason ?? null,
        createdBy: actor.id,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    await db
      .update(matches)
      .set({ scheduledAt: input.startsAt, updatedAt: input.now })
      .where(eq(matches.id, match.id));
    return this.expectReturned(created, 'match_schedule.create');
  }

  private async assignmentVisibleToActor(
    actor: AuthenticatedUser,
    assignment: OfficialAssignmentRow,
    db: DatabaseExecutor = this.db,
  ) {
    if (
      actor.role === 'super_admin' ||
      actor.role === 'federation_admin' ||
      actor.role === 'government_viewer'
    ) {
      return true;
    }

    const [profile] = await db
      .select()
      .from(officialProfiles)
      .where(eq(officialProfiles.id, assignment.officialProfileId))
      .limit(1);
    if (actor.role === 'referee') {
      return profile?.userId === actor.id;
    }

    const match = await this.requireMatchRow(assignment.matchId, db);
    const [homeTeam, awayTeam] = await this.getMatchTeams(match, db);
    return [homeTeam.schoolId, awayTeam.schoolId].some((schoolId) =>
      actor.schoolIds.includes(schoolId),
    );
  }

  private async requireAssignmentForActor(
    actor: AuthenticatedUser,
    assignmentId: string,
    db: DatabaseExecutor = this.db,
  ): Promise<OfficialAssignmentRow> {
    const [assignment] = await db
      .select()
      .from(officialAssignments)
      .where(eq(officialAssignments.id, assignmentId))
      .limit(1);
    if (!assignment) {
      throw new NotFoundException('Official assignment not found');
    }
    if (actor.role === 'super_admin') {
      return assignment;
    }
    const profile = await this.requireOfficialProfile(assignment.officialProfileId, db);
    if (profile.userId !== actor.id) {
      throw new ForbiddenException('Not assigned to this match');
    }
    return assignment;
  }
}

@Injectable()
export class PostgresDocumentRepository
  extends PostgresRepositoryBase
  implements DocumentRepository
{
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async uploadDocument(
    _actor: AuthenticatedUser,
    _input: UploadIdentityDocumentInput,
  ): Promise<IdentityDocumentRecord> {
    const actor = _actor;
    const input = _input;
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.id, input.athleteId))
      .limit(1);
    if (!athlete) {
      throw new NotFoundException('Athlete not found');
    }
    if (athlete.schoolId !== input.schoolId) {
      throw new BadRequestException(`athlete ${input.athleteId} not found in school`);
    }
    this.assertDocumentActorAccess(actor, input.schoolId);

    const created = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [document] = await db
        .insert(identityDocuments)
        .values({
          id: input.id,
          tenantId: input.schoolId,
          schoolId: input.schoolId,
          athleteId: input.athleteId,
          documentType: input.documentType,
          status: 'uploaded',
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          sizeBytes: input.byteSize,
          sha256Hash: input.sha256Hash,
          storageKey: input.storageKey,
          malwareScanStatus: 'clean',
          uploadedBy: actor.id,
        })
        .returning();

      const createdDocument = this.expectReturned(document, 'document.upload');
      await this.addAuditLog(
        {
          tenantId: createdDocument.tenantId,
          actorUserId: actor.id,
          action: 'document.uploaded',
          resource: 'identity_document',
          resourceId: createdDocument.id,
          metadata: {
            athleteId: createdDocument.athleteId,
            schoolId: createdDocument.schoolId,
            documentType: createdDocument.documentType,
          },
        },
        db,
      );
      return createdDocument;
    });

    return this.mapIdentityDocument(created);
  }

  async findDocumentById(documentId: string) {
    const [document] = await this.db
      .select()
      .from(identityDocuments)
      .where(eq(identityDocuments.id, documentId))
      .limit(1);
    return document ? this.mapIdentityDocument(document) : undefined;
  }

  async extractDocument(
    _actor: AuthenticatedUser,
    _documentId: string,
    _input: ExtractIdentityDocumentInput,
  ) {
    const actor = _actor;
    const documentId = _documentId;
    const input = _input;
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const document = await this.lockIdentityDocument(documentId, db);
      this.assertDocumentActorAccess(actor, document.schoolId);

      await db.delete(documentReviewFlags).where(eq(documentReviewFlags.documentId, document.id));
      await db
        .delete(documentDuplicateCandidates)
        .where(eq(documentDuplicateCandidates.documentId, document.id));

      const now = new Date();
      const [extraction] = await db
        .insert(documentExtractions)
        .values({
          id: this.nextId('dext'),
          tenantId: document.tenantId,
          documentId: document.id,
          schoolId: document.schoolId,
          athleteId: document.athleteId,
          provider: input.provider,
          extracted: input.extracted,
          fieldConfidence: input.fieldConfidence,
          reviewFlags: input.reviewFlags,
          overallConfidence: input.confidence,
          createdBy: actor.id,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: documentExtractions.documentId,
          set: {
            provider: input.provider,
            extracted: input.extracted,
            fieldConfidence: input.fieldConfidence,
            reviewFlags: input.reviewFlags,
            overallConfidence: input.confidence,
            createdBy: actor.id,
            updatedAt: now,
          },
        })
        .returning();
      const createdExtraction = this.expectReturned(extraction, 'document.extract');

      const flags: DocumentReviewFlagRow[] = [];
      for (const flag of input.reviewFlags) {
        const [createdFlag] = await db
          .insert(documentReviewFlags)
          .values({
            id: this.nextId('drf'),
            tenantId: document.tenantId,
            documentId: document.id,
            extractionId: createdExtraction.id,
            schoolId: document.schoolId,
            athleteId: document.athleteId,
            status: 'open',
            reasonCodes: [String(flag.field)],
            metadata: flag,
          })
          .returning();
        flags.push(this.expectReturned(createdFlag, 'document.reviewFlag'));
      }

      const duplicateRows = await this.detectDocumentDuplicates(document, createdExtraction, db);
      const expiresAt = input.extracted.expiryDate
        ? this.toEndOfDayDate(input.extracted.expiryDate)
        : undefined;
      const [updatedDocument] = await db
        .update(identityDocuments)
        .set({
          status: 'review_required',
          ...(expiresAt ? { expiresAt } : {}),
          updatedAt: now,
        })
        .where(eq(identityDocuments.id, document.id))
        .returning();

      await this.addAuditLog(
        {
          tenantId: document.tenantId,
          actorUserId: actor.id,
          action: 'document.extracted',
          resource: 'identity_document',
          resourceId: document.id,
          metadata: {
            athleteId: document.athleteId,
            schoolId: document.schoolId,
            confidence: input.confidence,
          },
        },
        db,
      );

      return {
        document: this.expectReturned(updatedDocument, 'document.extract.update'),
        extraction: createdExtraction,
        flags,
        duplicateRows,
      };
    });

    return {
      document: this.mapIdentityDocument(result.document),
      extraction: this.mapDocumentExtraction(result.extraction),
      reviewFlags: result.flags.map((flag) => this.mapDocumentReviewFlag(flag)),
      duplicateCandidates: result.duplicateRows.map((candidate) =>
        this.mapDocumentDuplicateCandidate(candidate),
      ),
    };
  }

  async createReviewLink(
    _actor: AuthenticatedUser,
    _documentId: string,
    _input: CreateDocumentReviewLinkInput,
  ) {
    const actor = _actor;
    if (actor.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can create review links');
    }

    const link = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const document = await this.lockIdentityDocument(_documentId, db);
      const [created] = await db
        .insert(documentReviewLinks)
        .values({
          id: this.nextId('drl'),
          tenantId: document.tenantId,
          documentId: document.id,
          schoolId: document.schoolId,
          athleteId: document.athleteId,
          tokenHash: _input.tokenHash,
          expiresAt: new Date(_input.expiresAt),
          createdBy: actor.id,
        })
        .returning();
      const createdLink = this.expectReturned(created, 'document.reviewLink');
      await this.addAuditLog(
        {
          tenantId: document.tenantId,
          actorUserId: actor.id,
          action: 'document.review_link_created',
          resource: 'identity_document',
          resourceId: document.id,
          metadata: {
            schoolId: document.schoolId,
            expiresAt: _input.expiresAt,
          },
        },
        db,
      );
      return createdLink;
    });
    return this.mapDocumentReviewLink(link);
  }

  async resolveReviewLink(
    _actor: AuthenticatedUser,
    _tokenHash: string,
  ): Promise<DocumentReviewQueueItem> {
    const [link] = await this.db
      .select()
      .from(documentReviewLinks)
      .where(eq(documentReviewLinks.tokenHash, _tokenHash))
      .limit(1);
    if (!link) {
      throw new NotFoundException('Review link not found');
    }
    if (link.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Review link expired');
    }
    const document = await this.lockIdentityDocument(link.documentId, this.db);
    this.assertDocumentActorAccess(_actor, document.schoolId);
    return this.buildDocumentReviewQueueItem(document, this.db);
  }

  async recordReview(
    _actor: AuthenticatedUser,
    _documentId: string,
    _input: RecordDocumentReviewInput,
  ): Promise<DocumentReviewResult> {
    const actor = _actor;
    const input = _input;
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const document = await this.lockIdentityDocument(_documentId, db);
      this.assertDocumentActorAccess(actor, document.schoolId);
      if (actor.role !== 'super_admin' && input.action !== 'request_correction') {
        throw new ForbiddenException('Only super admins can approve or reject documents');
      }
      if (input.action === 'override' && !input.overrideReason?.trim()) {
        throw new BadRequestException('overrideReason is required');
      }

      const [extraction] = await db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.documentId, document.id))
        .limit(1);
      if ((input.action === 'approve' || input.action === 'override') && !extraction) {
        throw new BadRequestException('Document extraction is required before approval');
      }

      const now = new Date();
      const [review] = await db
        .insert(documentReviews)
        .values({
          id: this.nextId('drev'),
          tenantId: document.tenantId,
          documentId: document.id,
          schoolId: document.schoolId,
          athleteId: document.athleteId,
          action: input.action,
          reasonCodes: input.reason ? [input.reason] : [],
          corrections: input.correctedFields ?? {},
          reviewMetadata: {
            ...(input.notes ? { notes: input.notes } : {}),
            ...(input.reason ? { reason: input.reason } : {}),
            ...(input.overrideReason ? { overrideReason: input.overrideReason } : {}),
          },
          reviewedBy: actor.id,
          reviewedAt: now,
        })
        .returning();

      const statusByAction: Record<RecordDocumentReviewInput['action'], IdentityDocumentStatus> = {
        approve: 'verified',
        override: 'verified',
        reject: 'rejected',
        request_correction: 'correction_requested',
      };
      const [updatedDocument] = await db
        .update(identityDocuments)
        .set({
          status: statusByAction[input.action],
          ...(input.action === 'approve' || input.action === 'override'
            ? { verifiedAt: now, verifiedBy: actor.id }
            : {}),
          updatedAt: now,
        })
        .where(eq(identityDocuments.id, document.id))
        .returning();

      let updatedAthlete: AthleteRow | undefined;
      if ((input.action === 'approve' || input.action === 'override') && extraction) {
        const [athlete] = await db
          .select()
          .from(athletes)
          .where(eq(athletes.id, document.athleteId))
          .limit(1);
        const existingAthlete = this.expectReturned(athlete, 'document.review.athlete');
        const extracted = extraction.extracted as ExtractedIdentityFields;
        const approvedFields = { ...extracted, ...(input.correctedFields ?? {}) };
        const [updated] = await db
          .update(athletes)
          .set({
            ...(approvedFields.fullName ? { fullName: approvedFields.fullName } : {}),
            ...(approvedFields.dateOfBirth ? { dateOfBirth: approvedFields.dateOfBirth } : {}),
            ...(approvedFields.gender ? { gender: approvedFields.gender } : {}),
            status: 'identity_approved',
            athletiqId: existingAthlete.athletiqId ?? this.generateAthletiqId(),
            approvedBy: actor.id,
            updatedAt: now,
          })
          .where(eq(athletes.id, existingAthlete.id))
          .returning();
        updatedAthlete = this.expectReturned(updated, 'document.review.athlete.update');
        await this.addAuditLog(
          {
            tenantId: document.tenantId,
            actorUserId: actor.id,
            action: 'document.identity_approved',
            resource: 'identity_document',
            resourceId: document.id,
            metadata: {
              athleteId: document.athleteId,
              schoolId: document.schoolId,
              reviewAction: input.action,
            },
          },
          db,
        );
      } else {
        await this.addAuditLog(
          {
            tenantId: document.tenantId,
            actorUserId: actor.id,
            action: `document.${input.action}`,
            resource: 'identity_document',
            resourceId: document.id,
            metadata: {
              athleteId: document.athleteId,
              schoolId: document.schoolId,
            },
          },
          db,
        );
      }

      return {
        document: this.expectReturned(updatedDocument, 'document.review.document'),
        review: this.expectReturned(review, 'document.review'),
        athlete: updatedAthlete,
      };
    });

    return {
      document: this.mapIdentityDocument(result.document),
      review: this.mapDocumentReview(result.review),
      ...(result.athlete ? { athlete: this.mapAthlete(result.athlete) } : {}),
    };
  }

  async listReviewQueue(input: ListDocumentReviewQueueInput) {
    const filters = [
      ...(input.schoolId ? [eq(identityDocuments.schoolId, input.schoolId)] : []),
      ...(input.status ? [eq(identityDocuments.status, input.status)] : []),
    ];
    const rows =
      filters.length > 0
        ? await this.db
            .select()
            .from(identityDocuments)
            .where(and(...filters))
        : await this.db.select().from(identityDocuments);
    return Promise.all(
      rows
        .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
        .map((document) => this.buildDocumentReviewQueueItem(document, this.db)),
    );
  }

  async listDuplicateCandidates(_documentId: string) {
    const rows = await this.db
      .select()
      .from(documentDuplicateCandidates)
      .where(eq(documentDuplicateCandidates.documentId, _documentId));
    return rows.map((row) => this.mapDocumentDuplicateCandidate(row));
  }

  async listExpiringDocuments(_input: ListExpiringDocumentsInput) {
    const before = new Date(_input.before);
    if (Number.isNaN(before.getTime())) {
      throw new BadRequestException('before must be a valid date');
    }
    const rows = await this.db
      .select()
      .from(identityDocuments)
      .where(lte(identityDocuments.expiresAt, before));
    return rows
      .filter((document) => (_input.schoolId ? document.schoolId === _input.schoolId : true))
      .filter((document) => document.status === 'verified' || document.status === 'review_required')
      .map((document) => this.mapIdentityDocument(document));
  }

  async runExpiryCheck(
    _actor: AuthenticatedUser,
    _input: { before: string },
  ): Promise<DocumentExpiryRunResult> {
    if (_actor.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can run document expiry checks');
    }
    const before = new Date(_input.before);
    if (Number.isNaN(before.getTime())) {
      throw new BadRequestException('before must be a valid date');
    }

    const expiredDocumentIds = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const rows = await db
        .select()
        .from(identityDocuments)
        .where(
          and(eq(identityDocuments.status, 'verified'), lte(identityDocuments.expiresAt, before)),
        );
      const ids: string[] = [];
      for (const document of rows) {
        const [updated] = await db
          .update(identityDocuments)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(identityDocuments.id, document.id))
          .returning();
        const expired = this.expectReturned(updated, 'document.expiry.update');
        ids.push(expired.id);
        await this.addAuditLog(
          {
            tenantId: document.tenantId,
            actorUserId: _actor.id,
            action: 'document.expired',
            resource: 'identity_document',
            resourceId: document.id,
            metadata: {
              athleteId: document.athleteId,
              schoolId: document.schoolId,
            },
          },
          db,
        );
      }
      return ids;
    });

    return { before: _input.before, expiredDocumentIds };
  }

  private async lockIdentityDocument(documentId: string, db: DatabaseExecutor) {
    const [document] = await db
      .select()
      .from(identityDocuments)
      .where(eq(identityDocuments.id, documentId))
      .for('update')
      .limit(1);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  private assertDocumentActorAccess(actor: AuthenticatedUser, schoolId: string) {
    if (actor.role !== 'super_admin' && !actor.schoolIds.includes(schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }
  }

  private async buildDocumentReviewQueueItem(
    document: IdentityDocumentRow,
    db: DatabaseExecutor,
  ): Promise<DocumentReviewQueueItem> {
    const [extraction] = await db
      .select()
      .from(documentExtractions)
      .where(eq(documentExtractions.documentId, document.id))
      .limit(1);
    const [flags, duplicateRows] = await Promise.all([
      db.select().from(documentReviewFlags).where(eq(documentReviewFlags.documentId, document.id)),
      db
        .select()
        .from(documentDuplicateCandidates)
        .where(eq(documentDuplicateCandidates.documentId, document.id)),
    ]);

    return {
      document: this.mapIdentityDocument(document),
      ...(extraction ? { extraction: this.mapDocumentExtraction(extraction) } : {}),
      reviewFlags: flags.map((flag) => this.mapDocumentReviewFlag(flag)),
      duplicateCandidates: duplicateRows.map((candidate) =>
        this.mapDocumentDuplicateCandidate(candidate),
      ),
    };
  }

  private async detectDocumentDuplicates(
    document: IdentityDocumentRow,
    extraction: DocumentExtractionRow,
    db: DatabaseExecutor,
  ) {
    const extracted = extraction.extracted as ExtractedIdentityFields;
    const documentNumber = this.normalizeIdentityValue(extracted.documentNumber);
    const fullName = this.normalizeIdentityValue(extracted.fullName);
    const dateOfBirth = this.normalizeIdentityValue(extracted.dateOfBirth);
    const fatherName = this.normalizeIdentityValue(extracted.fatherName);
    const motherName = this.normalizeIdentityValue(extracted.motherName);

    const existingExtractions = await db
      .select()
      .from(documentExtractions)
      .where(eq(documentExtractions.schoolId, document.schoolId));
    const created: DocumentDuplicateCandidateRow[] = [];
    for (const existingExtraction of existingExtractions) {
      if (existingExtraction.documentId === document.id) {
        continue;
      }
      const [existingDocument] = await db
        .select()
        .from(identityDocuments)
        .where(eq(identityDocuments.id, existingExtraction.documentId))
        .limit(1);
      if (!existingDocument) {
        continue;
      }

      const existing = existingExtraction.extracted as ExtractedIdentityFields;
      const reasonCodes: string[] = [];
      let score = 0;
      if (
        documentNumber &&
        documentNumber === this.normalizeIdentityValue(existing.documentNumber)
      ) {
        score = 100;
        reasonCodes.push('document_number_exact');
      }
      if (
        fullName &&
        dateOfBirth &&
        fullName === this.normalizeIdentityValue(existing.fullName) &&
        dateOfBirth === this.normalizeIdentityValue(existing.dateOfBirth)
      ) {
        score = Math.max(score, 85);
        reasonCodes.push('name_dob_match');
      }
      if (fatherName && fatherName === this.normalizeIdentityValue(existing.fatherName)) {
        reasonCodes.push('father_name_match');
      }
      if (motherName && motherName === this.normalizeIdentityValue(existing.motherName)) {
        reasonCodes.push('mother_name_match');
      }
      if (score === 0) {
        continue;
      }

      const [candidate] = await db
        .insert(documentDuplicateCandidates)
        .values({
          id: this.nextId('ddup'),
          tenantId: document.tenantId,
          documentId: document.id,
          schoolId: document.schoolId,
          athleteId: document.athleteId,
          matchedDocumentId: existingDocument.id,
          matchedAthleteId: existingDocument.athleteId,
          score,
          reasonCodes,
          status: 'open',
        })
        .onConflictDoNothing({
          target: [
            documentDuplicateCandidates.documentId,
            documentDuplicateCandidates.matchedDocumentId,
            documentDuplicateCandidates.matchedAthleteId,
          ],
        })
        .returning();
      if (candidate) {
        created.push(candidate);
      }
    }
    return created;
  }

  private normalizeIdentityValue(value?: string) {
    return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  }

  private toEndOfDayDate(date: string) {
    const parsed = Date.parse(date);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    const target = new Date(parsed);
    target.setUTCHours(23, 59, 59, 999);
    return target;
  }
}

@Injectable()
export class PostgresCommunicationRepository implements CommunicationRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  linkGuardian(actor: AuthenticatedUser, input: LinkGuardianInput) {
    return this.data.linkGuardianToAthlete(actor, input);
  }

  getFamilyDashboard(actor: AuthenticatedUser, guardianUserId?: string) {
    return this.data.getFamilyDashboard(actor, guardianUserId);
  }

  createAnnouncement(actor: AuthenticatedUser, input: CreateAnnouncementInput) {
    return this.data.createAnnouncement(actor, input);
  }

  upsertPreference(actor: AuthenticatedUser, input: UpsertNotificationPreferenceInput) {
    return this.data.upsertNotificationPreference(actor, input);
  }

  listPreferences(actor: AuthenticatedUser, userId?: string) {
    return this.data.listNotificationPreferences(actor, userId);
  }

  createTemplate(actor: AuthenticatedUser, input: CreateCommunicationTemplateInput) {
    return this.data.createCommunicationTemplate(actor, input);
  }

  sendTemplateNotification(actor: AuthenticatedUser, input: SendTemplateNotificationInput) {
    return this.data.sendTemplateNotification(actor, input);
  }

  listInbox(actor: AuthenticatedUser, userId?: string) {
    return this.data.listCommunicationInbox(actor, userId);
  }

  createThread(actor: AuthenticatedUser, input: CreateConversationThreadInput) {
    return this.data.createConversationThread(actor, input);
  }

  postMessage(actor: AuthenticatedUser, threadId: string, body: string) {
    return this.data.postThreadMessage(actor, threadId, body);
  }

  hideMessage(actor: AuthenticatedUser, messageId: string, reason: string) {
    return this.data.hideThreadMessage(actor, messageId, reason);
  }

  listThread(actor: AuthenticatedUser, threadId: string) {
    return this.data.listConversationThread(actor, threadId);
  }
}

@Injectable()
export class PostgresBracketRepository extends PostgresRepositoryBase implements BracketRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async createBracket(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: CreateBracketInput,
  ): Promise<BracketView> {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const tournament = await this.requireBracketTournament(tournamentId, db);
      const seedsInput = this.normalizeBracketSeeds(input.seeds);
      const teamRows = await this.validateBracketSeedSet(tournament, seedsInput, db);
      const now = new Date();
      const bracketId = this.nextId('brk');
      const versionId = this.nextId('bver');

      await db.insert(brackets).values({
        id: bracketId,
        tenantId: tournament.tenantId,
        tournamentId: tournament.id,
        format: input.format,
        status: 'draft',
        activeVersionId: versionId,
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(bracketVersions).values({
        id: versionId,
        tenantId: tournament.tenantId,
        bracketId,
        versionNumber: 1,
        status: 'draft',
        generationPolicy: 'initial',
        createdBy: actor.id,
        createdAt: now,
      });

      const seedRecords = this.createBracketSeedRecords(
        bracketId,
        versionId,
        seedsInput,
        now.toISOString(),
      );
      await db.insert(bracketSeeds).values(
        seedRecords.map((seed) => ({
          id: seed.id,
          tenantId: tournament.tenantId,
          bracketId: seed.bracketId,
          versionId: seed.versionId,
          teamId: seed.teamId,
          seedNumber: seed.seedNumber,
          groupKey: seed.groupKey ?? null,
          locked: seed.locked,
          withdrawn: seed.withdrawn,
          createdAt: now,
          updatedAt: now,
        })),
      );

      const nodes = this.generateBracketNodes(
        input.format,
        bracketId,
        versionId,
        seedRecords,
        now.toISOString(),
      );
      await this.materializeReadyBracketMatches(db, actor, tournament, nodes, now);
      await this.insertBracketNodes(db, tournament.tenantId, nodes);
      await this.recalculateStandings(db, bracketId, versionId, now);
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'bracket.created',
          resource: 'bracket',
          resourceId: bracketId,
          metadata: { tournamentId, format: input.format, teamCount: teamRows.length },
        },
        db,
      );

      return { bracketId, versionId };
    });

    return this.expectReturned(
      await this.buildBracketView(result.bracketId, result.versionId),
      'bracket.create',
    );
  }

  async updateSeeds(
    actor: AuthenticatedUser,
    bracketId: string,
    input: UpdateBracketSeedsInput,
  ): Promise<BracketView> {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const bracket = await this.requireBracketRow(bracketId, db);
      const version = await this.requireVersionRow(bracket.activeVersionId, db);
      if (version.status === 'published') {
        throw new BadRequestException('Published bracket seeds cannot be edited');
      }
      const tournament = await this.requireBracketTournament(bracket.tournamentId, db);
      const currentSeeds = await this.getVersionSeedRecords(version.id, db);
      const nextSeeds = this.normalizeBracketSeeds(input.seeds);
      this.assertLockedSeedsUnchanged(currentSeeds, nextSeeds);
      await this.validateBracketSeedSet(tournament, nextSeeds, db);
      await this.deleteVersionGraph(version.id, tournament, db);

      const now = new Date();
      const seedRecords = this.createBracketSeedRecords(
        bracket.id,
        version.id,
        nextSeeds,
        now.toISOString(),
      );
      await db.insert(bracketSeeds).values(
        seedRecords.map((seed) => ({
          id: seed.id,
          tenantId: tournament.tenantId,
          bracketId: seed.bracketId,
          versionId: seed.versionId,
          teamId: seed.teamId,
          seedNumber: seed.seedNumber,
          groupKey: seed.groupKey ?? null,
          locked: seed.locked,
          withdrawn: seed.withdrawn,
          createdAt: now,
          updatedAt: now,
        })),
      );
      const nodes = this.generateBracketNodes(
        bracket.format as BracketFormat,
        bracket.id,
        version.id,
        seedRecords,
        now.toISOString(),
      );
      await this.materializeReadyBracketMatches(db, actor, tournament, nodes, now);
      await this.insertBracketNodes(db, tournament.tenantId, nodes);
      await this.recalculateStandings(db, bracket.id, version.id, now);
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'bracket.seeded',
          resource: 'bracket',
          resourceId: bracket.id,
          metadata: { versionId: version.id },
        },
        db,
      );
      return { bracketId: bracket.id, versionId: version.id };
    });

    return this.expectReturned(
      await this.buildBracketView(result.bracketId, result.versionId),
      'bracket.updateSeeds',
    );
  }

  async publishBracket(actor: AuthenticatedUser, bracketId: string): Promise<BracketView> {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const bracket = await this.requireBracketRow(bracketId, db);
      const version = await this.requireVersionRow(bracket.activeVersionId, db);
      const now = new Date();
      const publicSlug = bracket.publicSlug ?? this.uniquePublicBracketSlug(bracket.tournamentId);

      await db
        .update(brackets)
        .set({
          status: 'published',
          publishedVersionId: version.id,
          publicSlug,
          publishedBy: actor.id,
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(brackets.id, bracket.id));
      await db
        .update(bracketVersions)
        .set({ status: 'published' })
        .where(eq(bracketVersions.id, version.id));
      await this.addAuditLog(
        {
          tenantId: bracket.tenantId,
          actorUserId: actor.id,
          action: 'bracket.published',
          resource: 'bracket',
          resourceId: bracket.id,
          metadata: { versionId: version.id },
        },
        db,
      );
      return { bracketId: bracket.id, versionId: version.id };
    });

    return this.expectReturned(
      await this.buildBracketView(result.bracketId, result.versionId),
      'bracket.publish',
    );
  }

  async regenerateBracket(
    actor: AuthenticatedUser,
    bracketId: string,
    input: RegenerateBracketInput,
  ): Promise<BracketView> {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const bracket = await this.requireBracketRow(bracketId, db);
      const currentVersion = await this.requireVersionRow(bracket.activeVersionId, db);
      if (bracket.status === 'published' && !input.createNewVersion) {
        throw new BadRequestException('Published brackets require a new version for regeneration');
      }
      const tournament = await this.requireBracketTournament(bracket.tournamentId, db);
      const seedsInput =
        input.seeds ??
        (await this.getVersionSeedRecords(currentVersion.id, db)).map((seed) => ({
          teamId: seed.teamId,
          seedNumber: seed.seedNumber,
          ...(seed.groupKey ? { groupKey: seed.groupKey } : {}),
          locked: seed.locked,
          withdrawn: seed.withdrawn,
        }));
      const normalizedSeeds = this.normalizeBracketSeeds(seedsInput);
      await this.validateBracketSeedSet(tournament, normalizedSeeds, db);
      const now = new Date();
      const versions = await db
        .select()
        .from(bracketVersions)
        .where(eq(bracketVersions.bracketId, bracket.id));
      const versionNumber = Math.max(...versions.map((version) => version.versionNumber), 0) + 1;
      const versionId = this.nextId('bver');

      await db.insert(bracketVersions).values({
        id: versionId,
        tenantId: tournament.tenantId,
        bracketId: bracket.id,
        versionNumber,
        status: 'draft',
        generationPolicy: 'regenerated',
        notes: input.notes ?? null,
        createdBy: actor.id,
        createdAt: now,
      });
      await db
        .update(brackets)
        .set({ activeVersionId: versionId, updatedAt: now })
        .where(eq(brackets.id, bracket.id));

      const seedRecords = this.createBracketSeedRecords(
        bracket.id,
        versionId,
        normalizedSeeds,
        now.toISOString(),
      );
      await db.insert(bracketSeeds).values(
        seedRecords.map((seed) => ({
          id: seed.id,
          tenantId: tournament.tenantId,
          bracketId: seed.bracketId,
          versionId: seed.versionId,
          teamId: seed.teamId,
          seedNumber: seed.seedNumber,
          groupKey: seed.groupKey ?? null,
          locked: seed.locked,
          withdrawn: seed.withdrawn,
          createdAt: now,
          updatedAt: now,
        })),
      );
      const nodes = this.generateBracketNodes(
        bracket.format as BracketFormat,
        bracket.id,
        versionId,
        seedRecords,
        now.toISOString(),
      );
      await this.materializeReadyBracketMatches(db, actor, tournament, nodes, now);
      await this.insertBracketNodes(db, tournament.tenantId, nodes);
      await this.recalculateStandings(db, bracket.id, versionId, now);
      await this.addAuditLog(
        {
          tenantId: tournament.tenantId,
          actorUserId: actor.id,
          action: 'bracket.regenerated',
          resource: 'bracket',
          resourceId: bracket.id,
          metadata: { previousVersionId: currentVersion.id, versionId },
        },
        db,
      );

      return { bracketId: bracket.id, versionId };
    });

    return this.expectReturned(
      await this.buildBracketView(result.bracketId, result.versionId),
      'bracket.regenerate',
    );
  }

  async getBracket(actor: AuthenticatedUser, bracketId: string, versionId?: string) {
    const bracket = await this.requireBracketRow(bracketId);
    const effectiveVersionId = versionId ?? bracket.activeVersionId;
    const version = await this.requireVersionRow(effectiveVersionId);
    if (version.bracketId !== bracket.id) {
      return undefined;
    }
    await this.assertBracketReadAccess(actor, bracket, effectiveVersionId);
    return this.buildBracketView(bracketId, effectiveVersionId);
  }

  async getPublicBracket(slug: string) {
    const [bracket] = await this.db
      .select()
      .from(brackets)
      .where(eq(brackets.publicSlug, slug))
      .limit(1);
    if (!bracket || bracket.status !== 'published' || !bracket.publishedVersionId) {
      return undefined;
    }
    const view = await this.buildBracketView(bracket.id, bracket.publishedVersionId);
    return view ? this.toPublicBracketView(view, slug) : undefined;
  }

  async listStandings(actor: AuthenticatedUser, bracketId: string, groupKey?: string) {
    const bracket = await this.requireBracketRow(bracketId);
    await this.assertBracketReadAccess(actor, bracket, bracket.activeVersionId);
    await this.recalculateStandings(this.db, bracket.id, bracket.activeVersionId, new Date());
    const rows = (await this.getVersionStandingRecords(bracket.activeVersionId)).filter((row) =>
      groupKey ? row.groupKey === groupKey : true,
    );
    return { rows };
  }

  async ensureMatchCanBeVerified(matchId: string) {
    const [match] = await this.db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const [node] = await this.db
      .select()
      .from(bracketNodes)
      .where(eq(bracketNodes.matchId, matchId))
      .limit(1);
    if (!match || !node || node.bracketSide === 'group') {
      return;
    }
    if (match.homeScore !== null && match.homeScore === match.awayScore) {
      throw new BadRequestException('Elimination bracket matches require a winner');
    }
  }

  async verifyMatchAndAdvance(actor: AuthenticatedUser, matchId: string) {
    const updated = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
      if (!match) {
        throw new NotFoundException('Match not found');
      }
      if (match.status !== 'played') {
        throw new BadRequestException('Match must be played before verification');
      }

      const [node] = await db
        .select()
        .from(bracketNodes)
        .where(eq(bracketNodes.matchId, matchId))
        .limit(1);
      if (node) {
        await this.assertBracketAdvancementCanApply(db, match, node);
      }

      const now = new Date();
      const [row] = await db
        .update(matches)
        .set({
          status: 'verified',
          verifiedBy: actor.id,
          verifiedAt: now.toISOString(),
          updatedAt: now,
        })
        .where(eq(matches.id, matchId))
        .returning();
      const updatedMatch = this.expectReturned(row, 'match.verify');

      await this.addAuditLog(
        {
          tenantId: match.tenantId,
          actorUserId: actor.id,
          action: 'match.verified',
          resource: 'match',
          resourceId: match.id,
          metadata: {
            resultHome: match.homeScore ?? 0,
            resultAway: match.awayScore ?? 0,
          },
        },
        db,
      );

      if (node) {
        await this.advanceBracketNodeFromMatch(db, actor, updatedMatch, node, now);
      }

      return updatedMatch;
    });

    return this.mapMatch(updated);
  }

  async advanceFromVerifiedMatch(actor: AuthenticatedUser, matchId: string) {
    const result = await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
      if (!match || match.status !== 'verified') {
        return undefined;
      }
      const [node] = await db
        .select()
        .from(bracketNodes)
        .where(eq(bracketNodes.matchId, matchId))
        .limit(1);
      if (!node) {
        return undefined;
      }
      return this.advanceBracketNodeFromMatch(db, actor, match, node, new Date());
    });

    return result ? this.buildBracketView(result.bracketId, result.versionId) : undefined;
  }

  private async advanceBracketNodeFromMatch(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    match: MatchRow,
    node: BracketNodeRow,
    now: Date,
  ) {
    const bracket = await this.requireBracketRow(node.bracketId, db);
    if (node.status === 'completed') {
      return { bracketId: bracket.id, versionId: node.versionId };
    }

    await this.assertBracketAdvancementCanApply(db, match, node);
    const { winnerTeamId, loserTeamId } = this.getBracketMatchOutcome(match, node);
    const routes = this.getBracketAdvancementRoutes(node, winnerTeamId, loserTeamId);
    await db
      .update(bracketNodes)
      .set({
        winnerTeamId,
        loserTeamId,
        status: 'completed',
        updatedAt: now,
      })
      .where(eq(bracketNodes.id, node.id));

    const tournament = await this.requireBracketTournament(bracket.tournamentId, db);
    for (const route of routes) {
      await this.fillBracketNodeSlot(
        db,
        actor,
        tournament,
        route.nodeId,
        route.teamId,
        now,
        route.sourceNodeId,
      );
    }
    await this.resolveIfNecessaryFinal(db, actor, tournament, node, winnerTeamId, loserTeamId, now);

    await this.recalculateStandings(db, bracket.id, node.versionId, now);
    await this.addAuditLog(
      {
        tenantId: bracket.tenantId,
        actorUserId: actor.id,
        action: 'bracket.advanced',
        resource: 'bracket',
        resourceId: bracket.id,
        metadata: { matchId: match.id, nodeId: node.id, winnerTeamId },
      },
      db,
    );
    return { bracketId: bracket.id, versionId: node.versionId };
  }

  private getBracketMatchOutcome(match: MatchRow, node: BracketNodeRow) {
    if (!node.homeTeamId || !node.awayTeamId) {
      throw new BadRequestException('Bracket node is missing teams');
    }
    if (match.homeScore === null || match.awayScore === null) {
      throw new BadRequestException('Verified match is missing scores');
    }
    if (match.homeScore === match.awayScore && node.bracketSide !== 'group') {
      throw new BadRequestException('Elimination bracket matches require a winner');
    }

    const winnerTeamId = match.homeScore >= match.awayScore ? match.homeTeamId : match.awayTeamId;
    const loserTeamId = winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    return { winnerTeamId, loserTeamId };
  }

  private getBracketAdvancementRoutes(
    node: BracketNodeRow,
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

  private async assertBracketAdvancementCanApply(
    db: DatabaseExecutor,
    match: MatchRow,
    node: BracketNodeRow,
  ) {
    const { winnerTeamId, loserTeamId } = this.getBracketMatchOutcome(match, node);
    for (const route of this.getBracketAdvancementRoutes(node, winnerTeamId, loserTeamId)) {
      await this.assertBracketNodeSlotCanAccept(db, route.nodeId, route.teamId, route.sourceNodeId);
    }
    await this.assertIfNecessaryFinalCanResolve(db, node, winnerTeamId, loserTeamId);
  }

  private async requireBracketTournament(tournamentId: string, db: DatabaseExecutor = this.db) {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (tournament.status !== 'approved' && tournament.status !== 'active') {
      throw new BadRequestException('Tournament must be approved before bracketing');
    }
    return tournament;
  }

  private async requireBracketRow(bracketId: string, db: DatabaseExecutor = this.db) {
    const [bracket] = await db.select().from(brackets).where(eq(brackets.id, bracketId)).limit(1);
    if (!bracket) {
      throw new NotFoundException('Bracket not found');
    }
    return bracket;
  }

  private async requireVersionRow(versionId: string, db: DatabaseExecutor = this.db) {
    const [version] = await db
      .select()
      .from(bracketVersions)
      .where(eq(bracketVersions.id, versionId))
      .limit(1);
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

  private async validateBracketSeedSet(
    tournament: TournamentRow,
    seedsInput: ReturnType<PostgresBracketRepository['normalizeBracketSeeds']>,
    db: DatabaseExecutor,
  ) {
    if (seedsInput.filter((seed) => !seed.withdrawn).length < 2) {
      throw new BadRequestException('At least two active bracket seeds are required');
    }
    const teamIds = new Set<string>();
    const seedNumbers = new Set<number>();
    const teamRows: TeamRow[] = [];
    for (const seed of seedsInput) {
      if (teamIds.has(seed.teamId)) {
        throw new BadRequestException('Duplicate team in bracket seeds');
      }
      if (seedNumbers.has(seed.seedNumber)) {
        throw new BadRequestException('Duplicate seed number');
      }
      teamIds.add(seed.teamId);
      seedNumbers.add(seed.seedNumber);

      const [team] = await db.select().from(teams).where(eq(teams.id, seed.teamId)).limit(1);
      if (!team) {
        throw new BadRequestException(`team ${seed.teamId} not found`);
      }
      if (team.tournamentId !== tournament.id) {
        throw new BadRequestException(`team ${seed.teamId} does not belong to tournament`);
      }
      if (team.status !== 'approved') {
        throw new BadRequestException(`team ${seed.teamId} must be approved`);
      }
      teamRows.push(team);
    }
    return teamRows;
  }

  private assertLockedSeedsUnchanged(
    currentSeeds: BracketSeedRecord[],
    nextSeeds: ReturnType<PostgresBracketRepository['normalizeBracketSeeds']>,
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

  private async assertBracketReadAccess(
    actor: AuthenticatedUser,
    bracket: BracketRow,
    versionId: string,
  ) {
    if (
      actor.role === 'super_admin' ||
      actor.role === 'federation_admin' ||
      actor.role === 'government_viewer'
    ) {
      return;
    }

    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, bracket.tournamentId))
      .limit(1);
    const readableSchoolIds = new Set<string>(tournament?.schoolIds ?? []);
    const seeds = await this.getVersionSeedRecords(versionId);
    for (const seed of seeds) {
      const [team] = await this.db.select().from(teams).where(eq(teams.id, seed.teamId)).limit(1);
      if (team) {
        readableSchoolIds.add(team.schoolId);
      }
    }

    if (!actor.schoolIds.some((schoolId) => readableSchoolIds.has(schoolId))) {
      throw new ForbiddenException('Not allowed to read this bracket');
    }
  }

  private createBracketSeedRecords(
    bracketId: string,
    versionId: string,
    seedsInput: ReturnType<PostgresBracketRepository['normalizeBracketSeeds']>,
    now: string,
  ) {
    return seedsInput.map(
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

  private async materializeReadyBracketMatches(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    tournament: TournamentRow,
    nodes: BracketNodeRecord[],
    now: Date,
  ) {
    const newMatchIds: string[] = [];
    for (const node of nodes) {
      if (!node.homeTeamId || !node.awayTeamId || node.matchId) {
        continue;
      }
      const matchId = await this.createBracketMatch(
        db,
        actor,
        tournament,
        node.homeTeamId,
        node.awayTeamId,
        now,
        false,
      );
      newMatchIds.push(matchId);
      node.matchId = matchId;
      node.status = 'ready';
      node.updatedAt = now.toISOString();
    }
    if (newMatchIds.length) {
      await db
        .update(tournaments)
        .set({
          matchIds: [...tournament.matchIds, ...newMatchIds],
          updatedAt: now,
        })
        .where(eq(tournaments.id, tournament.id));
      tournament.matchIds = [...tournament.matchIds, ...newMatchIds];
    }
  }

  private async createBracketMatch(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    tournament: TournamentRow,
    homeTeamId: string,
    awayTeamId: string,
    now: Date,
    updateTournament: boolean,
  ) {
    const [match] = await db
      .insert(matches)
      .values({
        id: this.nextId('mch'),
        tenantId: tournament.tenantId,
        tournamentId: tournament.id,
        homeTeamId,
        awayTeamId,
        scheduledAt: now.toISOString(),
        status: 'scheduled',
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const inserted = this.expectReturned(match, 'bracket.match.create');
    if (updateTournament) {
      await db
        .update(tournaments)
        .set({
          matchIds: [...tournament.matchIds, inserted.id],
          updatedAt: now,
        })
        .where(eq(tournaments.id, tournament.id));
      tournament.matchIds = [...tournament.matchIds, inserted.id];
    }
    await this.addAuditLog(
      {
        tenantId: tournament.tenantId,
        actorUserId: actor.id,
        action: 'match.created',
        resource: 'match',
        resourceId: inserted.id,
        metadata: { tournamentId: tournament.id, homeTeamId, awayTeamId },
      },
      db,
    );
    return inserted.id;
  }

  private async insertBracketNodes(
    db: DatabaseExecutor,
    tenantId: string,
    nodes: BracketNodeRecord[],
  ) {
    if (!nodes.length) {
      return;
    }
    await db.insert(bracketNodes).values(
      nodes.map((node) => ({
        id: node.id,
        tenantId,
        bracketId: node.bracketId,
        versionId: node.versionId,
        matchId: node.matchId ?? null,
        groupKey: node.groupKey ?? null,
        round: node.round,
        position: node.position,
        bracketSide: node.bracketSide,
        homeTeamId: node.homeTeamId ?? null,
        awayTeamId: node.awayTeamId ?? null,
        winnerTeamId: node.winnerTeamId ?? null,
        loserTeamId: node.loserTeamId ?? null,
        homeSeedNumber: node.homeSeedNumber ?? null,
        awaySeedNumber: node.awaySeedNumber ?? null,
        sourceNodeIds: [...node.sourceNodeIds],
        nextNodeId: node.nextNodeId ?? null,
        loserNextNodeId: node.loserNextNodeId ?? null,
        status: node.status,
        isIfNecessary: node.isIfNecessary ?? false,
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
      })),
    );
  }

  private async fillBracketNodeSlot(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    tournament: TournamentRow,
    nodeId: string,
    teamId: string,
    now: Date,
    sourceNodeId?: string,
  ) {
    const [node] = await db.select().from(bracketNodes).where(eq(bracketNodes.id, nodeId)).limit(1);
    if (!node) {
      throw new BadRequestException('Bracket advancement target not found');
    }
    if (node.homeTeamId === teamId || node.awayTeamId === teamId) {
      return;
    }
    const slot = this.resolveBracketNodeSlot(node, sourceNodeId);
    if (!slot) {
      throw new BadRequestException('Bracket node already has two teams');
    }
    const existingTeamId = slot === 'home' ? node.homeTeamId : node.awayTeamId;
    if (existingTeamId && existingTeamId !== teamId) {
      throw new BadRequestException('Bracket node slot is already occupied');
    }
    const homeTeamId = slot === 'home' ? teamId : node.homeTeamId;
    const awayTeamId = slot === 'away' ? teamId : node.awayTeamId;
    const values: Partial<typeof bracketNodes.$inferInsert> = {
      homeTeamId,
      awayTeamId,
      updatedAt: now,
    };
    if (homeTeamId && awayTeamId && !node.matchId) {
      values.matchId = await this.createBracketMatch(
        db,
        actor,
        tournament,
        homeTeamId,
        awayTeamId,
        now,
        true,
      );
      values.status = 'ready';
    }
    await db.update(bracketNodes).set(values).where(eq(bracketNodes.id, node.id));
  }

  private resolveBracketNodeSlot(node: BracketNodeRow, sourceNodeId?: string) {
    if (sourceNodeId && node.sourceNodeIds.length) {
      const sourceIndex = node.sourceNodeIds.indexOf(sourceNodeId);
      if (sourceIndex === -1 || sourceIndex > 1) {
        throw new BadRequestException('Bracket route is not connected to target node');
      }
      return sourceIndex === 0 ? 'home' : 'away';
    }
    if (!node.homeTeamId) {
      return 'home';
    }
    if (!node.awayTeamId) {
      return 'away';
    }
    return undefined;
  }

  private async assertBracketNodeSlotCanAccept(
    db: DatabaseExecutor,
    nodeId: string,
    teamId: string,
    sourceNodeId?: string,
  ) {
    const [node] = await db.select().from(bracketNodes).where(eq(bracketNodes.id, nodeId)).limit(1);
    if (!node) {
      throw new BadRequestException('Bracket advancement target not found');
    }
    if (node.homeTeamId === teamId || node.awayTeamId === teamId) {
      return;
    }
    const slot = this.resolveBracketNodeSlot(node, sourceNodeId);
    if (!slot) {
      throw new BadRequestException('Bracket node already has two teams');
    }
    const existingTeamId = slot === 'home' ? node.homeTeamId : node.awayTeamId;
    if (existingTeamId && existingTeamId !== teamId) {
      throw new BadRequestException('Bracket node slot is already occupied');
    }
  }

  private async assertIfNecessaryFinalCanResolve(
    db: DatabaseExecutor,
    node: BracketNodeRow,
    winnerTeamId: string,
    loserTeamId: string,
  ) {
    const resetNode = await this.findIfNecessaryFinal(db, node);
    if (!resetNode || winnerTeamId === node.homeTeamId) {
      return;
    }
    if (
      (resetNode.homeTeamId && resetNode.homeTeamId !== loserTeamId) ||
      (resetNode.awayTeamId && resetNode.awayTeamId !== winnerTeamId)
    ) {
      throw new BadRequestException('If-necessary final is already occupied');
    }
  }

  private async resolveIfNecessaryFinal(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    tournament: TournamentRow,
    node: BracketNodeRow,
    winnerTeamId: string,
    loserTeamId: string,
    now: Date,
  ) {
    const resetNode = await this.findIfNecessaryFinal(db, node);
    if (!resetNode || resetNode.status === 'completed') {
      return;
    }
    if (winnerTeamId === node.homeTeamId) {
      await db
        .update(bracketNodes)
        .set({
          winnerTeamId,
          status: 'bye',
          updatedAt: now,
        })
        .where(eq(bracketNodes.id, resetNode.id));
      return;
    }

    const values: Partial<typeof bracketNodes.$inferInsert> = {
      homeTeamId: loserTeamId,
      awayTeamId: winnerTeamId,
      status: 'ready',
      updatedAt: now,
    };
    if (!resetNode.matchId) {
      values.matchId = await this.createBracketMatch(
        db,
        actor,
        tournament,
        loserTeamId,
        winnerTeamId,
        now,
        true,
      );
    }
    await db.update(bracketNodes).set(values).where(eq(bracketNodes.id, resetNode.id));
  }

  private async findIfNecessaryFinal(db: DatabaseExecutor, node: BracketNodeRow) {
    if (node.isIfNecessary) {
      return undefined;
    }
    const candidates = await db
      .select()
      .from(bracketNodes)
      .where(and(eq(bracketNodes.versionId, node.versionId), eq(bracketNodes.isIfNecessary, true)));
    return candidates.find((candidate) => candidate.sourceNodeIds.includes(node.id));
  }

  private async recalculateStandings(
    db: DatabaseExecutor,
    bracketId: string,
    versionId: string,
    now: Date,
  ) {
    await db.delete(standingRows).where(eq(standingRows.versionId, versionId));
    const nodes = await this.getVersionNodeRecords(versionId, db);
    if (!nodes.some((node) => node.bracketSide === 'group')) {
      return;
    }
    const seeds = await this.getVersionSeedRecords(versionId, db);
    const allMatches: MatchRecord[] = [];
    for (const node of nodes) {
      if (!node.matchId) {
        continue;
      }
      const [match] = await db.select().from(matches).where(eq(matches.id, node.matchId)).limit(1);
      if (match) {
        allMatches.push(this.mapMatch(match));
      }
    }
    const teamRecords: TournamentTeamRecord[] = [];
    for (const seed of seeds) {
      const [team] = await db.select().from(teams).where(eq(teams.id, seed.teamId)).limit(1);
      if (team) {
        teamRecords.push(await this.mapTeam(team));
      }
    }
    const rows = calculateStandings({
      bracketId,
      versionId,
      seeds,
      nodes,
      matches: allMatches,
      teams: teamRecords,
      now: now.toISOString(),
    });
    if (!rows.length) {
      return;
    }
    const bracket = await this.requireBracketRow(bracketId, db);
    await db.insert(standingRows).values(
      rows.map((row) => ({
        id: row.id,
        tenantId: bracket.tenantId,
        bracketId: row.bracketId,
        versionId: row.versionId,
        groupKey: row.groupKey,
        teamId: row.teamId,
        played: row.played,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        points: row.points,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        disciplinaryPoints: row.disciplinaryPoints,
        headToHeadPoints: row.headToHeadPoints,
        rank: row.rank,
        updatedAt: now,
      })),
    );
  }

  private async deleteVersionGraph(
    versionId: string,
    tournament: TournamentRow,
    db: DatabaseExecutor,
  ) {
    const nodes = await db
      .select({ matchId: bracketNodes.matchId })
      .from(bracketNodes)
      .where(eq(bracketNodes.versionId, versionId));
    const matchIds = nodes.flatMap((node) => (node.matchId ? [node.matchId] : []));
    if (matchIds.length) {
      const existingMatches = await db
        .select({ id: matches.id, status: matches.status })
        .from(matches)
        .where(inArray(matches.id, matchIds));
      if (existingMatches.some((match) => match.status !== 'scheduled')) {
        throw new BadRequestException('Cannot reseed bracket after bracket matches have started');
      }
    }

    await db.delete(standingRows).where(eq(standingRows.versionId, versionId));
    await db.delete(bracketNodes).where(eq(bracketNodes.versionId, versionId));
    await db.delete(bracketSeeds).where(eq(bracketSeeds.versionId, versionId));

    if (matchIds.length) {
      const deletedMatches = await db
        .delete(matches)
        .where(and(inArray(matches.id, matchIds), eq(matches.status, 'scheduled')))
        .returning({ id: matches.id });
      const deletedMatchIds = new Set(deletedMatches.map((match) => match.id));
      if (deletedMatchIds.size) {
        tournament.matchIds = tournament.matchIds.filter(
          (matchId) => !deletedMatchIds.has(matchId),
        );
        await db
          .update(tournaments)
          .set({
            matchIds: tournament.matchIds,
            updatedAt: new Date(),
          })
          .where(eq(tournaments.id, tournament.id));
      }
    }
  }

  private async getVersionSeedRecords(versionId: string, db: DatabaseExecutor = this.db) {
    const rows = await db.select().from(bracketSeeds).where(eq(bracketSeeds.versionId, versionId));
    return rows
      .map((row) => this.mapBracketSeed(row))
      .sort((first, second) => first.seedNumber - second.seedNumber);
  }

  private async getVersionNodeRecords(versionId: string, db: DatabaseExecutor = this.db) {
    const rows = await db.select().from(bracketNodes).where(eq(bracketNodes.versionId, versionId));
    return rows
      .map((row) => this.mapBracketNode(row))
      .sort((first, second) => {
        if (first.bracketSide !== second.bracketSide) {
          return first.bracketSide.localeCompare(second.bracketSide);
        }
        if (first.round !== second.round) {
          return first.round - second.round;
        }
        return first.position - second.position;
      });
  }

  private async getVersionStandingRecords(versionId: string, db: DatabaseExecutor = this.db) {
    const rows = await db.select().from(standingRows).where(eq(standingRows.versionId, versionId));
    return rows
      .map((row) => this.mapStandingRow(row))
      .sort((first, second) => {
        if (first.groupKey !== second.groupKey) {
          return first.groupKey.localeCompare(second.groupKey);
        }
        return first.rank - second.rank;
      });
  }

  private async buildBracketView(
    bracketId: string,
    versionId?: string,
  ): Promise<BracketView | undefined> {
    const [bracket] = await this.db
      .select()
      .from(brackets)
      .where(eq(brackets.id, bracketId))
      .limit(1);
    if (!bracket) {
      return undefined;
    }
    const version = await this.requireVersionRow(versionId ?? bracket.activeVersionId);
    if (version.bracketId !== bracket.id) {
      return undefined;
    }
    const seeds = await this.getVersionSeedRecords(version.id);
    const nodes = await this.getVersionNodeRecords(version.id);
    const standings = await this.getVersionStandingRecords(version.id);
    const teamIds = new Set<string>();
    for (const seed of seeds) {
      teamIds.add(seed.teamId);
    }
    for (const node of nodes) {
      for (const id of [node.homeTeamId, node.awayTeamId, node.winnerTeamId, node.loserTeamId]) {
        if (id) {
          teamIds.add(id);
        }
      }
    }
    const teamSummaries: BracketTeamSummary[] = [];
    for (const teamId of teamIds) {
      const [team] = await this.db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (team) {
        teamSummaries.push({ id: team.id, name: team.name, schoolId: team.schoolId });
      }
    }
    return {
      bracket: this.mapBracket(bracket),
      version: this.mapBracketVersion(version),
      seeds,
      nodes,
      standings,
      teams: teamSummaries,
    };
  }

  private async toPublicBracketView(
    view: BracketView,
    publicSlug: string,
  ): Promise<PublicBracketView> {
    const matchScores = new Map<string, Pick<MatchRecord, 'homeScore' | 'awayScore'>>();
    for (const node of view.nodes) {
      if (!node.matchId) {
        continue;
      }
      const [match] = await this.db
        .select()
        .from(matches)
        .where(eq(matches.id, node.matchId))
        .limit(1);
      if (match) {
        matchScores.set(node.matchId, this.mapMatch(match));
      }
    }
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
        const score = node.matchId ? matchScores.get(node.matchId) : undefined;
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
          ...(score?.homeScore !== undefined ? { homeScore: score.homeScore } : {}),
          ...(score?.awayScore !== undefined ? { awayScore: score.awayScore } : {}),
        };
      }),
      standings: view.standings.map((row) => ({ ...row })),
      teams: view.teams.map((team) => ({ ...team })),
    };
  }

  private mapBracket(row: BracketRow): BracketRecord {
    return {
      id: row.id,
      tournamentId: row.tournamentId,
      format: row.format as BracketFormat,
      status: row.status as BracketStatus,
      activeVersionId: row.activeVersionId,
      ...(row.publishedVersionId ? { publishedVersionId: row.publishedVersionId } : {}),
      ...(row.publicSlug ? { publicSlug: row.publicSlug } : {}),
      createdBy: row.createdBy,
      ...(row.publishedBy ? { publishedBy: row.publishedBy } : {}),
      ...(row.publishedAt ? { publishedAt: this.toIso(row.publishedAt) } : {}),
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  private mapBracketVersion(row: BracketVersionRow): BracketVersionRecord {
    return {
      id: row.id,
      bracketId: row.bracketId,
      versionNumber: row.versionNumber,
      status: row.status as BracketStatus,
      generationPolicy: row.generationPolicy as BracketVersionRecord['generationPolicy'],
      ...(row.notes ? { notes: row.notes } : {}),
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
    };
  }

  private mapBracketSeed(row: BracketSeedRow): BracketSeedRecord {
    return {
      id: row.id,
      bracketId: row.bracketId,
      versionId: row.versionId,
      teamId: row.teamId,
      seedNumber: row.seedNumber,
      ...(row.groupKey ? { groupKey: row.groupKey } : {}),
      locked: row.locked,
      withdrawn: row.withdrawn,
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  private mapBracketNode(row: BracketNodeRow): BracketNodeRecord {
    return {
      id: row.id,
      bracketId: row.bracketId,
      versionId: row.versionId,
      ...(row.matchId ? { matchId: row.matchId } : {}),
      ...(row.groupKey ? { groupKey: row.groupKey } : {}),
      round: row.round,
      position: row.position,
      bracketSide: row.bracketSide as BracketNodeRecord['bracketSide'],
      ...(row.homeTeamId ? { homeTeamId: row.homeTeamId } : {}),
      ...(row.awayTeamId ? { awayTeamId: row.awayTeamId } : {}),
      ...(row.winnerTeamId ? { winnerTeamId: row.winnerTeamId } : {}),
      ...(row.loserTeamId ? { loserTeamId: row.loserTeamId } : {}),
      ...(row.homeSeedNumber !== null ? { homeSeedNumber: row.homeSeedNumber } : {}),
      ...(row.awaySeedNumber !== null ? { awaySeedNumber: row.awaySeedNumber } : {}),
      sourceNodeIds: [...row.sourceNodeIds],
      ...(row.nextNodeId ? { nextNodeId: row.nextNodeId } : {}),
      ...(row.loserNextNodeId ? { loserNextNodeId: row.loserNextNodeId } : {}),
      status: row.status as BracketNodeRecord['status'],
      ...(row.isIfNecessary ? { isIfNecessary: row.isIfNecessary } : {}),
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  private mapStandingRow(row: StandingRow): StandingRowRecord {
    return {
      id: row.id,
      bracketId: row.bracketId,
      versionId: row.versionId,
      groupKey: row.groupKey,
      teamId: row.teamId,
      played: row.played,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      points: row.points,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      disciplinaryPoints: row.disciplinaryPoints,
      headToHeadPoints: row.headToHeadPoints,
      rank: row.rank,
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  private uniquePublicBracketSlug(tournamentId: string) {
    return `bracket-${tournamentId}-${this.nextId('pub').slice(-6)}`.toLowerCase();
  }
}

@Injectable()
export class PostgresQrRepository extends PostgresRepositoryBase implements QrRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async createCode(actor: AuthenticatedUser, resourceType: QrResourceType, resourceId: string) {
    const resource = await this.getResourceForQr(resourceType, resourceId);
    if (!resource) {
      throw new NotFoundException(`${resourceType} not found`);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = `qr_${this.randomToken(32)}`;
      const [created] = await this.db
        .insert(qrCodes)
        .values({
          id: this.nextId('qr'),
          tenantId: resource.tenantId,
          code,
          resourceType,
          resourceId,
          ...(resourceType === 'athlete' ? { athleteId: resourceId } : {}),
          ...(resourceType === 'match' ? { matchId: resourceId } : {}),
          ...(resourceType === 'team' ? { teamId: resourceId } : {}),
          ...(resource.schoolId ? { schoolId: resource.schoolId } : {}),
          ...(resource.tournamentId ? { tournamentId: resource.tournamentId } : {}),
          createdBy: actor.id,
        })
        .onConflictDoNothing()
        .returning();

      if (created) {
        return this.mapQrCode(created);
      }
    }

    throw new Error('Could not generate a unique QR code');
  }

  async findPublicResource(resourceType: QrResourceType, code: string) {
    const [qr] = await this.db
      .select()
      .from(qrCodes)
      .where(and(eq(qrCodes.code, code), eq(qrCodes.resourceType, resourceType)))
      .limit(1);
    if (!qr || qr.revoked) {
      return undefined;
    }
    const resource = await this.getResourceForQr(resourceType, qr.resourceId);
    if (!resource) {
      return undefined;
    }
    return {
      code: qr.code,
      resourceType: qr.resourceType as QrResourceType,
      resourceId: qr.resourceId,
    };
  }

  async recordScan(actor: AuthenticatedUser, code: string) {
    const [qr] = await this.db.select().from(qrCodes).where(eq(qrCodes.code, code)).limit(1);
    if (!qr || qr.revoked) {
      throw new NotFoundException('QR code not found');
    }

    await this.addAuditLog({
      tenantId: qr.tenantId,
      actorUserId: actor.id,
      action: 'qr.scanned',
      resource: qr.resourceType,
      resourceId: qr.resourceId,
      metadata: { code },
    });

    return {
      scanned: true,
      code,
    };
  }

  private async getResourceForQr(resourceType: QrResourceType, resourceId: string) {
    if (resourceType === 'athlete') {
      const [athlete] = await this.db
        .select()
        .from(athletes)
        .where(eq(athletes.id, resourceId))
        .limit(1);
      return athlete
        ? { tenantId: athlete.tenantId, schoolId: athlete.schoolId, tournamentId: undefined }
        : undefined;
    }
    if (resourceType === 'team') {
      const [team] = await this.db.select().from(teams).where(eq(teams.id, resourceId)).limit(1);
      return team
        ? { tenantId: team.tenantId, schoolId: team.schoolId, tournamentId: undefined }
        : undefined;
    }

    const [match] = await this.db.select().from(matches).where(eq(matches.id, resourceId)).limit(1);
    return match
      ? { tenantId: match.tenantId, schoolId: undefined, tournamentId: match.tournamentId }
      : undefined;
  }
}

@Injectable()
export class PostgresSyncRepository extends PostgresRepositoryBase implements SyncRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async pushMutations(input: PushSyncMutationsInput) {
    if (!input.clientId.trim()) {
      throw new BadRequestException('clientId is required');
    }
    if (!input.mutations.length) {
      throw new BadRequestException('mutations are required');
    }

    const responses: SyncMutationRecord[] = [];

    for (const mutation of input.mutations) {
      if (!mutation.id?.trim() || !mutation.mutationType?.trim()) {
        throw new BadRequestException('Each mutation requires id and mutationType');
      }

      const record = await this.db.transaction(async (tx) => {
        const db = tx as unknown as DatabaseExecutor;
        const [reserved] = await db
          .insert(syncMutations)
          .values({
            id: this.nextId('sync'),
            tenantId: input.tenantId,
            clientId: input.clientId,
            mutationId: mutation.id,
            actorUserId: input.actor.id,
            status: 'pending',
            mutationType: mutation.mutationType,
            mutationPayload: mutation.payload,
          })
          .onConflictDoNothing()
          .returning();

        if (!reserved) {
          const [existing] = await db
            .select()
            .from(syncMutations)
            .where(
              and(
                eq(syncMutations.tenantId, input.tenantId),
                eq(syncMutations.clientId, input.clientId),
                eq(syncMutations.mutationId, mutation.id),
              ),
            )
            .limit(1);
          return this.expectReturned(existing, 'sync.pushMutations');
        }

        let status: SyncMutationRecord['status'] = 'synced';
        let errorReason: string | undefined;
        try {
          await this.applyMutation(db, input.actor, mutation);
        } catch (error) {
          if (error instanceof BadRequestException) {
            status = 'conflict';
            errorReason = error.message;
          } else {
            status = 'failed';
            errorReason = error instanceof Error ? error.message : 'sync failed';
          }
        }

        const [updated] = await db
          .update(syncMutations)
          .set({
            status,
            updatedAt: new Date(),
            ...(errorReason ? { errorReason } : {}),
          })
          .where(eq(syncMutations.id, reserved.id))
          .returning();
        const syncRecord = this.expectReturned(updated, 'sync.pushMutations');

        await this.addAuditLog(
          {
            tenantId: input.tenantId,
            actorUserId: input.actor.id,
            action: `sync.${mutation.mutationType}.received`,
            resource: 'sync_mutation',
            resourceId: syncRecord.id,
            metadata: {
              clientId: input.clientId,
              mutationId: mutation.id,
              tenantId: input.tenantId,
            },
          },
          db,
        );

        return syncRecord;
      });
      responses.push(this.mapSyncMutation(record));
    }

    return {
      clientId: input.clientId,
      mutations: responses,
    };
  }

  async listMutations(tenantId: string, clientId: string) {
    const rows = await this.db
      .select()
      .from(syncMutations)
      .where(and(eq(syncMutations.tenantId, tenantId), eq(syncMutations.clientId, clientId)));
    return rows.map((row) => this.mapSyncMutation(row));
  }

  private async applyMutation(
    db: DatabaseExecutor,
    actor: AuthenticatedUser,
    input: {
      id: string;
      mutationType: string;
      payload: Record<string, unknown>;
    },
  ) {
    const matchRepository = new PostgresMatchRepository(this.database);
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
      const event = payload.event;
      if (
        typeof event.athleteId !== 'string' ||
        typeof event.teamId !== 'string' ||
        typeof event.type !== 'string'
      ) {
        throw new BadRequestException('Invalid mutation payload');
      }
      await matchRepository.submitEventWithExecutor(db, actor, payload.matchId, {
        athleteId: event.athleteId,
        teamId: event.teamId,
        type: event.type as MatchEventType,
        ...(typeof event.minute === 'number' ? { minute: event.minute } : {}),
        ...(typeof event.details === 'string' ? { details: event.details } : {}),
        ...(typeof event.quantity === 'number' ? { quantity: event.quantity } : {}),
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
      const event = payload.event;
      if (
        typeof event.athleteId !== 'string' ||
        typeof event.teamId !== 'string' ||
        typeof event.type !== 'string'
      ) {
        throw new BadRequestException('Invalid mutation payload');
      }
      await matchRepository.correctEventWithExecutor(db, actor, payload.matchId, payload.eventId, {
        athleteId: event.athleteId,
        teamId: event.teamId,
        type: event.type as MatchEventType,
        ...(typeof event.minute === 'number' ? { minute: event.minute } : {}),
        ...(typeof event.details === 'string' ? { details: event.details } : {}),
        ...(typeof event.quantity === 'number' ? { quantity: event.quantity } : {}),
        ...(typeof event.reason === 'string' ? { reason: event.reason } : {}),
      });
      return;
    }

    throw new BadRequestException('Unsupported mutation type');
  }
}

@Injectable()
export class PostgresSearchRepository extends PostgresRepositoryBase implements SearchRepository {
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async search(query: string): Promise<SearchResults> {
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

    const [schoolRows, athleteRows, tournamentRows, teamRows, matchRows] = await Promise.all([
      this.db.select().from(schools),
      this.db.select().from(athletes),
      this.db.select().from(tournaments),
      this.db.select().from(teams),
      this.db.select().from(matches),
    ]);

    return {
      schools: schoolRows
        .filter((school) => school.name.toLowerCase().includes(normalized))
        .map((school) => ({
          id: school.id,
          name: school.name,
          status: school.status as 'pending' | 'approved',
        })),
      athletes: athleteRows
        .filter((athlete) => athlete.fullName.toLowerCase().includes(normalized))
        .map((athlete) => ({
          id: athlete.id,
          fullName: athlete.fullName,
          schoolId: athlete.schoolId,
        })),
      tournaments: tournamentRows
        .filter(
          (tournament) =>
            tournament.name.toLowerCase().includes(normalized) ||
            tournament.sport.toLowerCase().includes(normalized),
        )
        .map((tournament) => ({
          id: tournament.id,
          name: tournament.name,
          sport: tournament.sport,
        })),
      teams: teamRows
        .filter((team) => team.name.toLowerCase().includes(normalized))
        .map((team) => ({
          id: team.id,
          name: team.name,
          schoolId: team.schoolId,
          tournamentId: team.tournamentId,
        })),
      matches: matchRows
        .filter(
          (match) =>
            match.id.toLowerCase().includes(normalized) ||
            match.homeTeamId.toLowerCase().includes(normalized) ||
            match.awayTeamId.toLowerCase().includes(normalized),
        )
        .map((match) => ({
          id: match.id,
          tournamentId: match.tournamentId,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
        })),
    };
  }
}

@Injectable()
export class PostgresAnalyticsRepository
  extends PostgresRepositoryBase
  implements AnalyticsRepository
{
  constructor(@Inject(DatabaseService) database: DatabaseService) {
    super(database);
  }

  async listSchools() {
    const rows = await this.db.select().from(schools);
    return rows.map((row) => this.mapSchool(row));
  }

  async listTournaments() {
    const rows = await this.db.select().from(tournaments);
    return Promise.all(rows.map((row) => this.mapTournament(row)));
  }

  async listTeams(tournamentId?: string, schoolId?: string) {
    const rows = await this.db.select().from(teams);
    const filtered = rows
      .filter((team) => (tournamentId ? team.tournamentId === tournamentId : true))
      .filter((team) => (schoolId ? team.schoolId === schoolId : true));
    return Promise.all(filtered.map((team) => this.mapTeam(team)));
  }

  async listAthletes() {
    const rows = await this.db.select().from(athletes);
    return rows.map((row) => this.mapAthlete(row));
  }

  async findTournamentById(tournamentId: string) {
    const [found] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    return found ? this.mapTournament(found) : undefined;
  }

  getTournamentLeaderboard(tournamentId: string, limit?: number) {
    return new PostgresTournamentRepository(this.database).getLeaderboard(tournamentId, limit);
  }

  async recordFederationOverride(actor: AuthenticatedUser, input: FederationOverrideInput) {
    await this.ensurePlatformTenant();
    const overrideId = this.nextId('fov');

    await this.db.transaction(async (tx) => {
      const db = tx as unknown as DatabaseExecutor;
      await db.insert(federationOverrides).values({
        id: overrideId,
        tenantId: 'platform',
        scope: input.scope,
        targetId: input.targetId,
        field: input.field,
        metadata: {},
        actorUserId: actor.id,
        ...(input.reason ? { reason: input.reason } : {}),
      });

      await this.addAuditLog(
        {
          tenantId: 'platform',
          actorUserId: actor.id,
          action: 'analytics.override_recorded',
          resource: input.scope,
          resourceId: input.targetId,
          metadata: {
            field: input.field,
            ...(input.reason ? { reason: input.reason } : {}),
          },
        },
        db,
      );
    });

    return {
      ok: true,
      action: 'analytics.override_recorded',
      scope: input.scope,
      targetId: input.targetId,
    };
  }
}
