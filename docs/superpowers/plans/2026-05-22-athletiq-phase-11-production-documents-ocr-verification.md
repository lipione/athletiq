# ATHLETIQ Phase 11 Production Documents, OCR, And Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the Phase 3 text-only OCR stub with a private document pipeline that supports multipart upload, structured extraction, review queues, duplicate detection, identity approval through verified actions, and expiry tracking.

**Architecture:** Keep the current modular NestJS API and repository-switching pattern. Documents get their own repository token and module-level services; memory remains the fast test backend, while PostgreSQL owns production metadata and auditability. File bytes stay behind a private storage adapter boundary; API responses expose document IDs, review tokens, and safe metadata only.

**Tech Stack:** NestJS, Fastify multipart, TypeScript, Drizzle ORM, PostgreSQL JSONB, Vitest, Supertest, SHA-256 hashing, OpenAI Responses API adapter boundary for future vision extraction with Structured Outputs.

---

## Official API Guidance Notes

- OpenAI vision input belongs behind an adapter. The current official OpenAI docs describe the Responses API as supporting text and image inputs, and the vision guide documents image analysis use cases.
- Structured extraction should use Structured Outputs with a JSON Schema rather than free-form JSON, because the official structured-output docs describe schema adherence as the reliability goal. ATHLETIQ should still validate and review results because structured output can still contain wrong extracted values.
- Phase 11 should not require an OpenAI API key in tests. The default test provider is deterministic structured-text extraction; the OpenAI provider can be added behind the same `DocumentExtractionProvider` interface.

Sources checked on 2026-05-22:

- https://platform.openai.com/docs/api-reference/responses
- https://platform.openai.com/docs/guides/vision
- https://platform.openai.com/docs/guides/structured-outputs

## File Map

- Modify `apps/api/package.json`: add `@fastify/multipart`.
- Modify `apps/api/src/main.ts`: register Fastify multipart for production runtime.
- Modify `apps/api/src/documents/documents.module.ts`: import `RepositoryModule`, provide storage and extraction services.
- Replace `apps/api/src/documents/documents.service.ts`: preserve `extract()` for legacy Phase 3 tests and add production document workflow methods.
- Modify `apps/api/src/documents/documents.controller.ts`: keep `POST /documents/ocr/extract`, add upload, extraction, review, duplicate, and expiry routes.
- Create `apps/api/src/documents/document-storage.service.ts`: private local storage adapter with SHA-256 hash and no public file path exposure.
- Create `apps/api/src/documents/document-extraction.provider.ts`: deterministic extraction provider and OpenAI-ready provider interface.
- Modify `apps/api/src/common/store.ts`: add document domain records, memory maps, duplicate detection, review links, review actions, expiry checks, and athlete identity update through document approval.
- Modify `apps/api/src/repositories/repository.types.ts`: add `DOCUMENT_REPOSITORY`, document input/result types, and `DocumentRepository`.
- Modify `apps/api/src/repositories/memory-repositories.ts`: add `MemoryDocumentRepository`.
- Modify `apps/api/src/repositories/postgres-repositories.ts`: add document table mappings and `PostgresDocumentRepository`.
- Modify `apps/api/src/repositories/repository.module.ts`: register memory/postgres document repositories.
- Modify `packages/db/src/schema.ts`: add document tables and indexes.
- Add `packages/db/drizzle/0008_phase_11_documents.sql`: migration for production document tables.
- Add `packages/db/drizzle/meta/0008_snapshot.json` and update `_journal.json`: Drizzle metadata.
- Modify `packages/db/src/schema.test.ts`: assert document tables, tenant FKs, core indexes, private storage fields, and review-link token hashing.
- Add `apps/api/test/phase-11-documents-ocr-verification.spec.ts`: memory acceptance coverage.
- Add `apps/api/test/phase-11-postgres-documents.spec.ts`: guarded live PostgreSQL coverage.
- Modify `apps/api/test/phase-3-intelligence.spec.ts`: keep legacy OCR route expectations intact if response shape changes.
- Modify `README.md`: document private document pipeline, OCR adapter boundary, review queue, duplicate handling, and expiry operations.
- Modify `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`: mark Phase 11 plan/completion when verified.

## Domain Model

Use these record names consistently across memory and PostgreSQL:

```ts
type IdentityDocumentType =
  | 'birth_certificate'
  | 'citizenship'
  | 'school_id'
  | 'medical'
  | 'eligibility_form';

type IdentityDocumentStatus =
  | 'uploaded'
  | 'review_required'
  | 'verified'
  | 'rejected'
  | 'correction_requested'
  | 'expired';

type DocumentReviewAction = 'approve' | 'reject' | 'request_correction' | 'override';
type DocumentMalwareScanStatus = 'pending' | 'clean' | 'blocked';

type ExtractedIdentityFields = {
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
};
```

