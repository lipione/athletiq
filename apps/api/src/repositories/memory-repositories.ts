import { Inject, Injectable } from '@nestjs/common';
import { AppDataStore } from '../common/store.js';
import type {
  AnalyticsRepository,
  AuthSessionRepository,
  AthleteRepository,
  AuditRepository,
  AssignOfficialInput,
  AvailabilityFilter,
  BillingRepository,
  BracketRepository,
  CommunicationRepository,
  CreateAvailabilityInput,
  CreateBracketInput,
  CreateAnnouncementInput,
  CreateAnalyticsReportDraftInput,
  CreateCommunicationTemplateInput,
  CreateConversationThreadInput,
  ConfigureTournamentRegistrationFeeInput,
  CorrectMatchEventInput,
  CreateAthleteDraftInput,
  CreateExportBundleInput,
  CreateDiscountCodeInput,
  CreateFacilityInput,
  CreatePartnerApiKeyInput,
  CreateWebhookSubscriptionInput,
  CreateWebhookTestDeliveryInput,
  CommitSpreadsheetImportInput,
  CreateMembershipPlanInput,
  CreateRefreshSessionInput,
  CreateMatchEventInput,
  CreateMatchInput,
  CreateOfficialProfileInput,
  CreateSchoolInput,
  CreateTeamInput,
  CreateTournamentInput,
  CreateTournamentRegistrationInvoiceInput,
  CreateTournamentWaiverRequirementInput,
  CreateVenueUnitInput,
  RegenerateBracketInput,
  CreateUserInput,
  CreateWaiverTemplateInput,
  CreateDocumentReviewLinkInput,
  EnsureTournamentWaiversInput,
  ExtractIdentityDocumentInput,
  FederationOverrideInput,
  FinanceReportInput,
  GenerateScheduleInput,
  DocumentRepository,
  IntegrationRepository,
  LinkGuardianInput,
  ListDocumentReviewQueueInput,
  ListExpiringDocumentsInput,
  MatchRepository,
  OverrideMatchScheduleInput,
  PurchaseSchoolMembershipInput,
  PushSyncMutationsInput,
  QrRepository,
  QrResourceType,
  RecordManualPaymentInput,
  RefundPaymentInput,
  RespondAssignmentInput,
  RollbackSpreadsheetImportInput,
  RotateRefreshSessionInput,
  SchoolRepository,
  SearchRepository,
  SchedulingRepository,
  SendTemplateNotificationInput,
  SignWaiverInput,
  SpreadsheetImportPreviewInput,
  SyncRepository,
  TeamRepository,
  TournamentRepository,
  UpdateBracketSeedsInput,
  UpsertNotificationPreferenceInput,
  UploadIdentityDocumentInput,
  RecordDocumentReviewInput,
  UserRepository,
  WaiverRepository,
} from './repository.types.js';
import type { AuthenticatedUser, MatchReport } from '../common/store.js';
import type { UserRole } from '../common/roles.js';

@Injectable()
export class MemoryUserRepository implements UserRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  create(input: CreateUserInput) {
    return this.data.createUser(input);
  }

  findById(userId: string) {
    return this.data.getUserById(userId);
  }

  findByEmail(email: string) {
    return this.data.getUserByEmail(email);
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.data.updateUserPassword(userId, passwordHash);
  }
}

@Injectable()
export class MemoryAuthSessionRepository implements AuthSessionRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  createRefreshSession(input: CreateRefreshSessionInput) {
    return this.data.createRefreshSession(input);
  }

  findRefreshSessionByTokenHash(tokenHash: string) {
    return this.data.findRefreshSessionByTokenHash(tokenHash);
  }

  rotateRefreshSession(input: RotateRefreshSessionInput) {
    return this.data.rotateRefreshSession(input);
  }

  revokeRefreshSession(sessionId: string) {
    return this.data.revokeRefreshSession(sessionId);
  }
}

@Injectable()
export class MemorySchoolRepository implements SchoolRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  create(input: CreateSchoolInput) {
    return this.data.createSchool(input);
  }

  approve(actor: AuthenticatedUser, schoolId: string) {
    return this.data.approveSchool(actor, schoolId);
  }

  inviteUser(actor: AuthenticatedUser, schoolId: string, email: string, role: UserRole = 'coach') {
    return this.data.inviteCoach(actor, schoolId, email, role);
  }

  list() {
    return this.data.listSchools();
  }
}

