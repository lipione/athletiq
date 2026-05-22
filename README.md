# ATHLETIQ

ATHLETIQ is a verified athlete identity, school sports, tournament intelligence, and grassroots sports infrastructure platform.

## Local Development

Install dependencies:

```bash
corepack enable
pnpm install
```

Start local infrastructure:

```bash
docker compose up -d
```

Choose the API data backend:

```bash
# Fast local tests and prototyping.
ATHLETIQ_DATA_BACKEND=memory

# Staging, production, and database e2e tests.
ATHLETIQ_DATA_BACKEND=postgres
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq
```

`AppDataStore` is an in-memory fallback for tests and local prototyping. It does not persist JSON snapshots; PostgreSQL repositories are the source of truth when `ATHLETIQ_DATA_BACKEND=postgres`.

Auth and security environment:

```bash
# Required outside test mode. Minimum 32 characters.
ATHLETIQ_JWT_SECRET=replace-with-a-long-random-secret

# Defaults.
ATHLETIQ_ACCESS_TOKEN_TTL_SECONDS=900
ATHLETIQ_REFRESH_TOKEN_TTL_SECONDS=2592000

# Development/test header fallback is off unless NODE_ENV=test or this is set.
# Ignored in NODE_ENV=production.
ATHLETIQ_ALLOW_TEST_HEADERS=1

# Allows the built-in local JWT secret only when NODE_ENV=development.
ATHLETIQ_ALLOW_INSECURE_DEV_JWT_SECRET=1
```

Password storage uses Argon2. Runtime bootstrap users are locked until an explicit password setup flow exists. Login returns a Bearer access token and sets an `athletiq_refresh` HttpOnly cookie at `/api/auth`; refresh rotates the cookie and logout revokes the active refresh session. Support impersonation is super-admin-only, requires a reason, embeds `impersonatedBy` in the access token, and writes an audit row.

Rate limiting is currently an in-memory fixed-window guard for high-risk routes: auth login/register/refresh, impersonation, QR generation/scan/public resolution, search, privacy writes, and public profiles. Production scale should replace this with Redis or an edge/WAF-backed limiter and explicitly configure trusted proxy headers.

Minor public athlete profiles are private by default. Publishing requires `public_profile` guardian consent, and public/QR athlete responses expose only the safe public profile fields.

Registration, billing, and waiver operations:

- Money is stored as integer minor units, for example NPR paisa.
- Phase 10 payment processing uses an auditable manual adapter: `manual_cash` and `manual_bank` approvals create payment records and update invoice balances. Stripe, local gateways, and bank integrations should plug in behind the billing repository without changing tournament or membership workflows.
- Refunds are append-only records linked to the original payment and invoice; payment history is never deleted.
- Tournament registration can require a paid registration invoice before school enrollment is accepted.
- Waiver signatures store the template version, guardian signer, relationship, IP address, user agent, signed timestamp, and optional expiry. Active tournament waiver requirements block team creation until every athlete on the roster has a valid signature.

Document, OCR, and verification operations:

- Uploaded athlete documents are private metadata records backed by a storage key; API responses expose document IDs, hashes, MIME/size, status, and review metadata but never raw storage paths.
- Review links use opaque one-time response tokens and persist only SHA-256 token hashes with expiry timestamps.
- OCR/extraction output is proposed data only. Athlete identity fields update only after a human review action approves or overrides an extracted document.
- Duplicate detection stores candidate links based on exact document numbers and identity signals; it never merges athletes or documents automatically.
- Expiry checks mark records expired and audit the action without deleting uploads, extractions, reviews, or duplicate-candidate history.
- The current local/test extraction provider is deterministic structured text. OpenAI vision extraction belongs behind the same provider boundary and should use structured outputs plus human review before anything becomes official.

Interactive tournament bracketing:

- Brackets are canonical backend records with immutable versions, seeds, generated match nodes, standings, and audit history. The UI should render and edit from these APIs rather than keeping bracket truth in client-only state.
- Supported engine paths are single elimination, four/eight-team double elimination, and group-stage standings. Ready bracket nodes create real matches only when both teams are known; byes never create fake teams or fake matches.
- Double-elimination routing is source-ordered, so winners and losers land in deterministic home/away slots regardless of verification order. If the losers-side finalist beats the winners-side finalist in the grand final, an if-necessary reset final is scheduled.
- Seed numbers are validated for duplicates, and locked seeds cannot be moved. Draft reseeding removes only unplayed generated matches and is blocked once a generated bracket match has started. Published brackets cannot be destructively regenerated; regeneration creates a new draft version until it is explicitly published.
- Verified match results advance bracket nodes idempotently in the same repository operation. Elimination matches require a non-tied verified score, while group matches update standings.
- Standings rank by points, goal difference, goals for, head-to-head points, lower disciplinary points, then team name.
- Public bracket views use slug URLs and expose only safe tournament display data: teams, seeds, nodes, scores, standings, and public slug. They do not expose athlete roster IDs, user emails, billing data, document data, token hashes, or audit metadata.
- Guarded Postgres parity can be checked with:

```bash
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq \
ATHLETIQ_DATABASE_E2E=1 \
ATHLETIQ_DATA_BACKEND=postgres \
pnpm -C apps/api exec vitest run test/phase-12-postgres-bracketing.spec.ts
```

Facilities, officials, and scheduling:

- Facilities contain venue units such as fields, courts, lanes, and rooms. Schedule generation writes canonical match schedule rows against real matches and updates match `scheduledAt` values.
- Availability windows support venue-unit, school, and official blackouts. The scheduler avoids venue and school conflicts, enforces configurable team rest windows, and detects assigned-official conflicts when schedules are regenerated or manually overridden.
- Official profiles support sport coverage, optional home-school affiliation, certifications, payout rates, assignments, acceptance/decline, accepted-only check-in, notifications, and payout export records.
- Manual schedule overrides require a reason whenever conflicts are accepted, and write `schedule.override` audit entries. Schedule publish/unpublish updates persisted schedule status and creates official notifications.
- Sensitive availability and full official-profile reads are super-admin-only; referees see their own assignments through tournament schedule reads and their own schedule notifications.
- Guarded Postgres scheduling parity can be checked with:

```bash
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq \
ATHLETIQ_DATABASE_E2E=1 \
ATHLETIQ_DATA_BACKEND=postgres \
pnpm -C apps/api exec vitest run test/phase-13-postgres-scheduling.spec.ts
```

Enterprise web dashboards and public site:

- The web app now opens to an operational Super Admin command workspace rather than a marketing landing page.
- Role workspaces are available at `/workspaces/super-admin`, `/workspaces/school-admin`, `/workspaces/coach-referee`, `/workspaces/federation`, and `/workspaces/government`.
- School management is scoped through `/schools/:schoolId/management`; school admins only see their own roster, document, waiver, billing, and eligibility details. Unauthorized school access renders an access-denied state without private roster data.
- Public tournament pages live at `/public/tournaments/:slug` and render safe tournament overview data, fixtures, standings, schedule status, and an interactive bracket explorer backed by public-safe payloads.
- Athlete passports live at `/athletes/:athleteId/passport` and render verified identity, multi-sport stats, development timeline, QR placeholder, and a printable passport section.
- Web verification includes role routing, school access scoping, public payload safety, responsive table labels, and bracket detail markup:

```bash
pnpm -C apps/web test
pnpm -C apps/web typecheck
pnpm -C apps/web lint
pnpm -C apps/web build
```

Mobile match-day and offline operations:

- The Expo app now opens to a match-day operations surface for referees and schools, backed by a tested pure TypeScript offline state model.
- Secure token storage, QR scanning, and SQLite persistence are isolated behind Expo Go-compatible adapter boundaries for `expo-secure-store`, `expo-camera`, and `expo-sqlite`.
- Match packets can be downloaded into local state and used offline for team check-in, lineups, document status, scoring, sync review, and conflict inbox workflows.
- Backend-bound sync mutations are limited to API-supported `match_event_submit` and `match_event_correct` operations. Team check-in remains a retained local record until a backend team check-in endpoint exists.
- Result submission uses a direct `/api/matches/:matchId/submit-result` request builder rather than an unsupported offline sync mutation.
- Mobile verification covers token store/clear, packet availability without network, QR classification, offline scoring mutation idempotency, conflict retention, retry selection, and adapter descriptors:

```bash
pnpm -C apps/mobile test
pnpm -C apps/mobile typecheck
pnpm -C apps/mobile lint
pnpm -C apps/mobile build
```

Communications, family experience, and notifications:

- The API now has a dedicated communications module instead of overloading schedule-specific notifications. It supports guardian-athlete links, family dashboards, announcements, bilingual templates, notification preferences, delivery audit records, inbox reads, and moderated conversation threads.
- A `guardian` role is available for direct family access. Guardian dashboards only expose linked athlete summaries and never expose private DOB, document storage, guardian contact, or internal review fields.
- Optional delivery channels can be suppressed by user preference, while required compliance notices remain deliverable and auditable.
- Team/family threads support participant-scoped reads, guardian replies, school-admin moderation, retained moderation records, and audit rows for moderation actions.
- The web app includes a family communications surface at `/family/communications` with bilingual templates, moderated thread state, delivery queue status, and public-safe guardian operations copy.
- The mobile app includes a deterministic offline family communications model for notices, preferences, message drafts, moderation retention, retryable outbound mutations, and backend-compatible request builders.
- Verification covers guardian scoping, preference suppression, required notice delivery, bilingual rendering, moderation audit, web privacy safety, mobile idempotency, moderation retention, and retry selection:

```bash
pnpm -C apps/api test -- phase-16-communications.spec.ts
pnpm -C apps/web test -- phase-16-web.test.tsx
pnpm -C apps/mobile test -- phase-16-family.test.ts
```

Run checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run apps:

```bash
pnpm --filter @athletiq/api dev
pnpm --filter @athletiq/web dev
pnpm --filter @athletiq/worker dev
pnpm --filter @athletiq/mobile dev
```