## Task 1: Phase 11 Acceptance Tests First

**Files:**

- Create: `apps/api/test/phase-11-documents-ocr-verification.spec.ts`
- Modify: `apps/api/test/phase-3-intelligence.spec.ts`

- [x] **Step 1: Add multipart upload and extraction acceptance test**

Test the full memory path:

1. Register a school admin.
2. Create and approve a school.
3. Create a draft athlete.
4. Upload a private `birth_certificate` document using `supertest.attach('file', Buffer.from(...), { filename: 'maya-birth.pdf', contentType: 'application/pdf' })`.
5. Assert the upload response contains `id`, `athleteId`, `schoolId`, `documentType`, `status: 'uploaded'`, `malwareScanStatus: 'clean'`, `sha256Hash`, and does not contain `storageKey` or a filesystem path.
6. Run `POST /api/documents/:documentId/extract`.
7. Assert the extraction returns `status: 'review_required'`, `confidence` below 100 when fields are missing, and field-level `reviewFlags`.

Command:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-11-documents-ocr-verification.spec.ts
```

Expected before implementation: fail with missing upload route.

- [x] **Step 2: Add review-link privacy and expiry test**

In the same spec, create a document review link with a short TTL:

1. `POST /api/documents/:documentId/review-links` as `super_admin`.
2. Assert the response returns a signed review URL and token expiry, but not `tokenHash`.
3. Resolve the token as a school admin from the same school and assert safe metadata is returned.
4. Resolve the token as a different school admin and assert `403`.
5. Create a link with `ttlMinutes: -1` and assert it resolves as expired with `410`.

Expected before implementation: fail with missing route.

- [x] **Step 3: Add duplicate-candidate and verified approval test**

Create two athletes in the same school. Upload/extract documents for both with the same `documentNumber` or same `fullName` plus `dateOfBirth`.

Assert:

- Duplicate candidates are linked to the second document.
- No athlete is merged or overwritten by duplicate detection.
- `POST /api/documents/:documentId/reviews` with `action: 'approve'` updates only the target athlete's identity fields.
- Approval writes an audit log with `document.identity_approved`.
- Rejecting a document does not update athlete identity.

Expected before implementation: fail with missing duplicate/review routes.

- [x] **Step 4: Add expiry tracking test**

Upload/extract/approve an `eligibility_form` with `expiryDate` in the past and another with a future date.

Assert:

- `GET /api/documents/expiring?before=<future-date>` returns the future-expiring document.
- `POST /api/documents/expiry/run` marks the past document `expired`.
- Expiry does not delete the document, extraction, review, or audit history.

Expected before implementation: fail with missing expiry routes.

- [x] **Step 5: Keep legacy OCR endpoint stable**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-3-intelligence.spec.ts
```

Expected: the legacy `POST /api/documents/ocr/extract` test still passes after Phase 11 implementation.

## Task 2: Document Repository Contract And Storage Boundary

**Files:**