@Injectable()
export class MemoryAthleteRepository implements AthleteRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  createDraft(actor: AuthenticatedUser, input: CreateAthleteDraftInput) {
    return this.data.createAthleteDraft(actor, input);
  }

  approveIdentity(actor: AuthenticatedUser, athleteId: string) {
    return this.data.approveAthleteIdentity(actor, athleteId);
  }

  findById(athleteId: string) {
    return this.data.getAthleteById(athleteId);
  }

  findWithVerifiedStats(athleteId: string) {
    return this.data.getAthleteWithVerifiedStats(athleteId);
  }

  recordGuardianConsent(
    actor: AuthenticatedUser,
    athleteId: string,
    input: { guardianName: string; relationship: string; consentType?: string },
  ) {
    return this.data.recordGuardianConsent(actor, athleteId, input);
  }

  setPublicProfileStatus(
    actor: AuthenticatedUser,
    athleteId: string,
    status: 'private' | 'public',
  ) {
    return this.data.setAthletePublicProfile(actor, athleteId, status);
  }

  getPublicProfile(athleteId: string) {
    return this.data.getPublicAthleteProfile(athleteId);
  }

  list() {
    return this.data.listAthletes();
  }

  listIds() {
    return this.data.listAthleteIds();
  }
}

@Injectable()
export class MemoryTournamentRepository implements TournamentRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  create(input: CreateTournamentInput) {
    return this.data.createTournament(input);
  }

  approve(actor: AuthenticatedUser, tournamentId: string) {
    return this.data.approveTournament(actor, tournamentId);
  }

  registerSchool(actor: AuthenticatedUser, tournamentId: string, schoolId: string) {
    return this.data.registerSchoolToTournament(actor, tournamentId, schoolId);
  }

  findById(tournamentId: string) {
    return this.data.getTournament(tournamentId);
  }

  list() {
    return this.data.listTournaments();
  }

  getLeaderboard(tournamentId: string, limit?: number) {
    return this.data.getTournamentLeaderboard(tournamentId, limit);
  }
}

@Injectable()
export class MemoryTeamRepository implements TeamRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  create(input: CreateTeamInput) {
    return this.data.createTeam(input);
  }

  approve(actor: AuthenticatedUser, teamId: string) {
    return this.data.approveTeam(actor, teamId);
  }

  findById(teamId: string) {
    return this.data.getTeamById(teamId);
  }

  list(tournamentId?: string, schoolId?: string) {
    return this.data.listTeams(tournamentId, schoolId);
  }
}

@Injectable()
export class MemoryMatchRepository implements MatchRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  create(input: CreateMatchInput) {
    return this.data.createMatch(input);
  }

  submitResult(actor: AuthenticatedUser, matchId: string, report: MatchReport) {
    return this.data.submitMatchResult(actor, matchId, report);
  }

  verify(actor: AuthenticatedUser, matchId: string) {
    return this.data.verifyMatch(actor, matchId);
  }

  submitEvent(actor: AuthenticatedUser, matchId: string, input: CreateMatchEventInput) {
    return this.data.submitMatchEvent(actor, matchId, input);
  }

  correctEvent(
    actor: AuthenticatedUser,
    matchId: string,
    eventId: string,
    input: CorrectMatchEventInput,
  ) {
    return this.data.correctMatchEvent(actor, matchId, eventId, input);
  }

  findById(matchId: string) {
    return this.data.getMatch(matchId);
  }

  list(tournamentId?: string) {
    return this.data.listMatches(tournamentId);
  }

  listEvents(matchId: string) {
    return this.data.listMatchEvents(matchId);
  }

  getDerivedStats(matchId: string) {
    return this.data.getMatchDerivedStats(matchId);
  }
}

