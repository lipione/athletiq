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
Phase 8: Production Data Layer And Tenancy
Phase 9: Production Auth, Security, And Minor Privacy
Phase 10: Registration, Payments, Memberships, And Waivers
Phase 11: Production Document, OCR, And Verification Pipeline
Phase 12: Interactive Bracketing And Competition Engine
Phase 13: Facilities, Officials, And Advanced Scheduling
Phase 14: Enterprise Web Dashboards And Public Site
Phase 15: Mobile Match-Day App And Offline Operations
Phase 16: Communications, Family Experience, And Notifications
Phase 17: Media, Video, Highlights, And Scouting
Phase 18: Advanced Analytics, AI Reports, And Data Products
Phase 19: Integrations, Imports, Exports, And Open APIs
Phase 20: Production Infrastructure, QA, Pilot, And Scale Hardening
```

## Market Review Addendum

**Review date:** 2026-05-22

ATHLETIQ remains correctly positioned as a verified athlete identity and tournament intelligence layer, but mature sports platforms show that the operating system must also include the everyday administrative workflows around registration, fees, scheduling, communication, compliance, and family engagement.

**Systems reviewed:**

- SportsEngine HQ: registration, scheduling, payments, team mobile app, eligibility, memberships, financials, background checks, insurance, waivers, websites, and tournaments.
- TeamSnap ONE: registration, integrated payments, roster-building, scheduling, organization-wide messaging, team chat, parent app, live streaming, highlights, websites, financial reporting, and tournament smart brackets.
- FIFA Connect: unique global person ID, duplicate detection, hashed identifying data, document review, registration history, and electronic player passport patterns.
- PlayMetrics: club operations, programs, payments/refunds, rosters, staff/player profiles, forms, files, field plans, notifications, curriculum, and team formation.
- PlayHQ: competition hierarchy, grades/divisions, fixtures, ladders, finals, electronic scoring, public fixtures/results, reports, advanced fixture generation, compliance tracking, and payment reconciliation.
- GameChanger and Hudl: live scoring, video streaming, clips, long-term stats/video history, AI-supported video/data analysis, highlights, and recruiting workflows.
- Aktivate: school/district athletic department needs, eligibility, physicals, fees, injuries, rosters, participation reports, and coach management.
- Challonge: interactive bracket patterns, single elimination, double elimination, round robin, Swiss, two-stage pool-to-finals formats, standings, score reporting, match attachments, printable brackets, embed brackets, bulk participant entry, and admin sharing.

**Capabilities missing from the original plan:**

- Parent and guardian-facing accounts, consent, waivers, communication preferences, and family profiles.
- Payments, invoices, membership plans, refunds, reconciliation, scholarship discounts, and school/federation revenue reports.
- Family fee splitting, installments, offline/manual payments, automated reminders, and outstanding-balance dashboards.
- Compliance workflows for eligibility, physicals, injury logs, safeguarding/background checks, document expiry, and policy attestations.
- Facility and venue management with fields/courts, availability windows, capacity, blackout dates, travel constraints, and schedule optimization.
- Rich interactive bracketing with drag-and-drop seeding, live advancement, two-stage tournaments, placement matches, standings/ladders, tiebreakers, public embeds, and printable brackets.
- Officials management beyond assignment: registration, credentials, availability, conflicts, crew roles, payouts, check-in, post-match reports, and performance notes.
- Organization-wide communication: alerts, team chat, targeted posts, fixture-change notifications, SMS/email/push delivery, translation, and auditability.
- Public site layer for fixtures, ladders, results, safe athlete profiles, tournament pages, school pages, and federation portals.
- Video/media layer for clips, highlight reels, match attachments, review evidence, scouting packages, and future AI analysis.
- Data import, onboarding, migration, and API integration tools for schools/federations moving from spreadsheets or other systems.
- Enterprise admin needs: tenant isolation, support impersonation with audit, billing, feature flags, rate limits, backups, observability, and disaster recovery.
- Support operations: help desk/ticket intake, registration support, bulk exports, downloadable signed waivers, and operator-facing audit trails.

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

## Phase 8: Production Data Layer And Tenancy

**Purpose:** Replace the prototype store with production PostgreSQL-backed persistence and explicit tenant boundaries.

**Dependencies:** Phase 7.

**Primary backend modules:**

```txt
DatabaseModule
TenantModule
RepositoryModule
MigrationModule
SeedModule
```

**Primary deliverables:**

- Replace `AppDataStore` runtime behavior with repository-backed services.
- Normalize users, schools, athletes, guardians, tournaments, teams, matches, events, QR codes, sync mutations, and audit logs.
- Add foreign keys, indexes, unique constraints, check constraints, and migration rollback strategy.
- Add tenant model for school, federation, government, and platform scopes.
- Add request-scoped tenant resolution and tenant-aware query helpers.
- Add seed scripts for local development and staging.
- Add data import staging tables for spreadsheet onboarding.

**Acceptance tests:**

- API tests pass against PostgreSQL, not only in-memory state.
- School users cannot read or mutate another school's tenant-scoped records.
- Federation users only see records linked to their federation scope.
- Duplicate ATHLETIQ IDs, duplicate emails, and duplicate QR codes are rejected at the database layer.
- Audit logs are append-only through service APIs.

**Phase completion commit:**

```bash
git commit -m "feat: add production data layer and tenancy"
```

## Phase 9: Production Auth, Security, And Minor Privacy

**Purpose:** Move from test headers to production authentication, authorization, privacy, and security controls.

**Dependencies:** Phase 8.

**Primary deliverables:**

- Argon2 password hashing and password migration path.
- HttpOnly refresh cookies for web.
- JWT access tokens for API/mobile.
- Refresh token rotation, device sessions, logout, and session revocation.
- Fine-grained permissions beyond single active role headers.
- Guardian consent model for minors.
- Public profile privacy policy engine.
- Rate limiting for auth, QR scan, search, and public endpoints.
- Support impersonation with mandatory audit reason for Super Admin support workflows.
- Remove default `admin123` credential from runtime seed path.

**Acceptance tests:**

- Passwords are never stored or returned in plaintext.
- A revoked refresh token cannot mint a new access token.
- Production mode rejects development header auth even when fallback env vars are set.
- Bearer auth takes precedence over conflicting development headers.
- Rate limits protect auth, QR, search, privacy, impersonation, and public profile routes.
- Public athlete profile hides age-sensitive and document-sensitive fields.
- Guardian consent can be required before public profile publication.
- Support impersonation writes actor, target user, reason, and timestamp to audit logs.
- Guarded PostgreSQL e2e covers password hashes, session rotation, public privacy, QR privacy, impersonation audit, and rate limits.

**Status:** Implemented in `docs/superpowers/plans/2026-05-22-athletiq-phase-9-production-auth-security.md`. Remaining hardening for production scale: replace the process-local fixed-window limiter with Redis or edge/WAF-backed rate limits, configure trusted proxy headers, and add a password setup/admin bootstrap flow.

**Phase completion commit:**

```bash
git commit -m "feat: add production auth and privacy controls"
```

## Phase 10: Registration, Payments, Memberships, And Waivers

**Purpose:** Add the administrative workflows schools, tournaments, and federations need to operate sustainably.

**Dependencies:** Phase 9.

**Primary deliverables:**

- School membership plans and annual billing.
- Tournament registration fees.
- Player registration fees and optional scholarship/discount codes.
- Invoice, payment, refund, and reconciliation records.
- Payment plans, installments, family fee splitting, manual bank/cash approval, and automatic outstanding-balance tracking.
- Waiver templates, versioned signature capture, guardian signature requirements, IP/timestamp audit details, downloadable signed records, and waiver expiry.
- Payment-provider adapter interface so Stripe, local gateways, and manual bank transfer can coexist.
- Finance reports for schools, tournament organizers, and federations.

**Acceptance tests:**

- A school can purchase or renew a membership plan.
- Tournament registration can require payment before approval.
- Waiver signature is required before athlete participation when configured.
- Refunds update financial reports without deleting original transactions.
- Manual offline payment approval writes audit history.
- Installment schedules and discounts produce correct invoice balances.

**Phase completion commit:**

```bash
git commit -m "feat: add registration payments and waivers"
```

## Phase 11: Production Document, OCR, And Verification Pipeline

**Purpose:** Replace the OCR stub with secure document storage, AI extraction, review queues, duplicate detection, and expiry tracking.

**Dependencies:** Phase 9.

**Primary worker jobs:**

```txt
document.store
document.extract
document.review-score
document.duplicate-check
verification.notify
document.expiry-check
```

**Primary deliverables:**

- Multipart file upload with size, type, and malware-scan extension points.
- S3-compatible private storage with signed review URLs.
- OpenAI vision extraction using structured outputs.
- Extraction confidence scoring and field-level review flags.
- Duplicate checks across document number, name, birth date, guardian names, and fuzzy identity signals.
- Manual approve, reject, correction-request, and override workflows.
- Document expiry tracking for IDs, medicals, eligibility forms, and waivers.

**Acceptance tests:**

- Uploaded documents are private by default.
- Review URLs expire and require authorized reviewer access.
- Low-confidence extraction creates review flags.
- Duplicate candidates are linked without automatically merging athletes.
- Approval updates athlete identity only through a verified action.

**Phase completion commit:**

```bash
git commit -m "feat: add production document verification pipeline"
```

## Phase 12: Interactive Bracketing And Competition Engine

**Purpose:** Build world-class tournament operations with interactive brackets, standings, ladders, and multi-stage competition formats.

**Dependencies:** Phase 8.

**Primary deliverables:**

- Bracket data model independent from rendered UI.
- Single elimination, double elimination, round robin, league, group-stage-to-knockout, and placement/consolation formats.
- Drag-and-drop seeding with lockable seeds.
- Team withdrawal, bye generation, reseeding policy, and bracket regeneration safeguards.
- Live advancement after verified results.
- Standings/ladders with configurable points and tiebreakers.
- Printable bracket sheets and public embeddable bracket views.
- Bulk participant import, score reporting, match attachments, and operator share links.
- Admin collaboration controls for tournament operators.
- Bracket history so published brackets can be audited.

**Acceptance tests:**

- Single elimination bracket advances winners correctly.
- Double elimination bracket handles winners and losers brackets.
- Group-stage standings apply points, goal difference, head-to-head, and disciplinary tiebreakers in configured order.
- Published bracket cannot be destructively regenerated without creating a new bracket version.
- Public bracket view never exposes private athlete data.

**Phase completion commit:**

```bash
git commit -m "feat: add interactive tournament bracketing"
```

## Phase 13: Facilities, Officials, And Advanced Scheduling

**Purpose:** Add real-world logistics for venues, fields, officials, availability, and schedule optimization.

**Dependencies:** Phase 12.

**Primary deliverables:**

- Venue, field, court, lane, and facility availability records.
- Blackout dates, travel buffers, rest windows, and school availability constraints.
- Referee/official profiles, certifications, availability, conflicts, roles, check-in, and post-match reports.
- Auto-scheduler with manual override and conflict warnings.
- Schedule publish/unpublish workflow.
- Official assignment notifications and acceptance states.
- Official payout/export records and payroll reconciliation.

**Acceptance tests:**

- Scheduler does not assign two matches to the same field at the same time.
- Scheduler respects school blackout windows and minimum rest rules.
- Official cannot be assigned to overlapping matches.
- Manual override requires reason and writes audit log.
- Published schedule changes create notifications.

**Phase completion commit:**

```bash
git commit -m "feat: add facilities officials and scheduling"
```

## Phase 14: Enterprise Web Dashboards And Public Site

**Purpose:** Build the polished web product for operators, schools, federations, families, and public tournament followers.

**Dependencies:** Phase 9, Phase 12.

**Primary deliverables:**

- Super Admin dashboard.
- School Admin dashboard.
- Coach/referee workspace.
- Federation dashboard.
- Government read-only analytics dashboard.
- Public tournament pages with fixtures, brackets, standings, results, and safe profiles.
- Athlete profile timelines and printable athlete passport.
- Design system with navigation, tables, filters, forms, dialogs, empty states, loading states, error states, and responsive behavior.
- Accessibility pass for keyboard navigation, contrast, labels, and focus states.

**Acceptance tests:**

- Each role lands on the correct dashboard.
- School Admin cannot access another school's management screens.
- Public pages render without authenticated data.
- Mobile viewport tables remain usable through responsive layouts.
- Critical pages pass automated accessibility smoke checks.

**Phase completion commit:**

```bash
git commit -m "feat: add enterprise web dashboards"
```

## Phase 15: Mobile Match-Day App And Offline Operations

**Purpose:** Build the production Expo app for low-connectivity registration, check-in, QR scan, scoring, and sync.

**Dependencies:** Phase 9, Phase 12, Phase 13.

**Primary deliverables:**

- Mobile login and secure token storage.
- Offline match packet download.
- QR scanner for athletes, teams, matches, check-in, and venue access.
- Offline scoring/event capture with local database.
- Conflict resolution inbox.
- Sync status, retry, and immutable mutation log.
- Referee workflow: match sheet, lineups, events, result submission, signature/confirmation.
- School workflow: athlete lookup, team check-in, document status.

**Acceptance tests:**

- Mobile can complete a match event workflow without internet.
- Duplicate sync mutation IDs are idempotent.
- Conflicting edits are retained locally and visible to reviewer.
- QR scan works for athlete, team, and match resources.
- Token logout clears local authenticated session state.

**Phase completion commit:**

```bash
git commit -m "feat: add production mobile match-day app"
```

## Phase 16: Communications, Family Experience, And Notifications

**Purpose:** Add the engagement layer that keeps schools, guardians, athletes, coaches, and officials aligned.

**Dependencies:** Phase 9, Phase 14, Phase 15.

**Primary deliverables:**

- Guardian accounts linked to athletes.
- Family dashboard and mobile views.
- Organization, school, team, and tournament announcements.
- Targeted notifications for schedule changes, verification requests, approvals, disputes, and match updates.
- Email, SMS, push, and in-app notification provider interfaces.
- Bilingual English/Nepali content framework.
- Communication preferences, unsubscribe rules, and delivery audit logs.
- Team chat or controlled message threads with moderation controls.

**Acceptance tests:**

- Guardian only sees athletes they are linked to.
- Schedule change sends notification to affected teams and officials.
- Notification preferences suppress optional channels but not required compliance notices.
- Nepali and English message templates render with the same required variables.
- Moderated thread actions write audit logs.

**Phase completion commit:**

```bash
git commit -m "feat: add family communication workflows"
```

## Phase 17: Media, Video, Highlights, And Scouting

**Purpose:** Add visual evidence, scouting value, and long-term athlete media records.

**Dependencies:** Phase 14, Phase 15.

**Primary deliverables:**

- Secure media upload and attachment to athletes, matches, events, disputes, and scouting notes.
- Highlight clips and athlete media timeline.
- Scout watchlists and private scouting reports.
- Match evidence attachments for verification and disputes.
- Video processing adapter interface for future streaming/transcoding.
- AI video-analysis extension points without making AI output official automatically.

**Acceptance tests:**

- Media attached to a minor follows profile privacy rules.
- A match event can have video evidence without changing official stats.
- Scout notes are private to authorized scouting roles.
- Public highlight publication requires explicit permission.
- Deleting a media pointer does not delete audit history.

**Phase completion commit:**

```bash
git commit -m "feat: add media highlights and scouting"
```

## Phase 18: Advanced Analytics, AI Reports, And Data Products

**Purpose:** Turn verified ATHLETIQ records into decision-grade analytics for schools, federations, scouts, and government.

**Dependencies:** Phase 8, Phase 12, Phase 17.

**Primary deliverables:**

- Athlete longitudinal performance history.
- School, district, province, and federation dashboards.
- Configurable ranking systems per sport and competition.
- Participation, gender, age-group, geography, and retention analytics.
- PDF, CSV, spreadsheet, and API exports.
- AI-generated tournament summaries, scouting notes, and participation reports with human approval.
- Data quality dashboards: missing fields, stale documents, duplicate candidates, and verification backlog.

**Acceptance tests:**

- Analytics totals match source-of-truth records.
- Rankings recalculate after verified result changes.
- AI-generated reports remain draft until human approval.
- Exported CSV/PDF totals match dashboard totals.
- Government viewer cannot access private athlete documents.

**Phase completion commit:**

```bash
git commit -m "feat: add advanced analytics and reports"
```

## Phase 19: Integrations, Imports, Exports, And Open APIs

**Purpose:** Make ATHLETIQ easy to adopt by schools, federations, and partners that already have spreadsheets or external systems.

**Dependencies:** Phase 8, Phase 18.

**Primary deliverables:**

- Spreadsheet import for schools, athletes, rosters, tournaments, fixtures, and historical results.
- Data validation preview before import commit.
- Import rollback and audit trail.
- Public read APIs for approved tournament fixtures/results.
- Partner API keys, scopes, rate limits, and webhook subscriptions.
- Export bundles for federation reporting and data portability.
- Integration adapter interfaces for payment, SMS, email, storage, analytics, and identity providers.

**Acceptance tests:**

- Invalid spreadsheet rows are rejected with row-level errors.
- Import preview does not mutate production records.
- Import commit writes audit logs per batch.
- API key scope prevents unauthorized private data access.
- Webhook retries are idempotent.

**Phase completion commit:**

```bash
git commit -m "feat: add imports integrations and open apis"
```

## Phase 20: Production Infrastructure, QA, Pilot, And Scale Hardening

**Purpose:** Prepare ATHLETIQ for real deployments, pilots, federation demos, and eventual national-scale rollout.

**Dependencies:** Phase 14, Phase 15, Phase 18.

**Primary deliverables:**

- Production Docker images and deployment manifests.
- Managed PostgreSQL, Redis, object storage, CDN, and backup strategy.
- Sentry, OpenTelemetry, metrics, logs, alerting, uptime checks, and audit retention.
- CI/CD with migration checks, test gates, preview deployments, and release promotion.
- Load tests for tournament day traffic, QR scans, public brackets, and sync bursts.
- Security review for auth, file access, public profiles, rate limits, and minor privacy.
- Pilot playbook for school onboarding, tournament setup, support, incident response, and feedback.
- Disaster recovery and data export policy.

**Acceptance tests:**

- Fresh staging deployment can run migrations and seed safely.
- Backup restore is tested against staging.
- Public bracket and QR endpoints survive expected tournament-day traffic.
- Security smoke tests fail closed for private documents and cross-tenant access.
- Pilot checklist is executable by an operator who did not build the system.

**Phase completion commit:**

```bash
git commit -m "chore: add production infrastructure and pilot hardening"
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
- Treat guardian consent, waivers, medical/eligibility records, and document expiry as first-class workflows, not notes.
- Every payment, refund, waiver signature, official override, bracket regeneration, fixture publish, and data import must be auditable.
- Public tournament pages may expose fixtures, standings, brackets, and approved highlights, but must never expose private minor data.
- Interactive brackets must be driven by canonical competition data, not by UI-only state.
- Mobile offline features must preserve local data until the server confirms sync or conflict resolution.
- Every production phase must include operator workflows, empty states, error states, and role-based access tests.

