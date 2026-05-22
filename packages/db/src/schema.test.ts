import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  athletes,
  athleteGuardians,
  auditLogs,
  analyticsReportDrafts,
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
  exportBundles,
  facilities,
  federationOverrides,
  guardians,
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
  partnerApiKeys,
  payments,
  qrCodes,
  refunds,
  scheduleNotifications,
  schoolMemberships,
  schoolUsers,
  standingRows,
  schools,
  spreadsheetImports,
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
  webhookDeliveries,
  webhookSubscriptions,
} from './schema.js';

const foreignKeyTargets = (table: PgTable) =>
  getTableConfig(table).foreignKeys.map((foreignKey) => {
    const reference = foreignKey.reference();
    return {
      columns: reference.columns.map((column) => column.name),
      foreignColumns: reference.foreignColumns.map((column) => column.name),
      foreignTable: getTableConfig(reference.foreignTable).name,
    };
  });

const expectForeignKey = (table: PgTable, columns: string[], foreignTable: string) => {
  expect(foreignKeyTargets(table)).toContainEqual({
    columns,
    foreignColumns: ['id'],
    foreignTable,
  });
};

const expectCompositeForeignKey = (
  table: PgTable,
  columns: string[],
  foreignTable: string,
  foreignColumns: string[],
) => {
  expect(foreignKeyTargets(table)).toContainEqual({
    columns,
    foreignColumns,
    foreignTable,
  });
};

const uniqueIndexColumnNames = (table: PgTable, indexName: string) => {
  const indexConfig = getTableConfig(table).indexes.find((candidate) => {
    return candidate.config.name === indexName;
  })?.config;

  expect(indexConfig?.unique).toBe(true);
  return indexConfig?.columns.map((column: { name?: unknown }) => {
    expect(typeof column.name).toBe('string');
    return column.name;
  });
};

const indexColumnNames = (table: PgTable, indexName: string) => {
  const indexConfig = getTableConfig(table).indexes.find((candidate) => {
    return candidate.config.name === indexName;
  })?.config;

  expect(indexConfig).toBeDefined();
  return indexConfig?.columns.map((column: { name?: unknown }) => {
    expect(typeof column.name).toBe('string');
    return column.name;
  });
};

const columnByName = (table: PgTable, columnName: string) => {
  const column = getTableConfig(table).columns.find((candidate) => candidate.name === columnName);
  expect(column).toBeDefined();
  return column;
};

const expectNoColumn = (table: PgTable, columnName: string) => {
  expect(getTableConfig(table).columns.some((candidate) => candidate.name === columnName)).toBe(
    false,
  );
};