- Modify: `apps/api/src/common/store.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Create: `apps/api/src/documents/document-storage.service.ts`
- Create: `apps/api/src/documents/document-extraction.provider.ts`

- [x] **Step 1: Add document record types**

Add the domain model types from this plan to `store.ts`, then add:

- `IdentityDocumentRecord`
- `DocumentExtractionRecord`
- `DocumentReviewFlagRecord`
- `DocumentReviewRecord`
- `DocumentReviewLinkRecord`
- `DocumentDuplicateCandidateRecord`
- `DocumentUploadResult`
- `DocumentReviewQueueItem`
- `DocumentExpiryRunResult`

Rules:

- `IdentityDocumentRecord.storageKey` is internal and must not be returned by controller responses.
- `DocumentReviewLinkRecord.tokenHash` is internal and must not be returned by controller responses.
- `DocumentExtractionRecord.extracted` uses `ExtractedIdentityFields`.
- Duplicate candidates store `reasonCodes: string[]` and `score: number`.

- [x] **Step 2: Add repository token and interface**

Add `DOCUMENT_REPOSITORY` and `DocumentRepository` to `repository.types.ts`.

Minimum methods:

```ts
uploadDocument(actor, input): Promise<DocumentUploadResult>;
extractDocument(actor, documentId, input): Promise<DocumentExtractionRecord>;
createReviewLink(actor, documentId, ttlMinutes): Promise<DocumentReviewLinkRecord>;
resolveReviewLink(actor, token): Promise<DocumentReviewQueueItem>;
recordReview(actor, documentId, input): Promise<DocumentReviewRecord>;
listReviewQueue(input): Promise<DocumentReviewQueueItem[]>;
listDuplicateCandidates(documentId): Promise<DocumentDuplicateCandidateRecord[]>;
listExpiringDocuments(input): Promise<IdentityDocumentRecord[]>;
runExpiryCheck(actor, input): Promise<DocumentExpiryRunResult>;
```

- [x] **Step 3: Add private local storage service**

Implement `DocumentStorageService` with:

- MIME allowlist: `application/pdf`, `image/jpeg`, `image/png`.
- Size limit: 10 MB.
- SHA-256 hashing.
- Storage key format: `documents/<schoolId>/<athleteId>/<documentId>/<sha256>`.
- Test mode keeps bytes in memory or temp storage; responses never expose the key.

- [x] **Step 4: Add deterministic extraction provider**

Implement `DocumentExtractionProvider` and a default structured-text provider that can parse:

```txt
Name: Maya Rai
Date of Birth: 2012-03-14
Document Number: BC-7788
Expiry Date: 2026-12-31
```

Return extracted fields, overall confidence, and review flags for missing key fields. Keep an OpenAI adapter boundary but do not require an API key in tests.

## Task 3: Memory Backend Implementation

**Files:**

- Modify: `apps/api/src/common/store.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/repository.module.ts`

- [x] **Step 1: Add memory maps and upload behavior**

Add maps for documents, extractions, reviews, review links, duplicate candidates, and stored object metadata.

Upload validation:

- Athlete must exist.
- Actor must be `super_admin` or a member of the athlete's school.
- School must match athlete.
- MIME and size must be accepted.
- Malware scan defaults to `clean` for Phase 11.
- Create audit action `document.uploaded`.

- [x] **Step 2: Add extraction and duplicate detection**

Extraction:

- Save one latest extraction per document.
- Set document status to `review_required`.
- Set `expiresAt` from extracted `expiryDate` when present.
- Create audit action `document.extracted`.

Duplicate detection:

- Exact `documentNumber` match gives score 100.
- Same normalized `fullName` plus same `dateOfBirth` gives score 85.
- Same guardian names can add reason codes but must not merge records.
- Save candidates as open links.

- [x] **Step 3: Add review links**

Create opaque random tokens, store only SHA-256 token hashes, and enforce expiry.

Resolve link:

- `super_admin` can resolve all.
- `school_admin` can resolve only documents for their school.
- Expired links throw `GoneException`.

- [x] **Step 4: Add review decisions and athlete update**

Review actions:

- `approve`: requires extraction, marks document `verified`, applies corrected or extracted identity fields to the athlete, and writes `document.identity_approved`.
- `reject`: marks document `rejected`, writes reason.
- `request_correction`: marks document `correction_requested`.
- `override`: requires `overrideReason`, marks `verified`, and writes override metadata.

Only `approve` and `override` may update athlete identity.

- [x] **Step 5: Add expiry operations**

`listExpiringDocuments(before)` returns verified/review-required documents with `expiresAt <= before`.

`runExpiryCheck(before)` marks matching verified documents as `expired` and records `document.expired`.

## Task 4: Documents API Routes

**Files:**

- Modify: `apps/api/package.json`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/documents/documents.module.ts`
- Modify: `apps/api/src/documents/documents.service.ts`
- Modify: `apps/api/src/documents/documents.controller.ts`

- [x] **Step 1: Register multipart**

Install and register `@fastify/multipart`.

Verification:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm install
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api typecheck
```

- [x] **Step 2: Implement upload route**

Add:

```txt
POST /api/documents/athletes/:athleteId/upload
Roles: super_admin, school_admin
Multipart fields: documentType, file
```

Return safe document metadata only.

- [x] **Step 3: Implement extraction route**

Add:

```txt
POST /api/documents/:documentId/extract
Roles: super_admin, school_admin
Body optional: { documentText?: string }
```

The optional `documentText` is test/dev input for deterministic extraction; production OpenAI extraction reads private stored bytes through the provider boundary.

- [x] **Step 4: Implement review queue and review links**

Add:

```txt
GET /api/documents/review-queue?status=review_required&schoolId=...
POST /api/documents/:documentId/review-links
GET /api/documents/review-links/:token
```

Responses must omit `storageKey` and `tokenHash`.

- [x] **Step 5: Implement review decisions, duplicate, and expiry routes**

Add:

```txt
POST /api/documents/:documentId/reviews
GET /api/documents/:documentId/duplicates
GET /api/documents/expiring?before=...
POST /api/documents/expiry/run
```

Use role restrictions:

- `school_admin` can upload, extract, view queue, resolve links, and request correction for their own school.
- `super_admin` can approve, reject, override, create review links, run expiry checks, and view all queues.

## Task 5: PostgreSQL Schema And Migration

**Files:**

- Modify: `packages/db/src/schema.ts`
- Modify: `packages/db/src/schema.test.ts`
- Add: `packages/db/drizzle/0008_phase_11_documents.sql`
- Add: `packages/db/drizzle/meta/0008_snapshot.json`
- Modify: `packages/db/drizzle/meta/_journal.json`

- [x] **Step 1: Add schema tests first**

Extend `schema.test.ts` to assert:

- document tables are exported.
- document tables have `tenant_id` FKs.
- documents link to athletes and schools.
- storage key exists in schema but is not part of public API DTOs.
- review links store `token_hash`, not raw token.
- duplicate candidates uniquely link `document_id` and matched document/athlete candidates.

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C packages/db test
```