## Release Strategy

Release internally after Phase 1.

Pilot with one or two schools after Phase 2.

Run a controlled football tournament pilot after Phase 4.

Use Phase 5 QR flows in a real tournament only after privacy review.

Use Phase 6 offline workflows in the field only after duplicate-submission and conflict tests pass.

Federation analytics should wait until enough verified records exist to make reports meaningful.

Production web dashboards should begin only after Phase 9 security rules are enforced.

Interactive bracket UX should start in Phase 12 before full public tournament pages, because tournament pages depend on bracket correctness.

Payments, waivers, communications, and guardian workflows should be piloted with a small school group before federation-level rollout.

Production deployment should wait until Phase 20, but preview environments should be created earlier for design and stakeholder review.

## Market Research Source Notes

- SportsEngine HQ informed the plan additions for registration, eligibility, payments, financials, memberships, waivers, websites, tournaments, background checks, and insurance workflows.
- TeamSnap ONE informed the plan additions for registration, integrated payments, roster building, scheduling, organization-wide messaging, team chat, family mobile experience, live streaming, highlights, websites, financial reporting, and smart tournament brackets.
- FIFA Connect informed the plan additions for unique identity, duplicate detection, document review, hashed identifiers, registration history, and electronic player passport patterns.
- PlayMetrics informed the plan additions for club operations, programs, field plans, curriculum, forms, files, refunds, notifications, staff/player profiles, and team formation.
- PlayHQ informed the plan additions for competition hierarchy, grades/divisions, fixtures, ladders, finals, electronic scoring, public results, reports, fixture generation, compliance, and payment reconciliation.
- GameChanger and Hudl informed the plan additions for live scoring, video, highlights, AI-supported analysis, team history, and recruiting/scouting value.
- Aktivate informed the plan additions for school athletic department workflows: eligibility, physicals, participation, injuries, fees, rosters, and coach management.
- Challonge informed the plan additions for interactive brackets, single/double elimination, round robin, Swiss/two-stage patterns, standings, printable and embeddable brackets, score reporting, and bulk participant entry.
- LeagueApps waiver and registration workflows informed the Phase 10 requirements for multiple waiver templates, registration-blocking acknowledgement, IP/timestamp audit, membership assignment, payment policies, and downloadable acceptance records.
- Sport:80 informed the Phase 10 and Phase 19 requirements for membership sales, event registration, certifications, governance/compliance, financial tools, donations, support center, and third-party integrations.
- GotSport informed governing-body requirements for roster rules, official ID cards, event rosters, compliance checks, custom payment plans, vouchers, refunds, referee management, and tournament application workflows.
- DragonFly and ArbiterSports informed school-athletics requirements for physicals, medical eligibility, injury and emergency data, game contracts, official/event-worker payments, payroll reports, and schedule resource coordination.