@Injectable()
export class MemorySchedulingRepository implements SchedulingRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  createFacility(actor: AuthenticatedUser, input: CreateFacilityInput) {
    return this.data.createFacility(actor, input);
  }

  createVenueUnit(actor: AuthenticatedUser, facilityId: string, input: CreateVenueUnitInput) {
    return this.data.createVenueUnit(actor, facilityId, input);
  }

  listFacilities() {
    return this.data.listFacilities();
  }

  createAvailability(actor: AuthenticatedUser, input: CreateAvailabilityInput) {
    return this.data.createAvailabilityWindow(actor, input);
  }

  listAvailability(filter: AvailabilityFilter) {
    return this.data.listAvailabilityWindows(filter);
  }

  createOfficialProfile(actor: AuthenticatedUser, input: CreateOfficialProfileInput) {
    return this.data.createOfficialProfile(actor, input);
  }

  listOfficialProfiles() {
    return this.data.listOfficialProfiles();
  }

  generateSchedule(actor: AuthenticatedUser, tournamentId: string, input: GenerateScheduleInput) {
    return this.data.generateTournamentSchedule(actor, tournamentId, input);
  }

  overrideMatchSchedule(
    actor: AuthenticatedUser,
    matchId: string,
    input: OverrideMatchScheduleInput,
  ) {
    return this.data.overrideMatchSchedule(actor, matchId, input);
  }

  listTournamentSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.data.listTournamentSchedule(actor, tournamentId);
  }

  publishSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.data.publishTournamentSchedule(actor, tournamentId);
  }

  unpublishSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.data.unpublishTournamentSchedule(actor, tournamentId);
  }

  assignOfficial(actor: AuthenticatedUser, matchId: string, input: AssignOfficialInput) {
    return this.data.assignOfficialToMatch(actor, matchId, input);
  }

  respondToAssignment(
    actor: AuthenticatedUser,
    assignmentId: string,
    input: RespondAssignmentInput,
  ) {
    return this.data.respondToOfficialAssignment(actor, assignmentId, input);
  }

  checkInAssignment(actor: AuthenticatedUser, assignmentId: string) {
    return this.data.checkInOfficialAssignment(actor, assignmentId);
  }

  listNotifications(actor: AuthenticatedUser) {
    return this.data.listScheduleNotifications(actor);
  }

  exportOfficialPayouts(actor: AuthenticatedUser, tournamentId: string) {
    return this.data.exportOfficialPayouts(actor, tournamentId);
  }
}

@Injectable()
export class MemoryCommunicationRepository implements CommunicationRepository {
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
export class MemoryAuditRepository implements AuditRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  list() {
    return this.data.getAuditLogs();
  }

  record(input: Parameters<AuditRepository['record']>[0]) {
    return this.data.recordAuditLog(input);
  }
}

@Injectable()
export class MemoryBillingRepository implements BillingRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  createMembershipPlan(actor: AuthenticatedUser, input: CreateMembershipPlanInput) {
    return this.data.createMembershipPlan(actor, input);
  }

  listMembershipPlans() {
    return this.data.listMembershipPlans();
  }

  createDiscountCode(actor: AuthenticatedUser, input: CreateDiscountCodeInput) {
    return this.data.createDiscountCode(actor, input);
  }

  purchaseSchoolMembership(
    actor: AuthenticatedUser,
    schoolId: string,
    input: PurchaseSchoolMembershipInput,
  ) {
    return this.data.purchaseSchoolMembership(actor, schoolId, input);
  }

  configureTournamentRegistrationFee(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: ConfigureTournamentRegistrationFeeInput,
  ) {
    return this.data.configureTournamentRegistrationFee(actor, tournamentId, input);
  }

  createTournamentRegistrationInvoice(
    actor: AuthenticatedUser,
    tournamentId: string,
    schoolId: string,
    input: CreateTournamentRegistrationInvoiceInput,
  ) {
    return this.data.createTournamentRegistrationInvoice(actor, tournamentId, schoolId, input);
  }

  ensureTournamentRegistrationPaymentSatisfied(tournamentId: string, schoolId: string) {
    return this.data.ensureTournamentRegistrationPaymentSatisfied(tournamentId, schoolId);
  }

  recordManualPayment(
    actor: AuthenticatedUser,
    invoiceId: string,
    input: RecordManualPaymentInput,
  ) {
    return this.data.recordManualPayment(actor, invoiceId, input);
  }

  refundPayment(actor: AuthenticatedUser, paymentId: string, input: RefundPaymentInput) {
    return this.data.refundPayment(actor, paymentId, input);
  }

  getFinanceReport(input: FinanceReportInput) {
    return this.data.getFinanceReport(input);
  }
}