Expected before schema implementation: fail.

- [x] **Step 2: Add Drizzle tables**

Tables:

- `identity_documents`
- `document_extractions`
- `document_review_flags`
- `document_reviews`
- `document_review_links`
- `document_duplicate_candidates`

Use JSONB for extracted fields, field confidence, review flags, reason codes, corrections, and review metadata. Add tenant-aware composite foreign keys matching Phase 8 patterns.

- [x] **Step 3: Add migration**

Add `0008_phase_11_documents.sql` with all tables, indexes, unique constraints, and tenant composite FKs. Include indexes on `tenant_id`, `school_id`, `athlete_id`, `status`, `expires_at`, `document_id`, and `token_hash`.

- [x] **Step 4: Update Drizzle metadata**

Update snapshot and journal consistently. Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C packages/db test
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C packages/db typecheck
```

## Task 6: PostgreSQL Repository And Live Tests

**Files:**

- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Add: `apps/api/test/phase-11-postgres-documents.spec.ts`

- [x] **Step 1: Implement Postgres document mappings**

Add row mappers for every document table. Ensure public DTO mapping strips `storageKey` and `tokenHash`.

- [x] **Step 2: Implement Postgres upload/extract/review flows**

Use transactions for:

- document upload plus audit log.
- extraction plus duplicate candidate creation plus status update.
- review decision plus athlete update plus audit log.
- expiry run plus audit logs.

- [x] **Step 3: Add guarded live Postgres tests**

Create `phase-11-postgres-documents.spec.ts` guarded by:

```ts
const describePostgres = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;
```

Cover:

- upload/extract/review/athlete update through PostgreSQL.
- duplicate candidate persistence.
- review link token hash privacy.
- expiry run persistence.

- [x] **Step 4: Run live migration and tests**

```bash
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C packages/db db:migrate
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq ATHLETIQ_DATABASE_E2E=1 ATHLETIQ_DATA_BACKEND=postgres PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-11-postgres-documents.spec.ts
```

## Task 7: Documentation, Self-Review, And Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`
- Modify: `docs/superpowers/plans/2026-05-22-athletiq-phase-11-production-documents-ocr-verification.md`

- [x] **Step 1: Document Phase 11 operations**

README must state:

- uploaded documents are private.
- review URLs are signed and expiring.
- OCR/extraction is not official until human review.
- duplicate candidates are links, not automatic merges.
- expiry checks mark records expired without deleting history.
- OpenAI vision extraction is behind an adapter; deterministic extraction is used for tests/local.

- [x] **Step 2: Run targeted verification**

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api typecheck
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-3-intelligence.spec.ts test/phase-11-documents-ocr-verification.spec.ts
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C packages/db test
```

- [x] **Step 3: Run full verification gate**

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm format:check
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm lint
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm typecheck
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm test
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm build
```

- [x] **Step 4: Mark Phase 11 complete**

Only after targeted, live Postgres, and full verification pass:

- mark every Phase 11 checkbox complete.
- mark the master checklist line `Phase 11 completed with secure document upload, AI OCR, review queues, duplicate checks, and expiry tracking.`

## Self-Review Checklist

- [x] Multipart upload exists and validates MIME and size.
- [x] Public/API responses do not expose raw storage keys.
- [x] Review links expose raw tokens only once and persist token hashes only.
- [x] OCR extraction is saved as draft/review data, never automatically official.
- [x] Approval/override is the only path that updates athlete identity fields.
- [x] Duplicate candidates do not merge athletes or documents automatically.
- [x] Expiry checks mark records, not delete records.
- [x] Memory and PostgreSQL backends implement the same repository contract.
- [x] Legacy `POST /api/documents/ocr/extract` remains compatible.
- [x] Phase 11 tests include permissions, privacy, and audit assertions.
