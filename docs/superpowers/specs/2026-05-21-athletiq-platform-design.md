# ATHLETIQ Platform Design

## Goal

Build ATHLETIQ as a verified athlete identity, school sports, tournament intelligence, and grassroots sports infrastructure platform for Nepal first, with a technical foundation that can grow into a federation-grade national sports data layer.

The first product promise is:

> A student athlete gets a permanent ATHLETIQ ID, plays verified school tournaments, and builds a trusted sports history over time.

## Product Positioning

ATHLETIQ is not a tournament-only app. It is a long-term sports identity and verification platform.

The product should be optimized for:

- Permanent youth athlete records.
- Verified school and tournament participation.
- Trustworthy match and performance statistics.
- Low-training workflows for schools, coaches, referees, and organizers.
- Mobile-first use in Nepal, including weak connectivity environments.
- Future federation, government, scouting, and analytics layers.

## Recommended Technical Direction

ATHLETIQ should start as a TypeScript-first modular monolith in a monorepo.

This avoids the operational cost of microservices while keeping clear module boundaries so high-load or specialized systems can split out later.

## Tech Stack

### Monorepo

- pnpm for package management.
- Turborepo for task orchestration and build caching.
- TypeScript across all apps and packages.

### Web

- Next.js with React and TypeScript.
- Used for admin dashboards, school dashboards, federation dashboards, government analytics, tournament operations, and public QR profile pages.
- Business rules must stay in the backend API, not inside Next.js route handlers.

### Mobile

- Expo React Native with TypeScript.
- Used for school admins, coaches, referees, scorers, players, and future guardians.
- Offline-first match-day flows should live primarily in mobile.

### Backend API

- NestJS with the Fastify adapter.
- Modular monolith structure.
- REST API first, with OpenAPI documentation.
- WebSocket or Server-Sent Events for live match updates where needed.

### Database

- PostgreSQL as the primary system of record.
- Relational schema for identity, schools, tournaments, matches, verification, users, and audit logs.
- JSONB only for flexible sport-specific event payloads, OCR extraction payloads, and configurable metadata.
- Materialized views or reporting tables for analytics and leaderboards.

### Query Layer

- Drizzle ORM is preferred because ATHLETIQ will need strong SQL control, custom indexes, reporting queries, JSONB operators, materialized views, and explicit migrations.
- If team familiarity strongly favors Prisma, Prisma can be used for simple relational CRUD, but advanced SQL should still live in versioned migration files.

### Queue And Workers

- Redis for queue backend and short-lived cache.
- BullMQ for OCR jobs, report generation, notification jobs, scheduled sync repair, leaderboard recalculation, and async verification tasks.
- Dedicated worker app separate from the API process.

### File Storage

- AWS S3 for production document and media storage.
- Private buckets for identity documents.
- Signed URLs for temporary access.
- Local S3-compatible storage may be used in development.

### AI And OCR

- OpenAI vision-capable models for document OCR and extraction.
- Structured JSON outputs for predictable backend validation.
- AI never directly verifies an athlete. AI extracts and flags; humans or authorized institutions approve.

### Search

- Phase 1: PostgreSQL full-text search and trigram search.
- Phase 2: pgvector for semantic search if ATHLETIQ adds natural-language search over athletes, tournaments, reports, and documents.
- Phase 3: Meilisearch or OpenSearch only if PostgreSQL search becomes insufficient.

### Analytics

- Phase 1: PostgreSQL queries, reporting tables, and materialized views.
- Phase 2: read replicas and scheduled aggregation jobs.
- Phase 3: ClickHouse or a warehouse only after analytics load justifies it.

### Observability

- Sentry for frontend, mobile, and backend errors.
- OpenTelemetry-compatible tracing.
- Structured JSON logs.
- Audit logs stored in PostgreSQL for product/security events.

### Deployment

- Docker Compose for local development.
- Managed PostgreSQL, Redis, and S3 in production.
- API and workers deployed as separate services.
- Web deployed separately from API.

