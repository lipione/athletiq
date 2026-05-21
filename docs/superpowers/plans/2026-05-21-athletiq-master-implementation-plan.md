# ATHLETIQ Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ATHLETIQ as a verified athlete identity, school sports, tournament intelligence, and grassroots sports infrastructure platform through incremental, testable releases.

**Architecture:** ATHLETIQ starts as a TypeScript monorepo with a modular NestJS backend, Next.js web dashboard, Expo mobile app, PostgreSQL data layer, Redis-backed workers, and S3-compatible file storage. The system stays a modular monolith until operational load proves a module needs to split.

**Tech Stack:** pnpm, Turborepo, TypeScript, Next.js, Expo React Native, NestJS with Fastify, PostgreSQL, Drizzle ORM, Redis, BullMQ, AWS S3, OpenAI vision and structured outputs, Sentry, OpenTelemetry.

---

## Execution Rule

Do not attempt to build the entire platform in one implementation pass.

This master plan defines release order, dependencies, phase outcomes, and acceptance gates. Each phase must have its own code-level implementation plan before code work starts. The detailed Phase 0 plan already exists at:

```txt
docs/superpowers/plans/2026-05-21-athletiq-phase-0-foundation.md
```

## Phase Map

```txt
Phase 0: Foundation
Phase 1: Identity And Schools
Phase 2: Documents And Verification
Phase 3: Football Tournament Core
Phase 4: Football Stats Engine
Phase 5: QR Infrastructure
Phase 6: Offline Mobile
Phase 7: Federation And Analytics
```

## Phase 0: Foundation

**Purpose:** Create the technical base that every later phase depends on.

**Detailed plan:** `docs/superpowers/plans/2026-05-21-athletiq-phase-0-foundation.md`

**Primary deliverables:**

- Monorepo initialized with pnpm and Turborepo.
- Shared TypeScript, lint, formatting, and test configuration.
- NestJS API app with health endpoint.
- Worker app with BullMQ-compatible structure.
- Next.js web app.
- Expo mobile app.
- Shared packages for config, database, shared types, and UI.
- Docker Compose with PostgreSQL and Redis.
- Environment validation.
- CI workflow.

**Exit criteria:**

- `pnpm install` succeeds.
- `pnpm lint` succeeds.
- `pnpm typecheck` succeeds.
- `pnpm test` succeeds.
- `pnpm build` succeeds.
- Local PostgreSQL and Redis start through Docker Compose.
- API health route returns a successful response locally.

## Phase 1: Identity And Schools

**Purpose:** Build the verified identity and school onboarding base.

**Dependencies:** Phase 0.

**Primary backend modules:**

```txt
AuthModule
UserModule
SchoolModule
AthleteModule
GuardianModule
AuditModule
```

**Primary database tables:**

```txt
users
roles
permissions
user_roles
schools
school_users
athletes
athlete_profiles
guardians
athlete_guardians
athlete_ids
audit_logs
```

**Primary deliverables:**

- Email/password auth.
- HttpOnly cookie auth for web.
- Mobile refresh-token flow scaffold.
- Role and permission guard system.
- School creation and approval flow.
- School user invitation flow.
- Athlete draft registration.
- Guardian association.
- ATHLETIQ ID generation after identity approval.
- Audit log service used by identity and school actions.
- Super Admin and School Admin dashboard shells.

**Acceptance tests:**

- A Super Admin can create and approve a school.
- A School Admin can invite a coach.
- A School Admin can create a draft athlete profile.
- A user without permission cannot approve a school.
- ATHLETIQ ID generation does not expose date of birth, gender, province, or school.
- Every approval writes an audit log row.

**Phase completion commit:**

```bash
git commit -m "feat: add identity and school foundation"
```

## Phase 2: Documents And Verification

**Purpose:** Add document upload, AI-assisted OCR extraction, and human verification.

**Dependencies:** Phase 1.

**Primary backend modules:**

