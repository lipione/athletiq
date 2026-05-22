import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable(
  'tenants',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    type: varchar('type', { length: 32 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('tenants_type_idx').on(table.type),
    index('tenants_created_at_idx').on(table.createdAt),
  ],
);

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    roles: text('roles').array().notNull(),
    schoolIds: text('school_ids').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('users_tenant_id_idx').on(table.tenantId),
    index('users_created_at_idx').on(table.createdAt),
    uniqueIndex('users_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const refreshSessions = pgTable(
  'refresh_sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    tokenHash: varchar('token_hash', { length: 128 }).notNull(),
    familyId: varchar('family_id', { length: 64 }).notNull(),
    rotatedFromSessionId: varchar('rotated_from_session_id', { length: 64 }),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 128 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('refresh_sessions_tenant_id_idx').on(table.tenantId),
    index('refresh_sessions_user_id_idx').on(table.userId),
    index('refresh_sessions_family_id_idx').on(table.familyId),
    index('refresh_sessions_created_at_idx').on(table.createdAt),
    uniqueIndex('refresh_sessions_token_hash_unique').on(table.tokenHash),
  ],
);

export const schools = pgTable(
  'schools',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }),
    status: varchar('status', { length: 24 }).notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    approvedBy: varchar('approved_by', { length: 64 }).references(() => users.id),
    adminUserIds: text('admin_user_ids').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('schools_tenant_id_idx').on(table.tenantId),
    index('schools_created_at_idx').on(table.createdAt),
    uniqueIndex('schools_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const schoolUsers = pgTable(
  'school_users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    role: varchar('role', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    invitedBy: varchar('invited_by', { length: 64 }).references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('school_users_tenant_id_idx').on(table.tenantId),
    index('school_users_school_id_idx').on(table.schoolId),
    index('school_users_user_id_idx').on(table.userId),
    index('school_users_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'school_users_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    uniqueIndex('school_users_school_user_role_unique').on(
      table.schoolId,
      table.userId,
      table.role,
    ),
  ],
);