describe('database schema exports', () => {
  it('exports tenant-aware core tables', () => {
    expect(tenants).toBeDefined();
    expect(users).toBeDefined();
    expect(schools).toBeDefined();
    expect(schoolUsers).toBeDefined();
    expect(athletes).toBeDefined();
    expect(guardians).toBeDefined();
    expect(athleteGuardians).toBeDefined();
    expect(tournaments).toBeDefined();
    expect(tournamentRegistrations).toBeDefined();
    expect(membershipPlans).toBeDefined();
    expect(discountCodes).toBeDefined();
    expect(invoices).toBeDefined();
    expect(invoiceInstallments).toBeDefined();
    expect(schoolMemberships).toBeDefined();
    expect(payments).toBeDefined();
    expect(refunds).toBeDefined();
    expect(waiverTemplates).toBeDefined();
    expect(tournamentWaiverRequirements).toBeDefined();
    expect(waiverSignatures).toBeDefined();
    expect(identityDocuments).toBeDefined();
    expect(documentExtractions).toBeDefined();
    expect(documentReviewFlags).toBeDefined();
    expect(documentReviews).toBeDefined();
    expect(documentReviewLinks).toBeDefined();
    expect(documentDuplicateCandidates).toBeDefined();
    expect(teams).toBeDefined();
    expect(teamMembers).toBeDefined();
    expect(matches).toBeDefined();
    expect(matchEvents).toBeDefined();
    expect(facilities).toBeDefined();
    expect(venueUnits).toBeDefined();
    expect(availabilityWindows).toBeDefined();
    expect(officialProfiles).toBeDefined();
    expect(matchSchedules).toBeDefined();
    expect(officialAssignments).toBeDefined();
    expect(scheduleNotifications).toBeDefined();
    expect(officialPayoutExports).toBeDefined();
    expect(qrCodes).toBeDefined();
    expect(syncMutations).toBeDefined();
    expect(federationOverrides).toBeDefined();
    expect(analyticsReportDrafts).toBeDefined();
    expect(spreadsheetImports).toBeDefined();
    expect(partnerApiKeys).toBeDefined();
    expect(exportBundles).toBeDefined();
    expect(webhookSubscriptions).toBeDefined();
    expect(webhookDeliveries).toBeDefined();
    expect(auditLogs).toBeDefined();
    expect(brackets).toBeDefined();
    expect(bracketVersions).toBeDefined();
    expect(bracketSeeds).toBeDefined();
    expect(bracketNodes).toBeDefined();
    expect(standingRows).toBeDefined();
  });

  it('links tenant-scoped tables to tenants', () => {
    for (const table of [
      users,
      schools,
      schoolUsers,
      athletes,
      guardians,
      athleteGuardians,
      tournaments,
      tournamentRegistrations,
      membershipPlans,
      discountCodes,
      invoices,
      invoiceInstallments,
      schoolMemberships,
      payments,
      refunds,
      waiverTemplates,
      tournamentWaiverRequirements,
      waiverSignatures,
      identityDocuments,
      documentExtractions,
      documentReviewFlags,
      documentReviews,
      documentReviewLinks,
      documentDuplicateCandidates,
      teams,
      teamMembers,
      matches,
      matchEvents,
      facilities,
      venueUnits,
      availabilityWindows,
      officialProfiles,
      matchSchedules,
      officialAssignments,
      scheduleNotifications,
      officialPayoutExports,
      qrCodes,
      syncMutations,
      federationOverrides,
      analyticsReportDrafts,
      spreadsheetImports,
      partnerApiKeys,
      exportBundles,
      webhookSubscriptions,
      webhookDeliveries,
      auditLogs,
      brackets,
      bracketVersions,
      bracketSeeds,
      bracketNodes,
      standingRows,
    ]) {
      expectForeignKey(table, ['tenant_id'], 'tenants');
    }
  });

  it('links core relation ids to source tables', () => {
    expectForeignKey(schools, ['created_by'], 'users');
    expectForeignKey(athletes, ['school_id'], 'schools');
    expectForeignKey(invoices, ['school_id'], 'schools');
    expectForeignKey(invoiceInstallments, ['invoice_id'], 'invoices');
    expectForeignKey(schoolMemberships, ['plan_id'], 'membership_plans');
    expectForeignKey(schoolMemberships, ['invoice_id'], 'invoices');
    expectForeignKey(payments, ['invoice_id'], 'invoices');
    expectForeignKey(refunds, ['payment_id'], 'payments');
    expectForeignKey(refunds, ['invoice_id'], 'invoices');
    expectForeignKey(tournamentWaiverRequirements, ['tournament_id'], 'tournaments');
    expectForeignKey(tournamentWaiverRequirements, ['waiver_template_id'], 'waiver_templates');
    expectForeignKey(waiverSignatures, ['waiver_template_id'], 'waiver_templates');
    expectForeignKey(waiverSignatures, ['athlete_id'], 'athletes');
    expectForeignKey(identityDocuments, ['school_id'], 'schools');
    expectForeignKey(identityDocuments, ['athlete_id'], 'athletes');
    expectForeignKey(identityDocuments, ['uploaded_by'], 'users');
    expectForeignKey(documentExtractions, ['document_id'], 'identity_documents');
    expectForeignKey(documentReviewFlags, ['document_id'], 'identity_documents');
    expectForeignKey(documentReviewFlags, ['extraction_id'], 'document_extractions');
    expectForeignKey(documentReviews, ['document_id'], 'identity_documents');
    expectForeignKey(documentReviewLinks, ['document_id'], 'identity_documents');
    expectForeignKey(documentDuplicateCandidates, ['document_id'], 'identity_documents');
    expectForeignKey(documentDuplicateCandidates, ['matched_document_id'], 'identity_documents');
    expectForeignKey(documentDuplicateCandidates, ['matched_athlete_id'], 'athletes');
    expectForeignKey(teams, ['tournament_id'], 'tournaments');
    expectForeignKey(teams, ['school_id'], 'schools');
    expectForeignKey(teamMembers, ['team_id'], 'teams');
    expectForeignKey(teamMembers, ['athlete_id'], 'athletes');
    expectForeignKey(matches, ['tournament_id'], 'tournaments');
    expectForeignKey(matches, ['home_team_id'], 'teams');
    expectForeignKey(matches, ['away_team_id'], 'teams');
    expectForeignKey(matchEvents, ['match_id'], 'matches');
    expectForeignKey(matchEvents, ['tournament_id'], 'tournaments');
    expectForeignKey(matchEvents, ['athlete_id'], 'athletes');
    expectForeignKey(matchEvents, ['team_id'], 'teams');
    expectForeignKey(facilities, ['created_by'], 'users');
    expectForeignKey(venueUnits, ['facility_id'], 'facilities');
    expectForeignKey(availabilityWindows, ['tournament_id'], 'tournaments');
    expectForeignKey(officialProfiles, ['user_id'], 'users');
    expectForeignKey(officialProfiles, ['home_school_id'], 'schools');
    expectForeignKey(matchSchedules, ['tournament_id'], 'tournaments');
    expectForeignKey(matchSchedules, ['match_id'], 'matches');
    expectForeignKey(matchSchedules, ['venue_unit_id'], 'venue_units');
    expectForeignKey(officialAssignments, ['match_id'], 'matches');
    expectForeignKey(officialAssignments, ['official_profile_id'], 'official_profiles');
    expectForeignKey(scheduleNotifications, ['recipient_user_id'], 'users');
    expectForeignKey(scheduleNotifications, ['tournament_id'], 'tournaments');
    expectForeignKey(officialPayoutExports, ['tournament_id'], 'tournaments');
    expectForeignKey(officialPayoutExports, ['official_profile_id'], 'official_profiles');
    expectForeignKey(qrCodes, ['created_by'], 'users');
    expectForeignKey(auditLogs, ['actor_user_id'], 'users');
    expectForeignKey(analyticsReportDrafts, ['created_by'], 'users');
    expectForeignKey(analyticsReportDrafts, ['approved_by'], 'users');
    expectForeignKey(spreadsheetImports, ['created_by'], 'users');
    expectForeignKey(spreadsheetImports, ['committed_by'], 'users');
    expectForeignKey(spreadsheetImports, ['rolled_back_by'], 'users');
    expectForeignKey(partnerApiKeys, ['created_by'], 'users');
    expectForeignKey(exportBundles, ['tournament_id'], 'tournaments');
    expectForeignKey(exportBundles, ['created_by'], 'users');
    expectForeignKey(webhookSubscriptions, ['created_by'], 'users');
    expectForeignKey(webhookDeliveries, ['webhook_id'], 'webhook_subscriptions');
    expectForeignKey(brackets, ['tournament_id'], 'tournaments');
    expectForeignKey(brackets, ['created_by'], 'users');
    expectForeignKey(bracketVersions, ['bracket_id'], 'brackets');
    expectForeignKey(bracketVersions, ['created_by'], 'users');
    expectForeignKey(bracketSeeds, ['bracket_id'], 'brackets');
    expectForeignKey(bracketSeeds, ['version_id'], 'bracket_versions');
    expectForeignKey(bracketSeeds, ['team_id'], 'teams');
    expectForeignKey(bracketNodes, ['bracket_id'], 'brackets');
    expectForeignKey(bracketNodes, ['version_id'], 'bracket_versions');
    expectForeignKey(bracketNodes, ['match_id'], 'matches');
    expectForeignKey(standingRows, ['bracket_id'], 'brackets');
    expectForeignKey(standingRows, ['version_id'], 'bracket_versions');
    expectForeignKey(standingRows, ['team_id'], 'teams');
  });

  it('scopes sync mutation idempotency by tenant', () => {
    expect(
      uniqueIndexColumnNames(syncMutations, 'sync_mutations_tenant_client_mutation_unique'),
    ).toEqual(['tenant_id', 'client_id', 'mutation_id']);
    expect(uniqueIndexColumnNames(invoices, 'invoices_active_entity_unique')).toEqual([
      'entity_type',
      'entity_id',
    ]);
  });

  it('requires waiver forensic metadata', () => {
    expect(columnByName(waiverSignatures, 'ip_address')?.notNull).toBe(true);
    expect(columnByName(waiverSignatures, 'user_agent')?.notNull).toBe(true);
  });

  it('defines tenant/id unique keys for tenant-scoped resources', () => {
    expect(uniqueIndexColumnNames(users, 'users_tenant_id_id_unique')).toEqual(['tenant_id', 'id']);
    expect(uniqueIndexColumnNames(schools, 'schools_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(athletes, 'athletes_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(guardians, 'guardians_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(tournaments, 'tournaments_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(teams, 'teams_tenant_id_id_unique')).toEqual(['tenant_id', 'id']);
    expect(uniqueIndexColumnNames(matches, 'matches_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(
      uniqueIndexColumnNames(identityDocuments, 'identity_documents_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
    expect(uniqueIndexColumnNames(brackets, 'brackets_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(bracketVersions, 'bracket_versions_tenant_id_id_unique')).toEqual(
      ['tenant_id', 'id'],
    );
    expect(uniqueIndexColumnNames(bracketSeeds, 'bracket_seeds_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(bracketNodes, 'bracket_nodes_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(standingRows, 'standing_rows_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(facilities, 'facilities_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(uniqueIndexColumnNames(venueUnits, 'venue_units_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(
      uniqueIndexColumnNames(availabilityWindows, 'availability_windows_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
    expect(
      uniqueIndexColumnNames(officialProfiles, 'official_profiles_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
    expect(uniqueIndexColumnNames(matchSchedules, 'match_schedules_tenant_id_id_unique')).toEqual([
      'tenant_id',
      'id',
    ]);
    expect(
      uniqueIndexColumnNames(officialAssignments, 'official_assignments_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
    expect(
      uniqueIndexColumnNames(scheduleNotifications, 'schedule_notifications_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
    expect(
      uniqueIndexColumnNames(officialPayoutExports, 'official_payout_exports_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
    expect(
      uniqueIndexColumnNames(analyticsReportDrafts, 'analytics_report_drafts_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
    expect(
      uniqueIndexColumnNames(spreadsheetImports, 'spreadsheet_imports_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
    expect(
      uniqueIndexColumnNames(webhookSubscriptions, 'webhook_subscriptions_tenant_id_id_unique'),
    ).toEqual(['tenant_id', 'id']);
  });

  it('enforces tenant consistency on school-owned graph relationships', () => {
    expectCompositeForeignKey(schoolUsers, ['tenant_id', 'school_id'], 'schools', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(athletes, ['tenant_id', 'school_id'], 'schools', ['tenant_id', 'id']);
    expectCompositeForeignKey(guardians, ['tenant_id', 'school_id'], 'schools', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(tournamentRegistrations, ['tenant_id', 'school_id'], 'schools', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(invoices, ['tenant_id', 'school_id'], 'schools', ['tenant_id', 'id']);
    expectCompositeForeignKey(schoolMemberships, ['tenant_id', 'school_id'], 'schools', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(payments, ['tenant_id', 'school_id'], 'schools', ['tenant_id', 'id']);
    expectCompositeForeignKey(refunds, ['tenant_id', 'school_id'], 'schools', ['tenant_id', 'id']);
    expectCompositeForeignKey(waiverSignatures, ['tenant_id', 'athlete_id'], 'athletes', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(waiverSignatures, ['tenant_id', 'school_id'], 'schools', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(identityDocuments, ['tenant_id', 'school_id'], 'schools', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(identityDocuments, ['tenant_id', 'athlete_id'], 'athletes', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(
      documentExtractions,
      ['tenant_id', 'document_id'],
      'identity_documents',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(documentExtractions, ['tenant_id', 'school_id'], 'schools', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(documentExtractions, ['tenant_id', 'athlete_id'], 'athletes', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(
      documentReviewFlags,
      ['tenant_id', 'document_id'],
      'identity_documents',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(
      documentReviewFlags,
      ['tenant_id', 'extraction_id'],
      'document_extractions',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(documentReviews, ['tenant_id', 'document_id'], 'identity_documents', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(
      documentReviewLinks,
      ['tenant_id', 'document_id'],
      'identity_documents',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(
      documentDuplicateCandidates,
      ['tenant_id', 'document_id'],
      'identity_documents',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(
      documentDuplicateCandidates,
      ['tenant_id', 'matched_document_id'],
      'identity_documents',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(
      documentDuplicateCandidates,
      ['tenant_id', 'matched_athlete_id'],
      'athletes',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(teams, ['tenant_id', 'school_id'], 'schools', ['tenant_id', 'id']);
    expectCompositeForeignKey(teamMembers, ['tenant_id', 'team_id'], 'teams', ['tenant_id', 'id']);
    expectCompositeForeignKey(teamMembers, ['tenant_id', 'athlete_id'], 'athletes', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(matchEvents, ['tenant_id', 'athlete_id'], 'athletes', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(matchEvents, ['tenant_id', 'team_id'], 'teams', ['tenant_id', 'id']);
    expectCompositeForeignKey(venueUnits, ['tenant_id', 'facility_id'], 'facilities', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(availabilityWindows, ['tenant_id', 'tournament_id'], 'tournaments', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(officialProfiles, ['tenant_id', 'user_id'], 'users', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(matchSchedules, ['tenant_id', 'tournament_id'], 'tournaments', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(matchSchedules, ['tenant_id', 'match_id'], 'matches', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(matchSchedules, ['tenant_id', 'venue_unit_id'], 'venue_units', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(officialAssignments, ['tenant_id', 'match_id'], 'matches', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(
      officialAssignments,
      ['tenant_id', 'official_profile_id'],
      'official_profiles',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(scheduleNotifications, ['tenant_id', 'recipient_user_id'], 'users', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(
      scheduleNotifications,
      ['tenant_id', 'tournament_id'],
      'tournaments',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(
      officialPayoutExports,
      ['tenant_id', 'tournament_id'],
      'tournaments',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(exportBundles, ['tenant_id', 'tournament_id'], 'tournaments', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(
      webhookDeliveries,
      ['tenant_id', 'webhook_id'],
      'webhook_subscriptions',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(
      officialPayoutExports,
      ['tenant_id', 'official_profile_id'],
      'official_profiles',
      ['tenant_id', 'id'],
    );
    expectCompositeForeignKey(brackets, ['tenant_id', 'tournament_id'], 'tournaments', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketVersions, ['tenant_id', 'bracket_id'], 'brackets', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketSeeds, ['tenant_id', 'bracket_id'], 'brackets', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketSeeds, ['tenant_id', 'version_id'], 'bracket_versions', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketSeeds, ['tenant_id', 'team_id'], 'teams', ['tenant_id', 'id']);
    expectCompositeForeignKey(bracketNodes, ['tenant_id', 'bracket_id'], 'brackets', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketNodes, ['tenant_id', 'version_id'], 'bracket_versions', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketNodes, ['tenant_id', 'match_id'], 'matches', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketNodes, ['tenant_id', 'home_team_id'], 'teams', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketNodes, ['tenant_id', 'away_team_id'], 'teams', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketNodes, ['tenant_id', 'winner_team_id'], 'teams', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(bracketNodes, ['tenant_id', 'loser_team_id'], 'teams', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(standingRows, ['tenant_id', 'bracket_id'], 'brackets', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(standingRows, ['tenant_id', 'version_id'], 'bracket_versions', [
      'tenant_id',
      'id',
    ]);
    expectCompositeForeignKey(standingRows, ['tenant_id', 'team_id'], 'teams', ['tenant_id', 'id']);
  });

  it('keeps document storage and review links private at the schema boundary', () => {
    expect(columnByName(identityDocuments, 'storage_key')?.notNull).toBe(true);
    expect(columnByName(identityDocuments, 'sha256_hash')?.notNull).toBe(true);
    expect(columnByName(documentReviewLinks, 'token_hash')?.notNull).toBe(true);
    expectNoColumn(documentReviewLinks, 'token');

    expect(indexColumnNames(documentReviewLinks, 'document_review_links_token_hash_idx')).toEqual([
      'token_hash',
    ]);
    expect(
      uniqueIndexColumnNames(documentReviewLinks, 'document_review_links_token_hash_unique'),
    ).toEqual(['token_hash']);
  });

  it('indexes document queues and uniquely records duplicate candidates', () => {
    expect(indexColumnNames(identityDocuments, 'identity_documents_status_idx')).toEqual([
      'status',
    ]);
    expect(indexColumnNames(identityDocuments, 'identity_documents_expires_at_idx')).toEqual([
      'expires_at',
    ]);
    expect(indexColumnNames(documentExtractions, 'document_extractions_document_id_idx')).toEqual([
      'document_id',
    ]);
    expect(
      uniqueIndexColumnNames(
        documentDuplicateCandidates,
        'document_duplicate_candidates_document_match_unique',
      ),
    ).toEqual(['document_id', 'matched_document_id', 'matched_athlete_id']);
  });

  it('defines bracket publication and public slug constraints', () => {
    expect(columnByName(brackets, 'published_version_id')).toBeDefined();
    expect(columnByName(brackets, 'public_slug')).toBeDefined();
    expect(uniqueIndexColumnNames(brackets, 'brackets_public_slug_unique')).toEqual([
      'public_slug',
    ]);
    expect(
      uniqueIndexColumnNames(bracketVersions, 'bracket_versions_bracket_version_unique'),
    ).toEqual(['bracket_id', 'version_number']);
  });

  it('indexes bracket seeds, nodes, and standing rows for bracket reads', () => {
    expect(indexColumnNames(brackets, 'brackets_tenant_id_idx')).toEqual(['tenant_id']);
    expect(indexColumnNames(brackets, 'brackets_tournament_id_idx')).toEqual(['tournament_id']);
    expect(indexColumnNames(bracketVersions, 'bracket_versions_bracket_id_idx')).toEqual([
      'bracket_id',
    ]);
    expect(indexColumnNames(bracketSeeds, 'bracket_seeds_version_id_idx')).toEqual(['version_id']);
    expect(indexColumnNames(bracketNodes, 'bracket_nodes_version_id_idx')).toEqual(['version_id']);
    expect(indexColumnNames(bracketNodes, 'bracket_nodes_match_id_idx')).toEqual(['match_id']);
    expect(indexColumnNames(standingRows, 'standing_rows_version_group_idx')).toEqual([
      'version_id',
      'group_key',
    ]);
    expect(uniqueIndexColumnNames(bracketSeeds, 'bracket_seeds_version_seed_unique')).toEqual([
      'version_id',
      'seed_number',
    ]);
    expect(uniqueIndexColumnNames(standingRows, 'standing_rows_version_group_team_unique')).toEqual(
      ['version_id', 'group_key', 'team_id'],
    );
  });

  it('stores bracket node seed slots and if-necessary metadata', () => {
    expect(columnByName(bracketNodes, 'group_key')).toBeDefined();
    expect(columnByName(bracketNodes, 'home_seed_number')).toBeDefined();
    expect(columnByName(bracketNodes, 'away_seed_number')).toBeDefined();
    expect(columnByName(bracketNodes, 'is_if_necessary')?.notNull).toBe(true);
  });

  it('indexes phase 13 scheduling operations', () => {
    expect(
      indexColumnNames(availabilityWindows, 'availability_windows_tenant_resource_idx'),
    ).toEqual(['tenant_id', 'resource_type', 'resource_id']);
    expect(indexColumnNames(matchSchedules, 'match_schedules_venue_window_idx')).toEqual([
      'venue_unit_id',
      'starts_at',
      'ends_at',
    ]);
    expect(
      uniqueIndexColumnNames(officialProfiles, 'official_profiles_tenant_user_unique'),
    ).toEqual(['tenant_id', 'user_id']);
    expect(
      uniqueIndexColumnNames(officialAssignments, 'official_assignments_match_profile_role_unique'),
    ).toEqual(['match_id', 'official_profile_id', 'role']);
  });
});