```txt
DocumentModule
VerificationModule
AIModule
AuditModule
```

**Primary worker jobs:**

```txt
document.extract
document.recheck-duplicates
verification.notify-reviewers
```

**Primary database tables:**

```txt
documents
document_extractions
verification_requests
verification_actions
audit_logs
```

**Primary deliverables:**

- Private document upload flow.
- S3 object metadata persistence.
- Signed document view URLs for authorized reviewers.
- OCR queue producer in API.
- OCR worker using OpenAI vision-capable model and structured JSON output.
- Schema validation for extracted fields.
- Duplicate candidate detection.
- Manual review queue.
- Approve, reject, and request-correction actions.
- Athlete profile update only after approval.

**Acceptance tests:**

- A School Admin can upload an athlete document.
- Upload creates a document record and extraction job.
- Worker stores structured extraction output.
- Low-confidence fields are flagged for review.
- Duplicate document number creates a review flag.
- Only authorized reviewers can approve a verification request.
- Approval writes verification action and audit log rows.

**Phase completion commit:**

```bash
git commit -m "feat: add document verification workflow"
```

## Phase 3: Football Tournament Core

**Purpose:** Build the first usable tournament operating system for football.

**Dependencies:** Phase 2.

**Primary backend modules:**

```txt
TournamentModule
TeamModule
MatchModule
SchoolModule
AthleteModule
AuditModule
```

**Primary database tables:**

```txt
tournaments
tournament_divisions
tournament_registrations
teams
team_members
matches
match_officials
match_results
audit_logs
```

**Primary deliverables:**

- Tournament creation for football.
- Single knockout tournament format.
- Round robin tournament format.
- Division/category configuration.
- School team registration.
- Squad selection from verified athletes.
- Fixture generation.
- Match sheet generation.
- Referee assignment.
- Result submission.
- Result verification state machine.
- Tournament dashboard.

**Acceptance tests:**

- A Tournament Organizer can create a football tournament.
- A School Admin can register a school team.
- A team cannot add an unverified athlete to an official squad.
- Single knockout fixture generation produces valid pairings.
- Round robin fixture generation creates every required matchup once.
- A Referee can submit a match result.
- Match result is not official until verified.

**Phase completion commit:**

```bash
git commit -m "feat: add football tournament core"
```

## Phase 4: Football Stats Engine

**Purpose:** Capture official match events and calculate athlete history.

**Dependencies:** Phase 3.

**Primary backend modules:**

```txt
StatsModule
MatchModule
AthleteModule
AnalyticsModule
AuditModule
```

**Primary database tables:**

```txt
match_events
athlete_match_stats
athlete_tournament_stats
match_results
audit_logs
```

**Primary deliverables:**

- Football event schema validation.
- Match event submission.
- Event correction workflow.
- Derived athlete match stats.
- Derived athlete tournament stats.
- Leaderboards.
- Athlete verified performance timeline.
- Result recalculation after corrections.

**Acceptance tests:**

- Goal event increments player and team totals.
- Yellow and red cards are counted separately.
- Correction supersedes old event without deleting audit history.
- Athlete profile shows verified tournament stats.
- Leaderboards recalculate after verified event changes.

**Phase completion commit:**

```bash
git commit -m "feat: add football stats engine"
```

## Phase 5: QR Infrastructure

**Purpose:** Link physical tournament operations to verified digital records.

**Dependencies:** Phase 4.

**Primary backend modules:**

```txt
QRModule
AthleteModule
MatchModule
TeamModule
AuditModule
```

**Primary database tables:**

```txt
qr_codes
athletes
matches
teams
audit_logs
```

**Primary deliverables:**

- Athlete QR code generation.
- Public athlete profile route.
- Match sheet QR code.
- Team check-in QR code.
- QR scan audit events.
- Safe public profile privacy rules.
- Mobile QR scanner integration.

**Acceptance tests:**