@Injectable()
export class MemoryBracketRepository implements BracketRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  createBracket(actor: AuthenticatedUser, tournamentId: string, input: CreateBracketInput) {
    return this.data.createBracket(actor, tournamentId, input);
  }

  updateSeeds(actor: AuthenticatedUser, bracketId: string, input: UpdateBracketSeedsInput) {
    return this.data.updateBracketSeeds(actor, bracketId, input);
  }

  publishBracket(actor: AuthenticatedUser, bracketId: string) {
    return this.data.publishBracket(actor, bracketId);
  }

  regenerateBracket(actor: AuthenticatedUser, bracketId: string, input: RegenerateBracketInput) {
    return this.data.regenerateBracket(actor, bracketId, input);
  }

  getBracket(actor: AuthenticatedUser, bracketId: string, versionId?: string) {
    return this.data.getBracketView(actor, bracketId, versionId);
  }

  getPublicBracket(slug: string) {
    return this.data.getPublicBracketView(slug);
  }

  listStandings(actor: AuthenticatedUser, bracketId: string, groupKey?: string) {
    return this.data.listBracketStandings(actor, bracketId, groupKey);
  }

  ensureMatchCanBeVerified(matchId: string) {
    return this.data.ensureBracketMatchCanBeVerified(matchId);
  }

  verifyMatchAndAdvance(actor: AuthenticatedUser, matchId: string) {
    return this.data.verifyMatchAndAdvanceBracket(actor, matchId);
  }

  advanceFromVerifiedMatch(actor: AuthenticatedUser, matchId: string) {
    return this.data.advanceBracketFromVerifiedMatch(actor, matchId);
  }
}

@Injectable()
export class MemoryWaiverRepository implements WaiverRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  createWaiverTemplate(actor: AuthenticatedUser, input: CreateWaiverTemplateInput) {
    return this.data.createWaiverTemplate(actor, input);
  }

  createTournamentWaiverRequirement(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: CreateTournamentWaiverRequirementInput,
  ) {
    return this.data.createTournamentWaiverRequirement(actor, tournamentId, input);
  }

  signWaiver(actor: AuthenticatedUser, input: SignWaiverInput) {
    return this.data.signWaiver(actor, input);
  }

  listWaiverSignatures(athleteId: string) {
    return this.data.listWaiverSignatures(athleteId);
  }

  ensureTournamentWaiversSatisfied(input: EnsureTournamentWaiversInput) {
    return this.data.ensureTournamentWaiversSatisfied(input);
  }
}

@Injectable()
export class MemoryDocumentRepository implements DocumentRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  uploadDocument(actor: AuthenticatedUser, input: UploadIdentityDocumentInput) {
    return this.data.createIdentityDocument(actor, input);
  }

  findDocumentById(documentId: string) {
    return this.data.findIdentityDocumentById(documentId);
  }

  extractDocument(
    actor: AuthenticatedUser,
    documentId: string,
    input: ExtractIdentityDocumentInput,
  ) {
    return this.data.extractIdentityDocument(actor, documentId, input);
  }

  createReviewLink(
    actor: AuthenticatedUser,
    documentId: string,
    input: CreateDocumentReviewLinkInput,
  ) {
    return this.data.createDocumentReviewLink(actor, documentId, input);
  }

  resolveReviewLink(actor: AuthenticatedUser, tokenHash: string) {
    return this.data.resolveDocumentReviewLink(actor, tokenHash);
  }

  recordReview(actor: AuthenticatedUser, documentId: string, input: RecordDocumentReviewInput) {
    return this.data.reviewIdentityDocument(actor, documentId, input);
  }

  listReviewQueue(input: ListDocumentReviewQueueInput) {
    return this.data.listDocumentReviewQueue(input);
  }

  listDuplicateCandidates(documentId: string) {
    return this.data.listDocumentDuplicateCandidates(documentId);
  }

  listExpiringDocuments(input: ListExpiringDocumentsInput) {
    return this.data.listExpiringIdentityDocuments(input);
  }

  runExpiryCheck(actor: AuthenticatedUser, input: { before: string }) {
    return this.data.runIdentityDocumentExpiryCheck(actor, input);
  }
}