export const athletes = pgTable(
  'athletes',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    dateOfBirth: varchar('date_of_birth', { length: 64 }),
    gender: varchar('gender', { length: 32 }),
    status: varchar('status', { length: 32 }).notNull(),
    athletiqId: varchar('athletiq_id', { length: 64 }),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    approvedBy: varchar('approved_by', { length: 64 }).references(() => users.id),
    publicProfileStatus: varchar('public_profile_status', { length: 32 })
      .notNull()
      .default('private'),
    guardianConsentRequired: boolean('guardian_consent_required').notNull().default(true),
    guardianConsentGrantedAt: timestamp('guardian_consent_granted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('athletes_tenant_id_idx').on(table.tenantId),
    index('athletes_school_id_idx').on(table.schoolId),
    index('athletes_created_at_idx').on(table.createdAt),
    uniqueIndex('athletes_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'athletes_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    uniqueIndex('athletes_athletiq_id_unique').on(table.athletiqId),
  ],
);

export const guardianConsents = pgTable(
  'guardian_consents',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    guardianName: varchar('guardian_name', { length: 255 }).notNull(),
    relationship: varchar('relationship', { length: 64 }).notNull(),
    consentType: varchar('consent_type', { length: 64 }).notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    recordedBy: varchar('recorded_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('guardian_consents_tenant_id_idx').on(table.tenantId),
    index('guardian_consents_athlete_id_idx').on(table.athleteId),
    index('guardian_consents_school_id_idx').on(table.schoolId),
    index('guardian_consents_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'guardian_consents_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
  ],
);

export const identityDocuments = pgTable(
  'identity_documents',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    documentType: varchar('document_type', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('uploaded'),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256Hash: varchar('sha256_hash', { length: 128 }).notNull(),
    storageKey: text('storage_key').notNull(),
    malwareScanStatus: varchar('malware_scan_status', { length: 32 }).notNull().default('pending'),
    uploadedBy: varchar('uploaded_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: varchar('verified_by', { length: 64 }).references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('identity_documents_tenant_id_idx').on(table.tenantId),
    index('identity_documents_school_id_idx').on(table.schoolId),
    index('identity_documents_athlete_id_idx').on(table.athleteId),
    index('identity_documents_status_idx').on(table.status),
    index('identity_documents_expires_at_idx').on(table.expiresAt),
    index('identity_documents_created_at_idx').on(table.createdAt),
    uniqueIndex('identity_documents_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'identity_documents_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    foreignKey({
      name: 'identity_documents_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
  ],
);

export const documentExtractions = pgTable(
  'document_extractions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    documentId: varchar('document_id', { length: 64 })
      .notNull()
      .references(() => identityDocuments.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    provider: varchar('provider', { length: 64 }).notNull(),
    extracted: jsonb('extracted').notNull(),
    fieldConfidence: jsonb('field_confidence').notNull(),
    reviewFlags: jsonb('review_flags').notNull(),
    overallConfidence: integer('overall_confidence').notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('document_extractions_tenant_id_idx').on(table.tenantId),
    index('document_extractions_document_id_idx').on(table.documentId),
    index('document_extractions_school_id_idx').on(table.schoolId),
    index('document_extractions_athlete_id_idx').on(table.athleteId),
    index('document_extractions_created_at_idx').on(table.createdAt),
    uniqueIndex('document_extractions_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('document_extractions_document_id_unique').on(table.documentId),
    foreignKey({
      name: 'document_extractions_tenant_document_fk',
      columns: [table.tenantId, table.documentId],
      foreignColumns: [identityDocuments.tenantId, identityDocuments.id],
    }),
    foreignKey({
      name: 'document_extractions_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    foreignKey({
      name: 'document_extractions_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
  ],
);

export const documentReviewFlags = pgTable(
  'document_review_flags',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    documentId: varchar('document_id', { length: 64 })
      .notNull()
      .references(() => identityDocuments.id),
    extractionId: varchar('extraction_id', { length: 64 }).references(() => documentExtractions.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    status: varchar('status', { length: 32 }).notNull().default('open'),
    reasonCodes: jsonb('reason_codes').notNull(),
    metadata: jsonb('metadata').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    index('document_review_flags_tenant_id_idx').on(table.tenantId),
    index('document_review_flags_document_id_idx').on(table.documentId),
    index('document_review_flags_school_id_idx').on(table.schoolId),
    index('document_review_flags_athlete_id_idx').on(table.athleteId),
    index('document_review_flags_status_idx').on(table.status),
    index('document_review_flags_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'document_review_flags_tenant_document_fk',
      columns: [table.tenantId, table.documentId],
      foreignColumns: [identityDocuments.tenantId, identityDocuments.id],
    }),
    foreignKey({
      name: 'document_review_flags_tenant_extraction_fk',
      columns: [table.tenantId, table.extractionId],
      foreignColumns: [documentExtractions.tenantId, documentExtractions.id],
    }),
    foreignKey({
      name: 'document_review_flags_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    foreignKey({
      name: 'document_review_flags_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
  ],
);

export const documentReviews = pgTable(
  'document_reviews',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    documentId: varchar('document_id', { length: 64 })
      .notNull()
      .references(() => identityDocuments.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    action: varchar('action', { length: 32 }).notNull(),
    reasonCodes: jsonb('reason_codes').notNull(),
    corrections: jsonb('corrections').notNull(),
    reviewMetadata: jsonb('review_metadata').notNull(),
    reviewedBy: varchar('reviewed_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('document_reviews_tenant_id_idx').on(table.tenantId),
    index('document_reviews_document_id_idx').on(table.documentId),
    index('document_reviews_school_id_idx').on(table.schoolId),
    index('document_reviews_athlete_id_idx').on(table.athleteId),
    index('document_reviews_action_idx').on(table.action),
    index('document_reviews_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'document_reviews_tenant_document_fk',
      columns: [table.tenantId, table.documentId],
      foreignColumns: [identityDocuments.tenantId, identityDocuments.id],
    }),
    foreignKey({
      name: 'document_reviews_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    foreignKey({
      name: 'document_reviews_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
  ],
);

export const documentReviewLinks = pgTable(
  'document_review_links',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    documentId: varchar('document_id', { length: 64 })
      .notNull()
      .references(() => identityDocuments.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    tokenHash: varchar('token_hash', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('document_review_links_tenant_id_idx').on(table.tenantId),
    index('document_review_links_document_id_idx').on(table.documentId),
    index('document_review_links_school_id_idx').on(table.schoolId),
    index('document_review_links_athlete_id_idx').on(table.athleteId),
    index('document_review_links_token_hash_idx').on(table.tokenHash),
    index('document_review_links_expires_at_idx').on(table.expiresAt),
    uniqueIndex('document_review_links_token_hash_unique').on(table.tokenHash),
    foreignKey({
      name: 'document_review_links_tenant_document_fk',
      columns: [table.tenantId, table.documentId],
      foreignColumns: [identityDocuments.tenantId, identityDocuments.id],
    }),
    foreignKey({
      name: 'document_review_links_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    foreignKey({
      name: 'document_review_links_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
  ],
);

export const documentDuplicateCandidates = pgTable(
  'document_duplicate_candidates',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    documentId: varchar('document_id', { length: 64 })
      .notNull()
      .references(() => identityDocuments.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    matchedDocumentId: varchar('matched_document_id', { length: 64 })
      .notNull()
      .references(() => identityDocuments.id),
    matchedAthleteId: varchar('matched_athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    score: integer('score').notNull(),
    reasonCodes: jsonb('reason_codes').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    index('document_duplicate_candidates_tenant_id_idx').on(table.tenantId),
    index('document_duplicate_candidates_document_id_idx').on(table.documentId),
    index('document_duplicate_candidates_school_id_idx').on(table.schoolId),
    index('document_duplicate_candidates_athlete_id_idx').on(table.athleteId),
    index('document_duplicate_candidates_status_idx').on(table.status),
    index('document_duplicate_candidates_created_at_idx').on(table.createdAt),
    uniqueIndex('document_duplicate_candidates_document_match_unique').on(
      table.documentId,
      table.matchedDocumentId,
      table.matchedAthleteId,
    ),
    foreignKey({
      name: 'document_duplicate_candidates_tenant_document_fk',
      columns: [table.tenantId, table.documentId],
      foreignColumns: [identityDocuments.tenantId, identityDocuments.id],
    }),
    foreignKey({
      name: 'document_duplicate_candidates_tenant_matched_document_fk',
      columns: [table.tenantId, table.matchedDocumentId],
      foreignColumns: [identityDocuments.tenantId, identityDocuments.id],
    }),
    foreignKey({
      name: 'document_duplicate_candidates_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    foreignKey({
      name: 'document_duplicate_candidates_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
    foreignKey({
      name: 'document_duplicate_candidates_tenant_matched_athlete_fk',
      columns: [table.tenantId, table.matchedAthleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
  ],
);

export const guardians = pgTable(
  'guardians',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    userId: varchar('user_id', { length: 64 }).references(() => users.id),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 64 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('guardians_tenant_id_idx').on(table.tenantId),
    index('guardians_school_id_idx').on(table.schoolId),
    index('guardians_user_id_idx').on(table.userId),
    index('guardians_created_at_idx').on(table.createdAt),
    uniqueIndex('guardians_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'guardians_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
  ],
);

export const athleteGuardians = pgTable(
  'athlete_guardians',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    guardianId: varchar('guardian_id', { length: 64 })
      .notNull()
      .references(() => guardians.id),
    relationship: varchar('relationship', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('athlete_guardians_tenant_id_idx').on(table.tenantId),
    index('athlete_guardians_athlete_id_idx').on(table.athleteId),
    index('athlete_guardians_guardian_id_idx').on(table.guardianId),
    index('athlete_guardians_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'athlete_guardians_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
    foreignKey({
      name: 'athlete_guardians_tenant_guardian_fk',
      columns: [table.tenantId, table.guardianId],
      foreignColumns: [guardians.tenantId, guardians.id],
    }),
    uniqueIndex('athlete_guardians_athlete_guardian_unique').on(table.athleteId, table.guardianId),
  ],
);

export const tournaments = pgTable(
  'tournaments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    sport: varchar('sport', { length: 128 }).notNull(),
    format: varchar('format', { length: 32 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    approvedBy: varchar('approved_by', { length: 64 }).references(() => users.id),
    maxTeams: integer('max_teams'),
    season: varchar('season', { length: 64 }),
    registrationFeeAmount: integer('registration_fee_amount'),
    registrationFeeCurrency: varchar('registration_fee_currency', { length: 3 }),
    registrationFeeRequiredBeforeApproval: boolean('registration_fee_required_before_approval')
      .notNull()
      .default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    schoolIds: text('school_ids').array().notNull(),
    teamIds: text('team_ids').array().notNull(),
    matchIds: text('match_ids').array().notNull(),
  },
  (table) => [
    index('tournaments_tenant_id_idx').on(table.tenantId),
    index('tournaments_created_at_idx').on(table.createdAt),
    uniqueIndex('tournaments_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const tournamentRegistrations = pgTable(
  'tournament_registrations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    registeredBy: varchar('registered_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    approvedBy: varchar('approved_by', { length: 64 }).references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('tournament_registrations_tenant_id_idx').on(table.tenantId),
    index('tournament_registrations_tournament_id_idx').on(table.tournamentId),
    index('tournament_registrations_school_id_idx').on(table.schoolId),
    index('tournament_registrations_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'tournament_registrations_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    uniqueIndex('tournament_registrations_tournament_school_unique').on(
      table.tournamentId,
      table.schoolId,
    ),
  ],
);

export const membershipPlans = pgTable(
  'membership_plans',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    durationDays: integer('duration_days').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('membership_plans_tenant_id_idx').on(table.tenantId),
    index('membership_plans_created_at_idx').on(table.createdAt),
  ],
);

export const discountCodes = pgTable(
  'discount_codes',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    code: varchar('code', { length: 64 }).notNull(),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('discount_codes_tenant_id_idx').on(table.tenantId),
    index('discount_codes_created_at_idx').on(table.createdAt),
    uniqueIndex('discount_codes_code_unique').on(table.code),
  ],
);

export const invoices = pgTable(
  'invoices',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }).notNull(),
    subtotalAmount: integer('subtotal_amount').notNull(),
    discountAmount: integer('discount_amount').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    paidAmount: integer('paid_amount').notNull().default(0),
    refundedAmount: integer('refunded_amount').notNull().default(0),
    balanceAmount: integer('balance_amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    discountCode: varchar('discount_code', { length: 64 }),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('invoices_tenant_id_idx').on(table.tenantId),
    index('invoices_school_id_idx').on(table.schoolId),
    uniqueIndex('invoices_active_entity_unique')
      .on(table.entityType, table.entityId)
      .where(sql`${table.status} <> 'void'`),
    index('invoices_entity_idx').on(table.entityType, table.entityId),
    index('invoices_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'invoices_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
  ],
);

export const invoiceInstallments = pgTable(
  'invoice_installments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    invoiceId: varchar('invoice_id', { length: 64 })
      .notNull()
      .references(() => invoices.id),
    amount: integer('amount').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    status: varchar('status', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('invoice_installments_tenant_id_idx').on(table.tenantId),
    index('invoice_installments_invoice_id_idx').on(table.invoiceId),
    index('invoice_installments_created_at_idx').on(table.createdAt),
  ],
);

export const schoolMemberships = pgTable(
  'school_memberships',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    planId: varchar('plan_id', { length: 64 })
      .notNull()
      .references(() => membershipPlans.id),
    invoiceId: varchar('invoice_id', { length: 64 })
      .notNull()
      .references(() => invoices.id),
    status: varchar('status', { length: 32 }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('school_memberships_tenant_id_idx').on(table.tenantId),
    index('school_memberships_school_id_idx').on(table.schoolId),
    index('school_memberships_plan_id_idx').on(table.planId),
    index('school_memberships_invoice_id_idx').on(table.invoiceId),
    index('school_memberships_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'school_memberships_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    invoiceId: varchar('invoice_id', { length: 64 })
      .notNull()
      .references(() => invoices.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    method: varchar('method', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    provider: varchar('provider', { length: 64 }).notNull(),
    reference: varchar('reference', { length: 255 }),
    notes: text('notes'),
    approvedBy: varchar('approved_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payments_tenant_id_idx').on(table.tenantId),
    index('payments_invoice_id_idx').on(table.invoiceId),
    index('payments_school_id_idx').on(table.schoolId),
    index('payments_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'payments_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
  ],
);

export const refunds = pgTable(
  'refunds',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    paymentId: varchar('payment_id', { length: 64 })
      .notNull()
      .references(() => payments.id),
    invoiceId: varchar('invoice_id', { length: 64 })
      .notNull()
      .references(() => invoices.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    reason: text('reason'),
    status: varchar('status', { length: 32 }).notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('refunds_tenant_id_idx').on(table.tenantId),
    index('refunds_payment_id_idx').on(table.paymentId),
    index('refunds_invoice_id_idx').on(table.invoiceId),
    index('refunds_school_id_idx').on(table.schoolId),
    index('refunds_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'refunds_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
  ],
);

export const waiverTemplates = pgTable(
  'waiver_templates',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    body: text('body').notNull(),
    version: varchar('version', { length: 64 }).notNull(),
    expiresAfterDays: integer('expires_after_days'),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('waiver_templates_tenant_id_idx').on(table.tenantId),
    index('waiver_templates_created_at_idx').on(table.createdAt),
  ],
);

export const tournamentWaiverRequirements = pgTable(
  'tournament_waiver_requirements',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    waiverTemplateId: varchar('waiver_template_id', { length: 64 })
      .notNull()
      .references(() => waiverTemplates.id),
    requiredFor: varchar('required_for', { length: 32 }).notNull().default('athlete'),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('tournament_waiver_requirements_tenant_id_idx').on(table.tenantId),
    index('tournament_waiver_requirements_tournament_id_idx').on(table.tournamentId),
    index('tournament_waiver_requirements_template_id_idx').on(table.waiverTemplateId),
    index('tournament_waiver_requirements_created_at_idx').on(table.createdAt),
    uniqueIndex('tournament_waiver_requirements_unique').on(
      table.tournamentId,
      table.waiverTemplateId,
    ),
  ],
);

export const waiverSignatures = pgTable(
  'waiver_signatures',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    waiverTemplateId: varchar('waiver_template_id', { length: 64 })
      .notNull()
      .references(() => waiverTemplates.id),
    waiverTemplateVersion: varchar('waiver_template_version', { length: 64 }).notNull(),
    tournamentId: varchar('tournament_id', { length: 64 }).references(() => tournaments.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    guardianName: varchar('guardian_name', { length: 255 }).notNull(),
    relationship: varchar('relationship', { length: 64 }).notNull(),
    signedBy: varchar('signed_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    ipAddress: varchar('ip_address', { length: 128 }).notNull(),
    userAgent: text('user_agent').notNull(),
    signedAt: timestamp('signed_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('waiver_signatures_tenant_id_idx').on(table.tenantId),
    index('waiver_signatures_template_id_idx').on(table.waiverTemplateId),
    index('waiver_signatures_tournament_id_idx').on(table.tournamentId),
    index('waiver_signatures_athlete_id_idx').on(table.athleteId),
    index('waiver_signatures_school_id_idx').on(table.schoolId),
    index('waiver_signatures_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'waiver_signatures_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
    foreignKey({
      name: 'waiver_signatures_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
  ],
);

export const teams = pgTable(
  'teams',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    name: varchar('name', { length: 255 }).notNull(),
    athleteIds: text('athlete_ids').array().notNull(),
    coachUserId: varchar('coach_user_id', { length: 64 }).references(() => users.id),
    status: varchar('status', { length: 24 }).notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('teams_tenant_id_idx').on(table.tenantId),
    index('teams_tournament_id_idx').on(table.tournamentId),
    index('teams_school_id_idx').on(table.schoolId),
    index('teams_created_at_idx').on(table.createdAt),
    uniqueIndex('teams_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'teams_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    uniqueIndex('teams_tournament_school_name_unique').on(
      table.tournamentId,
      table.schoolId,
      table.name,
    ),
  ],
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    teamId: varchar('team_id', { length: 64 })
      .notNull()
      .references(() => teams.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    role: varchar('role', { length: 64 }).notNull().default('player'),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('team_members_tenant_id_idx').on(table.tenantId),
    index('team_members_team_id_idx').on(table.teamId),
    index('team_members_athlete_id_idx').on(table.athleteId),
    index('team_members_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'team_members_tenant_team_fk',
      columns: [table.tenantId, table.teamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
    foreignKey({
      name: 'team_members_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
    uniqueIndex('team_members_team_athlete_unique').on(table.teamId, table.athleteId),
  ],
);

export const matches = pgTable(
  'matches',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    homeTeamId: varchar('home_team_id', { length: 64 })
      .notNull()
      .references(() => teams.id),
    awayTeamId: varchar('away_team_id', { length: 64 })
      .notNull()
      .references(() => teams.id),
    scheduledAt: varchar('scheduled_at', { length: 64 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    report: jsonb('report'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    submittedBy: varchar('submitted_by', { length: 64 }).references(() => users.id),
    verifiedBy: varchar('verified_by', { length: 64 }).references(() => users.id),
    submittedAt: varchar('submitted_at', { length: 64 }),
    verifiedAt: varchar('verified_at', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('matches_tenant_id_idx').on(table.tenantId),
    index('matches_tournament_id_idx').on(table.tournamentId),
    index('matches_home_team_id_idx').on(table.homeTeamId),
    index('matches_away_team_id_idx').on(table.awayTeamId),
    index('matches_created_at_idx').on(table.createdAt),
    uniqueIndex('matches_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const matchEvents = pgTable(
  'match_events',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    matchId: varchar('match_id', { length: 64 })
      .notNull()
      .references(() => matches.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    teamId: varchar('team_id', { length: 64 })
      .notNull()
      .references(() => teams.id),
    type: varchar('type', { length: 64 }).notNull(),
    minute: integer('minute'),
    details: text('details'),
    quantity: integer('quantity').notNull().default(1),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    correctedBy: varchar('corrected_by', { length: 64 }).references(() => users.id),
    correctedAt: timestamp('corrected_at', { withTimezone: true }),
    correctedFromEventId: varchar('corrected_from_event_id', { length: 64 }),
    correctionReason: text('correction_reason'),
    reason: text('reason'),
  },
  (table) => [
    index('match_events_tenant_id_idx').on(table.tenantId),
    index('match_events_match_id_idx').on(table.matchId),
    index('match_events_tournament_id_idx').on(table.tournamentId),
    index('match_events_athlete_id_idx').on(table.athleteId),
    index('match_events_team_id_idx').on(table.teamId),
    index('match_events_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'match_events_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
    foreignKey({
      name: 'match_events_tenant_team_fk',
      columns: [table.tenantId, table.teamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
  ],
);

export const facilities = pgTable(
  'facilities',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }).notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('facilities_tenant_id_idx').on(table.tenantId),
    index('facilities_created_at_idx').on(table.createdAt),
    uniqueIndex('facilities_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const venueUnits = pgTable(
  'venue_units',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    facilityId: varchar('facility_id', { length: 64 })
      .notNull()
      .references(() => facilities.id),
    name: varchar('name', { length: 255 }).notNull(),
    unitType: varchar('unit_type', { length: 32 }).notNull(),
    sports: text('sports').array().notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('venue_units_tenant_id_idx').on(table.tenantId),
    index('venue_units_facility_id_idx').on(table.facilityId),
    index('venue_units_status_idx').on(table.status),
    uniqueIndex('venue_units_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('venue_units_facility_name_unique').on(table.facilityId, table.name),
    foreignKey({
      name: 'venue_units_tenant_facility_fk',
      columns: [table.tenantId, table.facilityId],
      foreignColumns: [facilities.tenantId, facilities.id],
    }),
  ],
);

export const availabilityWindows = pgTable(
  'availability_windows',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    resourceType: varchar('resource_type', { length: 32 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }).notNull(),
    tournamentId: varchar('tournament_id', { length: 64 }).references(() => tournaments.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    reason: text('reason'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('availability_windows_tenant_id_idx').on(table.tenantId),
    index('availability_windows_resource_idx').on(table.resourceType, table.resourceId),
    index('availability_windows_tenant_resource_idx').on(
      table.tenantId,
      table.resourceType,
      table.resourceId,
    ),
    index('availability_windows_tournament_id_idx').on(table.tournamentId),
    index('availability_windows_window_idx').on(table.startsAt, table.endsAt),
    uniqueIndex('availability_windows_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'availability_windows_tenant_tournament_fk',
      columns: [table.tenantId, table.tournamentId],
      foreignColumns: [tournaments.tenantId, tournaments.id],
    }),
  ],
);

export const officialProfiles = pgTable(
  'official_profiles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    sports: text('sports').array().notNull(),
    certificationLevel: varchar('certification_level', { length: 64 }),
    homeSchoolId: varchar('home_school_id', { length: 64 }).references(() => schools.id),
    payoutRate: integer('payout_rate'),
    payoutCurrency: varchar('payout_currency', { length: 16 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('official_profiles_tenant_id_idx').on(table.tenantId),
    index('official_profiles_user_id_idx').on(table.userId),
    index('official_profiles_home_school_id_idx').on(table.homeSchoolId),
    index('official_profiles_status_idx').on(table.status),
    uniqueIndex('official_profiles_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('official_profiles_tenant_user_unique').on(table.tenantId, table.userId),
    foreignKey({
      name: 'official_profiles_tenant_user_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);

export const matchSchedules = pgTable(
  'match_schedules',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    matchId: varchar('match_id', { length: 64 })
      .notNull()
      .references(() => matches.id),
    venueUnitId: varchar('venue_unit_id', { length: 64 })
      .notNull()
      .references(() => venueUnits.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('draft'),
    conflictWarnings: text('conflict_warnings').array().notNull(),
    overrideReason: text('override_reason'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    publishedBy: varchar('published_by', { length: 64 }).references(() => users.id),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('match_schedules_tenant_id_idx').on(table.tenantId),
    index('match_schedules_tournament_status_idx').on(table.tournamentId, table.status),
    index('match_schedules_match_id_idx').on(table.matchId),
    index('match_schedules_venue_window_idx').on(table.venueUnitId, table.startsAt, table.endsAt),
    uniqueIndex('match_schedules_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('match_schedules_match_unique').on(table.matchId),
    foreignKey({
      name: 'match_schedules_tenant_tournament_fk',
      columns: [table.tenantId, table.tournamentId],
      foreignColumns: [tournaments.tenantId, tournaments.id],
    }),
    foreignKey({
      name: 'match_schedules_tenant_match_fk',
      columns: [table.tenantId, table.matchId],
      foreignColumns: [matches.tenantId, matches.id],
    }),
    foreignKey({
      name: 'match_schedules_tenant_venue_unit_fk',
      columns: [table.tenantId, table.venueUnitId],
      foreignColumns: [venueUnits.tenantId, venueUnits.id],
    }),
  ],
);

export const officialAssignments = pgTable(
  'official_assignments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    matchId: varchar('match_id', { length: 64 })
      .notNull()
      .references(() => matches.id),
    officialProfileId: varchar('official_profile_id', { length: 64 })
      .notNull()
      .references(() => officialProfiles.id),
    role: varchar('role', { length: 32 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('proposed'),
    assignedBy: varchar('assigned_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    report: text('report'),
  },
  (table) => [
    index('official_assignments_tenant_id_idx').on(table.tenantId),
    index('official_assignments_match_id_idx').on(table.matchId),
    index('official_assignments_profile_id_idx').on(table.officialProfileId),
    index('official_assignments_status_idx').on(table.status),
    uniqueIndex('official_assignments_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('official_assignments_match_profile_role_unique').on(
      table.matchId,
      table.officialProfileId,
      table.role,
    ),
    foreignKey({
      name: 'official_assignments_tenant_match_fk',
      columns: [table.tenantId, table.matchId],
      foreignColumns: [matches.tenantId, matches.id],
    }),
    foreignKey({
      name: 'official_assignments_tenant_profile_fk',
      columns: [table.tenantId, table.officialProfileId],
      foreignColumns: [officialProfiles.tenantId, officialProfiles.id],
    }),
  ],
);

export const scheduleNotifications = pgTable(
  'schedule_notifications',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    recipientUserId: varchar('recipient_user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    resourceType: varchar('resource_type', { length: 32 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }).notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    message: text('message').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [
    index('schedule_notifications_tenant_id_idx').on(table.tenantId),
    index('schedule_notifications_recipient_status_idx').on(table.recipientUserId, table.status),
    index('schedule_notifications_tournament_id_idx').on(table.tournamentId),
    uniqueIndex('schedule_notifications_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'schedule_notifications_tenant_recipient_fk',
      columns: [table.tenantId, table.recipientUserId],
      foreignColumns: [users.tenantId, users.id],
    }),
    foreignKey({
      name: 'schedule_notifications_tenant_tournament_fk',
      columns: [table.tenantId, table.tournamentId],
      foreignColumns: [tournaments.tenantId, tournaments.id],
    }),
  ],
);

export const officialPayoutExports = pgTable(
  'official_payout_exports',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    officialProfileId: varchar('official_profile_id', { length: 64 })
      .notNull()
      .references(() => officialProfiles.id),
    assignmentIds: text('assignment_ids').array().notNull(),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 16 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('exported'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
  },
  (table) => [
    index('official_payout_exports_tenant_id_idx').on(table.tenantId),
    index('official_payout_exports_tournament_profile_idx').on(
      table.tournamentId,
      table.officialProfileId,
    ),
    uniqueIndex('official_payout_exports_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'official_payout_exports_tenant_tournament_fk',
      columns: [table.tenantId, table.tournamentId],
      foreignColumns: [tournaments.tenantId, tournaments.id],
    }),
    foreignKey({
      name: 'official_payout_exports_tenant_profile_fk',
      columns: [table.tenantId, table.officialProfileId],
      foreignColumns: [officialProfiles.tenantId, officialProfiles.id],
    }),
  ],
);

export const brackets = pgTable(
  'brackets',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    format: varchar('format', { length: 32 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('draft'),
    activeVersionId: varchar('active_version_id', { length: 64 }).notNull(),
    publishedVersionId: varchar('published_version_id', { length: 64 }),
    publicSlug: varchar('public_slug', { length: 128 }),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    publishedBy: varchar('published_by', { length: 64 }).references(() => users.id),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('brackets_tenant_id_idx').on(table.tenantId),
    index('brackets_tournament_id_idx').on(table.tournamentId),
    index('brackets_active_version_id_idx').on(table.activeVersionId),
    index('brackets_published_version_id_idx').on(table.publishedVersionId),
    index('brackets_created_at_idx').on(table.createdAt),
    uniqueIndex('brackets_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('brackets_public_slug_unique').on(table.publicSlug),
    foreignKey({
      name: 'brackets_tenant_tournament_fk',
      columns: [table.tenantId, table.tournamentId],
      foreignColumns: [tournaments.tenantId, tournaments.id],
    }),
  ],
);

export const bracketVersions = pgTable(
  'bracket_versions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    bracketId: varchar('bracket_id', { length: 64 })
      .notNull()
      .references(() => brackets.id),
    versionNumber: integer('version_number').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('draft'),
    generationPolicy: varchar('generation_policy', { length: 32 }).notNull(),
    notes: text('notes'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('bracket_versions_tenant_id_idx').on(table.tenantId),
    index('bracket_versions_bracket_id_idx').on(table.bracketId),
    index('bracket_versions_created_at_idx').on(table.createdAt),
    uniqueIndex('bracket_versions_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('bracket_versions_bracket_version_unique').on(table.bracketId, table.versionNumber),
    foreignKey({
      name: 'bracket_versions_tenant_bracket_fk',
      columns: [table.tenantId, table.bracketId],
      foreignColumns: [brackets.tenantId, brackets.id],
    }),
  ],
);

export const bracketSeeds = pgTable(
  'bracket_seeds',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    bracketId: varchar('bracket_id', { length: 64 })
      .notNull()
      .references(() => brackets.id),
    versionId: varchar('version_id', { length: 64 })
      .notNull()
      .references(() => bracketVersions.id),
    teamId: varchar('team_id', { length: 64 })
      .notNull()
      .references(() => teams.id),
    seedNumber: integer('seed_number').notNull(),
    groupKey: varchar('group_key', { length: 64 }),
    locked: boolean('locked').notNull().default(false),
    withdrawn: boolean('withdrawn').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('bracket_seeds_tenant_id_idx').on(table.tenantId),
    index('bracket_seeds_bracket_id_idx').on(table.bracketId),
    index('bracket_seeds_version_id_idx').on(table.versionId),
    index('bracket_seeds_team_id_idx').on(table.teamId),
    index('bracket_seeds_group_key_idx').on(table.groupKey),
    uniqueIndex('bracket_seeds_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('bracket_seeds_version_seed_unique').on(table.versionId, table.seedNumber),
    uniqueIndex('bracket_seeds_version_team_unique').on(table.versionId, table.teamId),
    foreignKey({
      name: 'bracket_seeds_tenant_bracket_fk',
      columns: [table.tenantId, table.bracketId],
      foreignColumns: [brackets.tenantId, brackets.id],
    }),
    foreignKey({
      name: 'bracket_seeds_tenant_version_fk',
      columns: [table.tenantId, table.versionId],
      foreignColumns: [bracketVersions.tenantId, bracketVersions.id],
    }),
    foreignKey({
      name: 'bracket_seeds_tenant_team_fk',
      columns: [table.tenantId, table.teamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
  ],
);

export const bracketNodes = pgTable(
  'bracket_nodes',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    bracketId: varchar('bracket_id', { length: 64 })
      .notNull()
      .references(() => brackets.id),
    versionId: varchar('version_id', { length: 64 })
      .notNull()
      .references(() => bracketVersions.id),
    matchId: varchar('match_id', { length: 64 }).references(() => matches.id),
    round: integer('round').notNull(),
    position: integer('position').notNull(),
    bracketSide: varchar('bracket_side', { length: 32 }).notNull(),
    groupKey: varchar('group_key', { length: 64 }),
    homeTeamId: varchar('home_team_id', { length: 64 }).references(() => teams.id),
    awayTeamId: varchar('away_team_id', { length: 64 }).references(() => teams.id),
    winnerTeamId: varchar('winner_team_id', { length: 64 }).references(() => teams.id),
    loserTeamId: varchar('loser_team_id', { length: 64 }).references(() => teams.id),
    homeSeedNumber: integer('home_seed_number'),
    awaySeedNumber: integer('away_seed_number'),
    sourceNodeIds: text('source_node_ids').array().notNull(),
    nextNodeId: varchar('next_node_id', { length: 64 }),
    loserNextNodeId: varchar('loser_next_node_id', { length: 64 }),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    isIfNecessary: boolean('is_if_necessary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('bracket_nodes_tenant_id_idx').on(table.tenantId),
    index('bracket_nodes_bracket_id_idx').on(table.bracketId),
    index('bracket_nodes_version_id_idx').on(table.versionId),
    index('bracket_nodes_match_id_idx').on(table.matchId),
    index('bracket_nodes_next_node_id_idx').on(table.nextNodeId),
    index('bracket_nodes_loser_next_node_id_idx').on(table.loserNextNodeId),
    index('bracket_nodes_version_round_position_idx').on(
      table.versionId,
      table.round,
      table.position,
    ),
    uniqueIndex('bracket_nodes_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('bracket_nodes_version_round_position_unique').on(
      table.versionId,
      table.round,
      table.position,
      table.bracketSide,
    ),
    foreignKey({
      name: 'bracket_nodes_tenant_bracket_fk',
      columns: [table.tenantId, table.bracketId],
      foreignColumns: [brackets.tenantId, brackets.id],
    }),
    foreignKey({
      name: 'bracket_nodes_tenant_version_fk',
      columns: [table.tenantId, table.versionId],
      foreignColumns: [bracketVersions.tenantId, bracketVersions.id],
    }),
    foreignKey({
      name: 'bracket_nodes_tenant_match_fk',
      columns: [table.tenantId, table.matchId],
      foreignColumns: [matches.tenantId, matches.id],
    }),
    foreignKey({
      name: 'bracket_nodes_tenant_home_team_fk',
      columns: [table.tenantId, table.homeTeamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
    foreignKey({
      name: 'bracket_nodes_tenant_away_team_fk',
      columns: [table.tenantId, table.awayTeamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
    foreignKey({
      name: 'bracket_nodes_tenant_winner_team_fk',
      columns: [table.tenantId, table.winnerTeamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
    foreignKey({
      name: 'bracket_nodes_tenant_loser_team_fk',
      columns: [table.tenantId, table.loserTeamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
  ],
);

export const standingRows = pgTable(
  'standing_rows',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    bracketId: varchar('bracket_id', { length: 64 })
      .notNull()
      .references(() => brackets.id),
    versionId: varchar('version_id', { length: 64 })
      .notNull()
      .references(() => bracketVersions.id),
    groupKey: varchar('group_key', { length: 64 }).notNull(),
    teamId: varchar('team_id', { length: 64 })
      .notNull()
      .references(() => teams.id),
    played: integer('played').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    draws: integer('draws').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    points: integer('points').notNull().default(0),
    goalsFor: integer('goals_for').notNull().default(0),
    goalsAgainst: integer('goals_against').notNull().default(0),
    goalDifference: integer('goal_difference').notNull().default(0),
    disciplinaryPoints: integer('disciplinary_points').notNull().default(0),
    headToHeadPoints: integer('head_to_head_points').notNull().default(0),
    rank: integer('rank').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('standing_rows_tenant_id_idx').on(table.tenantId),
    index('standing_rows_bracket_id_idx').on(table.bracketId),
    index('standing_rows_version_id_idx').on(table.versionId),
    index('standing_rows_team_id_idx').on(table.teamId),
    index('standing_rows_version_group_idx').on(table.versionId, table.groupKey),
    uniqueIndex('standing_rows_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('standing_rows_version_group_team_unique').on(
      table.versionId,
      table.groupKey,
      table.teamId,
    ),
    foreignKey({
      name: 'standing_rows_tenant_bracket_fk',
      columns: [table.tenantId, table.bracketId],
      foreignColumns: [brackets.tenantId, brackets.id],
    }),
    foreignKey({
      name: 'standing_rows_tenant_version_fk',
      columns: [table.tenantId, table.versionId],
      foreignColumns: [bracketVersions.tenantId, bracketVersions.id],
    }),
    foreignKey({
      name: 'standing_rows_tenant_team_fk',
      columns: [table.tenantId, table.teamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
  ],
);

export const qrCodes = pgTable(
  'qr_codes',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    code: varchar('code', { length: 255 }).notNull(),
    resourceType: varchar('resource_type', { length: 32 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }).notNull(),
    schoolId: varchar('school_id', { length: 64 }).references(() => schools.id),
    tournamentId: varchar('tournament_id', { length: 64 }).references(() => tournaments.id),
    matchId: varchar('match_id', { length: 64 }).references(() => matches.id),
    teamId: varchar('team_id', { length: 64 }).references(() => teams.id),
    athleteId: varchar('athlete_id', { length: 64 }).references(() => athletes.id),
    revoked: boolean('revoked').notNull().default(false),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('qr_codes_tenant_id_idx').on(table.tenantId),
    index('qr_codes_school_id_idx').on(table.schoolId),
    index('qr_codes_tournament_id_idx').on(table.tournamentId),
    index('qr_codes_match_id_idx').on(table.matchId),
    index('qr_codes_team_id_idx').on(table.teamId),
    index('qr_codes_athlete_id_idx').on(table.athleteId),
    index('qr_codes_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'qr_codes_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    foreignKey({
      name: 'qr_codes_tenant_tournament_fk',
      columns: [table.tenantId, table.tournamentId],
      foreignColumns: [tournaments.tenantId, tournaments.id],
    }),
    foreignKey({
      name: 'qr_codes_tenant_match_fk',
      columns: [table.tenantId, table.matchId],
      foreignColumns: [matches.tenantId, matches.id],
    }),
    foreignKey({
      name: 'qr_codes_tenant_team_fk',
      columns: [table.tenantId, table.teamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
    foreignKey({
      name: 'qr_codes_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
    uniqueIndex('qr_codes_code_unique').on(table.code),
  ],
);

export const syncMutations = pgTable(
  'sync_mutations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    clientId: varchar('client_id', { length: 128 }).notNull(),
    mutationId: varchar('mutation_id', { length: 128 }).notNull(),
    actorUserId: varchar('actor_user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    status: varchar('status', { length: 32 }).notNull(),
    mutationType: varchar('mutation_type', { length: 128 }).notNull(),
    mutationPayload: jsonb('mutation_payload').notNull(),
    errorReason: text('error_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sync_mutations_tenant_id_idx').on(table.tenantId),
    index('sync_mutations_client_id_idx').on(table.clientId),
    index('sync_mutations_created_at_idx').on(table.createdAt),
    uniqueIndex('sync_mutations_tenant_client_mutation_unique').on(
      table.tenantId,
      table.clientId,
      table.mutationId,
    ),
  ],
);

export const federationOverrides = pgTable(
  'federation_overrides',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    scope: varchar('scope', { length: 64 }).notNull(),
    targetId: varchar('target_id', { length: 64 }).notNull(),
    field: varchar('field', { length: 128 }).notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata'),
    actorUserId: varchar('actor_user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('federation_overrides_tenant_id_idx').on(table.tenantId),
    index('federation_overrides_target_id_idx').on(table.targetId),
    index('federation_overrides_created_at_idx').on(table.createdAt),
  ],
);

export const guardianAthleteLinks = pgTable(
  'guardian_athlete_links',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    guardianUserId: varchar('guardian_user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    athleteId: varchar('athlete_id', { length: 64 })
      .notNull()
      .references(() => athletes.id),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    relationship: varchar('relationship', { length: 64 }).notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('guardian_athlete_links_tenant_id_idx').on(table.tenantId),
    index('guardian_athlete_links_guardian_user_id_idx').on(table.guardianUserId),
    index('guardian_athlete_links_athlete_id_idx').on(table.athleteId),
    index('guardian_athlete_links_school_id_idx').on(table.schoolId),
    uniqueIndex('guardian_athlete_links_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('guardian_athlete_links_guardian_athlete_unique').on(
      table.guardianUserId,
      table.athleteId,
    ),
    foreignKey({
      name: 'guardian_athlete_links_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
    foreignKey({
      name: 'guardian_athlete_links_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
  ],
);

export const announcements = pgTable(
  'announcements',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    priority: varchar('priority', { length: 32 }).notNull().default('normal'),
    locale: varchar('locale', { length: 16 }).notNull().default('en'),
    target: jsonb('target').notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('announcements_tenant_id_idx').on(table.tenantId),
    index('announcements_category_idx').on(table.category),
    index('announcements_created_at_idx').on(table.createdAt),
    uniqueIndex('announcements_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    channel: varchar('channel', { length: 32 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    enabled: boolean('enabled').notNull(),
    locale: varchar('locale', { length: 16 }).notNull().default('en'),
    quietHoursStart: varchar('quiet_hours_start', { length: 16 }),
    quietHoursEnd: varchar('quiet_hours_end', { length: 16 }),
    updatedBy: varchar('updated_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notification_preferences_tenant_id_idx').on(table.tenantId),
    index('notification_preferences_user_id_idx').on(table.userId),
    uniqueIndex('notification_preferences_user_channel_category_unique').on(
      table.userId,
      table.channel,
      table.category,
    ),
  ],
);

export const communicationTemplates = pgTable(
  'communication_templates',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    key: varchar('key', { length: 128 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    required: boolean('required').notNull().default(false),
    variants: jsonb('variants').notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('communication_templates_tenant_id_idx').on(table.tenantId),
    index('communication_templates_category_idx').on(table.category),
    uniqueIndex('communication_templates_tenant_id_id_unique').on(table.tenantId, table.id),
    uniqueIndex('communication_templates_tenant_key_unique').on(table.tenantId, table.key),
  ],
);

export const communicationNotifications = pgTable(
  'communication_notifications',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    recipientUserId: varchar('recipient_user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    category: varchar('category', { length: 64 }).notNull(),
    channel: varchar('channel', { length: 32 }).notNull(),
    locale: varchar('locale', { length: 16 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    body: text('body').notNull(),
    required: boolean('required').notNull().default(false),
    resourceType: varchar('resource_type', { length: 64 }),
    resourceId: varchar('resource_id', { length: 64 }),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [
    index('communication_notifications_tenant_id_idx').on(table.tenantId),
    index('communication_notifications_recipient_idx').on(table.recipientUserId),
    index('communication_notifications_status_idx').on(table.status),
    uniqueIndex('communication_notifications_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    notificationId: varchar('notification_id', { length: 64 })
      .notNull()
      .references(() => communicationNotifications.id),
    channel: varchar('channel', { length: 32 }).notNull(),
    provider: varchar('provider', { length: 32 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    attempt: integer('attempt').notNull().default(0),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notification_deliveries_tenant_id_idx').on(table.tenantId),
    index('notification_deliveries_notification_id_idx').on(table.notificationId),
    index('notification_deliveries_status_idx').on(table.status),
    foreignKey({
      name: 'notification_deliveries_tenant_notification_fk',
      columns: [table.tenantId, table.notificationId],
      foreignColumns: [communicationNotifications.tenantId, communicationNotifications.id],
    }),
  ],
);

export const conversationThreads = pgTable(
  'conversation_threads',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    title: varchar('title', { length: 255 }).notNull(),
    schoolId: varchar('school_id', { length: 64 })
      .notNull()
      .references(() => schools.id),
    teamId: varchar('team_id', { length: 64 }).references(() => teams.id),
    athleteId: varchar('athlete_id', { length: 64 }).references(() => athletes.id),
    participantUserIds: text('participant_user_ids').array().notNull(),
    status: varchar('status', { length: 32 }).notNull().default('open'),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('conversation_threads_tenant_id_idx').on(table.tenantId),
    index('conversation_threads_school_status_idx').on(table.schoolId, table.status),
    index('conversation_threads_created_at_idx').on(table.createdAt),
    uniqueIndex('conversation_threads_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'conversation_threads_tenant_school_fk',
      columns: [table.tenantId, table.schoolId],
      foreignColumns: [schools.tenantId, schools.id],
    }),
    foreignKey({
      name: 'conversation_threads_tenant_team_fk',
      columns: [table.tenantId, table.teamId],
      foreignColumns: [teams.tenantId, teams.id],
    }),
    foreignKey({
      name: 'conversation_threads_tenant_athlete_fk',
      columns: [table.tenantId, table.athleteId],
      foreignColumns: [athletes.tenantId, athletes.id],
    }),
  ],
);

export const threadMessages = pgTable(
  'thread_messages',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    threadId: varchar('thread_id', { length: 64 })
      .notNull()
      .references(() => conversationThreads.id),
    authorUserId: varchar('author_user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('visible'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenBy: varchar('hidden_by', { length: 64 }).references(() => users.id),
    moderationReason: text('moderation_reason'),
  },
  (table) => [
    index('thread_messages_tenant_id_idx').on(table.tenantId),
    index('thread_messages_thread_id_idx').on(table.threadId),
    index('thread_messages_created_at_idx').on(table.createdAt),
    uniqueIndex('thread_messages_tenant_id_id_unique').on(table.tenantId, table.id),
    foreignKey({
      name: 'thread_messages_tenant_thread_fk',
      columns: [table.tenantId, table.threadId],
      foreignColumns: [conversationThreads.tenantId, conversationThreads.id],
    }),
  ],
);

export const messageModerationActions = pgTable(
  'message_moderation_actions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    threadId: varchar('thread_id', { length: 64 })
      .notNull()
      .references(() => conversationThreads.id),
    messageId: varchar('message_id', { length: 64 })
      .notNull()
      .references(() => threadMessages.id),
    action: varchar('action', { length: 32 }).notNull(),
    reason: text('reason').notNull(),
    actedBy: varchar('acted_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    actedAt: timestamp('acted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('message_moderation_actions_tenant_id_idx').on(table.tenantId),
    index('message_moderation_actions_thread_id_idx').on(table.threadId),
    index('message_moderation_actions_message_id_idx').on(table.messageId),
    foreignKey({
      name: 'message_moderation_actions_tenant_thread_fk',
      columns: [table.tenantId, table.threadId],
      foreignColumns: [conversationThreads.tenantId, conversationThreads.id],
    }),
    foreignKey({
      name: 'message_moderation_actions_tenant_message_fk',
      columns: [table.tenantId, table.messageId],
      foreignColumns: [threadMessages.tenantId, threadMessages.id],
    }),
  ],
);

export const analyticsReportDrafts = pgTable(
  'analytics_report_drafts',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    reportType: varchar('report_type', { length: 64 }).notNull(),
    scope: varchar('scope', { length: 128 }).notNull(),
    locale: varchar('locale', { length: 16 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    requiresApproval: boolean('requires_approval').notNull().default(true),
    sections: jsonb('sections').notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    approvedBy: varchar('approved_by', { length: 64 }).references(() => users.id),
    approvalNote: text('approval_note'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('analytics_report_drafts_tenant_id_idx').on(table.tenantId),
    index('analytics_report_drafts_status_idx').on(table.status),
    index('analytics_report_drafts_created_at_idx').on(table.createdAt),
    uniqueIndex('analytics_report_drafts_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const spreadsheetImports = pgTable(
  'spreadsheet_imports',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    sourceName: varchar('source_name', { length: 255 }).notNull(),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    totalRows: integer('total_rows').notNull(),
    validRows: integer('valid_rows').notNull(),
    invalidRows: integer('invalid_rows').notNull(),
    errors: jsonb('errors').notNull(),
    rows: jsonb('rows').notNull(),
    committedRows: integer('committed_rows'),
    committedBy: varchar('committed_by', { length: 64 }).references(() => users.id),
    committedAt: timestamp('committed_at', { withTimezone: true }),
    rollbackReason: text('rollback_reason'),
    rolledBackBy: varchar('rolled_back_by', { length: 64 }).references(() => users.id),
    rolledBackAt: timestamp('rolled_back_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('spreadsheet_imports_tenant_id_idx').on(table.tenantId),
    index('spreadsheet_imports_status_idx').on(table.status),
    index('spreadsheet_imports_created_at_idx').on(table.createdAt),
    uniqueIndex('spreadsheet_imports_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const partnerApiKeys = pgTable(
  'partner_api_keys',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    partnerName: varchar('partner_name', { length: 255 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 32 }).notNull(),
    secretHash: varchar('secret_hash', { length: 128 }).notNull(),
    scopes: text('scopes').array().notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('partner_api_keys_tenant_id_idx').on(table.tenantId),
    index('partner_api_keys_status_idx').on(table.status),
    uniqueIndex('partner_api_keys_key_prefix_unique').on(table.keyPrefix),
  ],
);

export const exportBundles = pgTable(
  'export_bundles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    tournamentId: varchar('tournament_id', { length: 64 })
      .notNull()
      .references(() => tournaments.id),
    formats: text('formats').array().notNull(),
    include: text('include').array().notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    downloadUrl: text('download_url').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('export_bundles_tenant_id_idx').on(table.tenantId),
    index('export_bundles_tournament_id_idx').on(table.tournamentId),
    index('export_bundles_expires_at_idx').on(table.expiresAt),
    foreignKey({
      name: 'export_bundles_tenant_tournament_fk',
      columns: [table.tenantId, table.tournamentId],
      foreignColumns: [tournaments.tenantId, tournaments.id],
    }),
  ],
);

export const webhookSubscriptions = pgTable(
  'webhook_subscriptions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    url: text('url').notNull(),
    events: text('events').array().notNull(),
    secretLabel: varchar('secret_label', { length: 128 }),
    status: varchar('status', { length: 32 }).notNull(),
    createdBy: varchar('created_by', { length: 64 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('webhook_subscriptions_tenant_id_idx').on(table.tenantId),
    index('webhook_subscriptions_status_idx').on(table.status),
    uniqueIndex('webhook_subscriptions_tenant_id_id_unique').on(table.tenantId, table.id),
  ],
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    webhookId: varchar('webhook_id', { length: 64 })
      .notNull()
      .references(() => webhookSubscriptions.id),
    event: varchar('event', { length: 128 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    attempt: integer('attempt').notNull(),
    responseCode: integer('response_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('webhook_deliveries_tenant_id_idx').on(table.tenantId),
    index('webhook_deliveries_webhook_id_idx').on(table.webhookId),
    index('webhook_deliveries_created_at_idx').on(table.createdAt),
    foreignKey({
      name: 'webhook_deliveries_tenant_webhook_fk',
      columns: [table.tenantId, table.webhookId],
      foreignColumns: [webhookSubscriptions.tenantId, webhookSubscriptions.id],
    }),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    actorUserId: varchar('actor_user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    action: varchar('action', { length: 128 }).notNull(),
    resource: varchar('resource', { length: 64 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }).notNull(),
    metadata: jsonb('metadata').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_tenant_id_idx').on(table.tenantId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ],
);