- QR code resolves to public athlete profile.
- Public profile does not expose full date of birth, document data, guardian data, address, or private notes.
- Authorized user sees more profile fields after login.
- Match QR opens the correct match sheet.
- Authenticated athlete profile, match sheet, and team check-in QR scans write audit events.

**Phase completion commit:**

```bash
git commit -m "feat: add qr infrastructure"
```

## Phase 6: Offline Mobile

**Purpose:** Make match-day workflows usable in low-connectivity environments.

**Dependencies:** Phase 5.

**Primary app areas:**

```txt
apps/mobile
apps/api/src/sync
packages/shared
```

**Primary database tables:**

```txt
sync_mutations
match_events
match_results
audit_logs
```

**Primary deliverables:**

- Expo SQLite local persistence.
- Local mutation queue.
- Client mutation IDs.
- Device IDs.
- Sync endpoint.
- Offline match event entry.
- Pending, synced, failed, and conflict states.
- Conflict review flow.

**Acceptance tests:**

- Mobile can enter match events while offline.
- Mobile sync submits queued mutations after reconnect.
- Duplicate mutation IDs are idempotent.
- Conflicting match edits are marked for review.
- Failed sync does not erase local data.

**Phase completion commit:**

```bash
git commit -m "feat: add offline match-day mobile sync"
```

## Phase 7: Federation And Analytics

**Purpose:** Add federation and government-facing insight layers after data trust exists.

**Dependencies:** Phase 6.

**Primary backend modules:**

```txt
FederationModule
GovernmentModule
AnalyticsModule
StatsModule
AuditModule
```

**Primary deliverables:**

- Federation dashboard.
- Province and district participation reports.
- Verified athlete counts.
- School participation analytics.
- Tournament analytics.
- Exportable reports.
- Federation dispute and override workflow.
- Read-optimized reporting tables or materialized views.

**Acceptance tests:**

- Federation user sees only authorized federation data.
- Government viewer receives read-only analytics access.
- Participation reports exclude unverified athlete records where official counts require verified identity.
- Exports match dashboard totals.
- Federation override writes an audit log.

**Phase completion commit:**

```bash
git commit -m "feat: add federation analytics"
```

## Cross-Phase Engineering Rules

- Keep the backend modular monolith structure.
- Keep business logic in backend modules, not in frontend apps.
- Treat PostgreSQL as the source of truth.
- Use JSONB only for flexible event, extraction, and metadata payloads.
- Write audit logs for official identity, verification, tournament, and match-state changes.
- Preserve raw match events and derive stats from them.
- Require tests for permission checks and verification state transitions.
- Do not make AI decisions official without human review.
- Do not expose sensitive minor data in public QR profiles.

## Release Strategy

Release internally after Phase 1.

Pilot with one or two schools after Phase 2.

Run a controlled football tournament pilot after Phase 4.

Use Phase 5 QR flows in a real tournament only after privacy review.

Use Phase 6 offline workflows in the field only after duplicate-submission and conflict tests pass.

Federation analytics should wait until enough verified records exist to make reports meaningful.

## Master Verification Checklist

- [ ] Phase 0 plan completed and all foundation commands pass.
- [ ] Phase 1 code-level plan written before identity implementation.
- [ ] Phase 1 completed with auth, schools, athletes, and audit logs.
- [ ] Phase 2 code-level plan written before document implementation.
- [ ] Phase 2 completed with OCR extraction and human verification.
- [ ] Phase 3 code-level plan written before tournament implementation.
- [ ] Phase 3 completed with football tournament workflows.
- [ ] Phase 4 code-level plan written before stats implementation.
- [ ] Phase 4 completed with official match events and athlete stats.
- [ ] Phase 5 code-level plan written before QR implementation.
- [ ] Phase 5 completed with safe public QR profiles.
- [ ] Phase 6 code-level plan written before offline implementation.
- [ ] Phase 6 completed with tested offline sync.
- [ ] Phase 7 code-level plan written before analytics implementation.
- [ ] Phase 7 completed with federation analytics and exports.