## Repository Structure

```txt
apps/
  web/        Next.js web dashboards and public pages
  mobile/     Expo mobile app
  api/        NestJS backend API
  worker/     OCR, reports, leaderboard jobs, scheduled jobs

packages/
  db/         database schema, migrations, SQL helpers
  shared/     shared types, validation schemas, constants
  ui/         shared UI primitives and design system
  config/     shared TypeScript, lint, test, and env config
```

## Backend Module Boundaries

```txt
AuthModule
UserModule
TenantModule
SchoolModule
AthleteModule
GuardianModule
DocumentModule
VerificationModule
TournamentModule
TeamModule
MatchModule
StatsModule
QRModule
NotificationModule
FederationModule
GovernmentModule
AuditModule
AnalyticsModule
AIModule
SyncModule
```

Each module should own its service layer, validation schemas, route handlers, permissions, tests, and database access patterns.

## Core Roles

- Super Admin
- Federation Admin
- Government Viewer
- School Admin
- Coach
- Referee
- Tournament Organizer
- Player
- Guardian

Roles should be backed by granular permissions. Example permissions:

```txt
athlete.create
athlete.verify
document.review
tournament.create
tournament.approve
match.score.submit
match.result.verify
stats.publish
school.manage_users
federation.view_analytics
audit.view
```

## MVP Scope

ATHLETIQ should start narrow:

- Country: Nepal.
- Sport: football first.
- Users: Super Admin, School Admin, Coach, Referee, Player.
- Core workflows:
  - School onboarding.
  - Athlete registration.
  - Document upload.
  - AI OCR extraction.
  - Human verification.
  - Permanent ATHLETIQ ID.
  - QR athlete profile.
  - School team creation.
  - Football tournament creation.
  - Squad registration.
  - Fixtures.
  - Match sheets.
  - Score and event entry.
  - Referee verification.
  - Athlete history.

Out of MVP:

- Cricket and basketball.
- Government dashboards.
- Advanced AI scouting.
- Scholarship marketplace.
- Social networking.
- Wearables.
- Video analytics.
- Public national rankings.
- Multi-country deployments.

These are future layers after the verified identity and tournament data engine works.

## Data Model Principles

Use normalized relational tables for trusted identity and operations.

Use append-only or append-friendly event records for match events and verification actions.

Use JSONB only where the schema genuinely varies by sport or document type.

Keep derived statistics separate from raw match events so results can be recalculated when corrections happen.

## Initial Core Tables

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
documents
document_extractions
verification_requests
verification_actions
athlete_ids
qr_codes
tournaments
tournament_divisions
tournament_registrations
teams
team_members
matches
match_officials
match_events
match_results
athlete_match_stats
athlete_tournament_stats
audit_logs
notification_events
sync_mutations
```

## Athlete Identity

Every athlete receives a permanent ATHLETIQ ID after verification.

The ID should not encode sensitive data such as date of birth, gender, school, or province.

Recommended ID format:

```txt
ATQ-NP-26-8CHAR
```

Example:

```txt
ATQ-NP-26-K7M4Q9XA
```

The public QR profile should show only safe fields by default:

- Name.
- School or team affiliation where allowed.
- Sport.
- Age category, not full date of birth.
- Verification badge.
- Public achievements.
- Public tournament history.

Sensitive minor data should require authorized access.

## OCR And Verification Flow

1. School Admin uploads a document.
2. API stores file metadata and uploads the file to private object storage.
3. API creates a document extraction job.
4. Worker sends the document to an OpenAI vision-capable model.
5. Model returns structured JSON.
6. Worker validates extracted fields against a strict schema.
7. System calculates confidence, mismatch flags, and duplicate candidates.
8. Human reviewer approves, rejects, or requests correction.
9. Athlete profile updates only after approval.
10. Every decision writes to audit logs.

Required extracted fields:

```txt
full_name
date_of_birth
guardian_names
gender
document_type
document_number_if_available
school_name_if_available
address_if_available
extraction_confidence
field_confidences
```

Fraud and quality checks:

- Duplicate name plus date of birth.
- Duplicate document number.
- Age eligibility mismatch.
- School mismatch.
- Low-confidence OCR fields.
- Manual override tracking.

## Tournament And Match Model

MVP tournament types:

- Single knockout.
- Round robin.

Future tournament types:

- Group stage plus knockout.
- Double elimination.
- League season.

Football MVP match events:

```txt
goal
assist
yellow_card
red_card
substitution
foul
save
own_goal
penalty_goal
penalty_miss
appearance
mvp
```

Store match events as raw events:

```txt
match_events:
  id
  match_id
  athlete_id
  team_id
  event_type
  minute
  payload JSONB
  submitted_by
  verification_status
  created_at