**Source URLs checked on 2026-05-22:**

- SportsEngine HQ: https://www.sportsengine.com/hq/
- SportsEngine Tourney: https://www.sportsengine.com/tourney/
- LeagueApps platform: https://leagueapps.com/
- LeagueApps waivers: https://support.leagueapps.com/hc/en-us/articles/360039380954-Waivers
- LeagueApps registration options: https://support.leagueapps.com/hc/en-us/articles/360039863793-Registration-Options-Guide
- TeamSnap payments: https://www.teamsnap.com/for-business/features/payments-bis
- TeamSnap invoices: https://helpme.teamsnap.com/article/1338-creating-org-issued-invoices
- Sport:80 features: https://www.sport80.com/features
- PlayHQ features: https://get.playhq.com/features
- PlayHQ competitions and fixtures: https://support.playhq.com/hc/en-us/articles/23953196535452-Getting-Started-Setting-up-Competitions-Fixtures-in-PlayHQ
- GotSport club management: https://info.gotsport.com/club-management
- GotSport governing body: https://home.gotsport.com/governing-body-solution/
- DragonFly for schools: https://www.dragonflymax.com/schools
- Arbiter Pay: https://arbitersportshelp.zendesk.com/hc/en-us/articles/19923961055373-What-is-Arbiter-Pay
- Arbiter Game: https://arbitersportshelp.zendesk.com/hc/en-us/articles/19923916370445-Getting-Familiar-with-Arbiter-Game
- Challonge tournament features: https://challonge.com/features/tournaments