@Injectable()
export class MemoryQrRepository implements QrRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  createCode(actor: AuthenticatedUser, resourceType: QrResourceType, resourceId: string) {
    return this.data.generateQrCode(actor, resourceType, resourceId);
  }

  findPublicResource(resourceType: QrResourceType, code: string) {
    return this.data.getPublicQr(resourceType, code);
  }

  recordScan(actor: AuthenticatedUser, code: string) {
    return this.data.recordQrScan(actor, code);
  }
}

@Injectable()
export class MemorySyncRepository implements SyncRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  pushMutations(input: PushSyncMutationsInput) {
    return this.data.pushSyncMutations(input);
  }

  listMutations(tenantId: string, clientId: string) {
    return this.data.listSyncMutations(tenantId, clientId);
  }
}

@Injectable()
export class MemorySearchRepository implements SearchRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  search(query: string) {
    return this.data.searchCatalog(query);
  }
}

@Injectable()
export class MemoryAnalyticsRepository implements AnalyticsRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  listSchools() {
    return this.data.listSchools();
  }

  listTournaments() {
    return this.data.listTournaments();
  }

  listTeams(tournamentId?: string, schoolId?: string) {
    return this.data.listTeams(tournamentId, schoolId);
  }

  listAthletes() {
    return this.data.listAthletes();
  }

  listMatches(tournamentId?: string) {
    return this.data.listMatches(tournamentId);
  }

  listMatchEvents(matchId: string) {
    return this.data.listMatchEvents(matchId);
  }

  findTournamentById(tournamentId: string) {
    return this.data.getTournament(tournamentId);
  }

  getTournamentLeaderboard(tournamentId: string, limit?: number) {
    return this.data.getTournamentLeaderboard(tournamentId, limit);
  }

  createReportDraft(input: CreateAnalyticsReportDraftInput) {
    return this.data.createAnalyticsReportDraft(input.actor, {
      reportType: input.reportType,
      scope: input.scope,
      locale: input.locale,
      sections: input.sections,
    });
  }

  approveReportDraft(actor: AuthenticatedUser, draftId: string, note?: string) {
    return this.data.approveAnalyticsReportDraft(actor, draftId, note);
  }

  recordFederationOverride(actor: AuthenticatedUser, input: FederationOverrideInput) {
    return this.data.addFederationOverride(actor, input);
  }
}

@Injectable()
export class MemoryIntegrationRepository implements IntegrationRepository {
  constructor(@Inject(AppDataStore) private readonly data: AppDataStore) {}

  previewSpreadsheetImport(input: SpreadsheetImportPreviewInput) {
    return this.data.createSpreadsheetImportPreview(input.actor, {
      sourceName: input.sourceName,
      entityType: input.entityType,
      rows: input.rows,
    });
  }

  commitSpreadsheetImport(input: CommitSpreadsheetImportInput) {
    return this.data.commitSpreadsheetImport(input.actor, input.importId);
  }

  rollbackSpreadsheetImport(input: RollbackSpreadsheetImportInput) {
    return this.data.rollbackSpreadsheetImport(input.actor, input.importId, input.reason);
  }

  createPartnerApiKey(input: CreatePartnerApiKeyInput) {
    return this.data.createPartnerApiKey(input.actor, {
      partnerName: input.partnerName,
      scopes: input.scopes,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    });
  }

  getPublicTournamentFixtures(tournamentId: string) {
    return Promise.resolve(this.data.getPublicTournamentFixtures(tournamentId));
  }

  getPublicTournamentResults(tournamentId: string) {
    return Promise.resolve(this.data.getPublicTournamentResults(tournamentId));
  }

  createExportBundle(input: CreateExportBundleInput) {
    return this.data.createExportBundle(input.actor, {
      tournamentId: input.tournamentId,
      formats: input.formats,
      include: input.include,
    });
  }

  createWebhookSubscription(input: CreateWebhookSubscriptionInput) {
    return this.data.createWebhookSubscription(input.actor, {
      url: input.url,
      events: input.events,
      ...(input.secretLabel ? { secretLabel: input.secretLabel } : {}),
    });
  }

  createWebhookTestDelivery(input: CreateWebhookTestDeliveryInput) {
    return this.data.createWebhookTestDelivery(input.actor, input.webhookId, input.event);
  }
}