```

Then calculate derived stats:

```txt
athlete_match_stats
athlete_tournament_stats
leaderboards
team_standings
```

This keeps official stats explainable and correctable.

## Verification Model

Nothing becomes official automatically.

Verification layers:

- School Admin registration submission.
- AI extraction assistance.
- Human document approval.
- Referee match result submission.
- Coach or organizer review where applicable.
- Federation or Super Admin override for disputes.

Verification state examples:

```txt
draft
submitted
needs_review
approved
rejected
disputed
superseded
```

Every official state change should include:

- Actor.
- Role.
- Previous state.
- New state.
- Reason.
- Timestamp.
- Source IP/device when available.

## Offline-First Design

Offline-first should focus on match-day and registration support, not every admin feature.

Offline-capable MVP flows:

- Player check-in.
- Team sheet viewing.
- Match event entry.
- Score updates.
- Referee notes.
- Draft athlete registration.

Server-required flows:

- Final document approval.
- Official athlete verification.
- Final result certification.
- Federation approval.
- Payment or subscription changes.

Mobile offline storage:

- Expo SQLite.
- Local mutation queue.
- Client mutation IDs.
- Device IDs.
- Sync attempt tracking.
- Conflict status.

Conflict strategy:

- Idempotent mutation IDs prevent duplicate submissions.
- Server decides official ordering using trusted timestamps.
- Conflicts requiring human judgment are marked for review.
- Clients display pending, synced, failed, and conflict states.

## Security Design

Core requirements:

- HttpOnly secure cookie auth for web.
- Mobile token flow with refresh token rotation.
- Argon2 password hashing.
- Role and permission guards.
- Tenant and school scoping.
- Rate limiting.
- Private document storage.
- Signed document URLs.
- Audit logging.
- Field-level privacy for minors.
- No sensitive data in QR payloads.

QR codes should point to server URLs or signed public profile IDs, not embed private athlete data.

## API Design

Use REST first.

Example route groups:

```txt
/auth
/users
/schools
/athletes
/documents
/verification
/tournaments
/teams
/matches
/stats
/qr
/analytics
/sync
```

Use OpenAPI docs generated from backend decorators or route schemas.

Use WebSockets or SSE only for:

- Live match scoring.
- Tournament control-room screens.
- Notification updates.

## Frontend Design Direction

ATHLETIQ should feel like a serious sports operations system, not a marketing site.

Design principles:

- Mobile-first.
- Fast data entry.
- Dashboard-centric.
- Clear verification states.
- Strong table and list views.
- Minimal training required.
- English and Nepali-ready.
- Premium but practical navy, green, and neutral palette.

Primary web surfaces:

- Super Admin dashboard.
- School Admin dashboard.
- Tournament dashboard.
- Match control panel.
- Athlete profile.
- Document review queue.
- Federation analytics later.

Primary mobile surfaces:

- Login.
- School team manager.
- Athlete registration.
- QR scanner.
- Match-day scorer/referee mode.
- Offline sync status.

## Internationalization

Use translation keys from day one.

Initial languages:

- English.
- Nepali.

Backend should store canonical enum values and return translation keys or stable codes where useful.

## Testing Strategy

Required from the beginning:

- Unit tests for permission checks, ID generation, tournament rules, and stat calculation.
- Integration tests for auth, athlete registration, OCR job lifecycle, verification actions, and match event submission.
- E2E tests for core web flows.
- Mobile sync tests for offline mutation behavior.
- Database migration tests in CI.

High-risk areas needing strong tests:

- Athlete duplicate detection.
- Age eligibility.
- Role permissions.
- Verification state transitions.
- Match result correction.
- Offline duplicate submission.

## Implementation Phases

### Phase 0: Foundation

- Initialize monorepo.
- Set up TypeScript, linting, formatting, testing, and CI.
- Set up Docker Compose for PostgreSQL and Redis.
- Create shared config and env validation.
- Create design system foundation.
- Create deployment baseline.

### Phase 1: Identity And Schools

- Auth.
- RBAC.
- School onboarding.
- User management.
- Athlete profile creation.
- ATHLETIQ ID generation.
- Audit logs.

### Phase 2: Documents And Verification

- Document upload.
- Private file storage.
- OCR worker.
- Structured extraction.
- Review queue.
- Approval/rejection flow.
- Duplicate detection.

### Phase 3: Football Tournament Core

- Tournament creation.
- Team creation.
- Squad registration.
- Fixture generation.
- Match sheet generation.
- Referee assignment.
- Result submission.

### Phase 4: Stats Engine

- Football match events.
- Stat rollups.
- Athlete match history.
- Tournament leaderboards.
- Result correction workflow.

### Phase 5: QR Infrastructure

- Athlete QR profile.
- Match QR sheet.
- Team check-in.
- QR scanner in mobile app.

### Phase 6: Offline Mobile

- Expo app.
- SQLite persistence.
- Local sync queue.
- Offline match scoring.
- Conflict handling.

### Phase 7: Federation And Analytics

- Federation dashboards.
- Province and district reporting.
- Participation analytics.
- Exports.
- Federation-level verification and dispute workflows.

## Scale Path

Start with a modular monolith.

Split only when real pressure appears:

- OCR workers can scale separately immediately.
- Analytics can move to a dedicated read model later.
- Realtime match updates can split if tournament traffic grows.
- Search can move from PostgreSQL to a dedicated search engine if needed.
- AI/scouting can become a separate service after the trusted data layer exists.

## Key Risks

### Scope Risk

ATHLETIQ is naturally large. The MVP must stay football-first and verification-first.

### Data Trust Risk

If schools can publish unverified records directly, ATHLETIQ loses its core value. Verification must be central from the first release.

### Offline Sync Risk

Offline-first can become complex. Limit offline support to match-day and field workflows first.

### Privacy Risk

ATHLETIQ handles minors. Public profiles and QR codes must avoid sensitive data exposure.

### AI Reliability Risk

OCR extraction will make mistakes. AI output must be validated and reviewed before official records change.

### Reporting Risk

Trying to build national analytics before data quality exists will create misleading dashboards. Reporting should follow verified data maturity.

## Success Criteria For MVP

The MVP is successful when:

- A school can register athletes.
- Documents can be uploaded and AI-extracted.
- A reviewer can approve athlete identity.
- Athletes receive permanent ATHLETIQ IDs.
- A school can create football teams.
- A tournament can register teams and generate fixtures.
- A referee can submit match results and events.
- Match data becomes official only after verification.
- Athlete profiles show verified tournament history.
- QR profiles work without exposing sensitive data.

## Recommendation Summary

Build ATHLETIQ as:

- TypeScript-first.
- Monorepo-based.
- Modular monolith.
- PostgreSQL-centered.
- Verification-first.
- Football-first.
- Mobile-first.
- Offline-capable only where it matters early.

The product should earn trust before expanding into advanced AI, federations, rankings, scholarships, and scouting.