## Master Verification Checklist

- [x] Phase 0 plan completed and all foundation commands pass.
- [x] Phase 1 code-level plan written before identity implementation.
- [x] Phase 1 completed with auth, schools, athletes, and audit logs.
- [x] Phase 2 code-level plan written before document implementation.
- [x] Phase 2 completed with OCR extraction and human verification.
- [x] Phase 3 code-level plan written before tournament implementation.
- [x] Phase 3 completed with football tournament workflows.
- [x] Phase 4 code-level plan written before stats implementation.
- [x] Phase 4 completed with official match events and athlete stats.
- [x] Phase 5 code-level plan written before QR implementation.
- [x] Phase 5 completed with safe public QR profiles.
- [x] Phase 6 code-level plan written before offline implementation.
- [x] Phase 6 completed with tested offline sync.
- [x] Phase 7 code-level plan written before analytics implementation.
- [x] Phase 7 completed with federation analytics and exports.
- [x] Phase 8 code-level plan written before production data implementation.
- [x] Phase 8 completed with PostgreSQL repositories and tenant isolation.
- [x] Phase 9 code-level plan written before production auth implementation.
- [x] Phase 9 completed with secure auth, sessions, permissions, and minor privacy controls.
- [x] Phase 10 code-level plan written before registration and billing implementation.
- [x] Phase 10 completed with payments, memberships, waivers, refunds, and finance reports.
- [x] Phase 11 code-level plan written before production document pipeline implementation.
- [x] Phase 11 completed with secure document upload, AI OCR, review queues, duplicate checks, and expiry tracking.
- [x] Phase 12 code-level plan written before interactive bracketing implementation.
- [x] Phase 12 completed with interactive brackets, bracket versions, advancement, standings, and public-safe bracket views.
- [x] Phase 13 code-level plan written before facilities and officials implementation.
- [x] Phase 13 completed with venue availability, official availability, scheduler constraints, and publish workflow.
- [x] Phase 14 code-level plan written before enterprise web dashboard implementation.
- [x] Phase 14 completed with role dashboards, public pages, responsive UX, and accessibility checks.
- [x] Phase 15 code-level plan written before production mobile implementation.
- [x] Phase 15 completed with offline match-day app, QR scanner, secure auth, and conflict resolution.
- [ ] Phase 16 code-level plan written before communications implementation.
- [ ] Phase 16 completed with guardian experience, notifications, team communications, and bilingual templates.
- [ ] Phase 17 code-level plan written before media/scouting implementation.
- [ ] Phase 17 completed with secure media, highlights, evidence, and scouting workflows.
- [ ] Phase 18 code-level plan written before advanced analytics implementation.
- [ ] Phase 18 completed with rankings, reports, AI drafts, exports, and data quality dashboards.
- [ ] Phase 19 code-level plan written before integrations implementation.
- [ ] Phase 19 completed with imports, exports, partner APIs, webhooks, and API key scopes.
- [ ] Phase 20 code-level plan written before production infrastructure implementation.
- [ ] Phase 20 completed with deployment, observability, backups, load tests, security review, and pilot playbook.
