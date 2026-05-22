# ATHLETIQ Phase 12 Interactive Bracketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build canonical interactive tournament bracketing with versioned brackets, safe publish/regenerate rules, verified-result advancement, standings, and public-safe bracket views.

**Architecture:** Brackets are stored as canonical competition data, not UI-only state. The backend owns bracket versions, seeds, generated match nodes, standing rows, advancement rules, audit records, and public DTOs; frontend interactivity can later drag seeds and render brackets from this API without inventing state. The first implementation supports single elimination, double elimination, and group-stage standings in a deterministic engine with memory and Postgres repository parity.

**Tech Stack:** NestJS, TypeScript, Drizzle/PostgreSQL, Vitest, Supertest, existing ATHLETIQ repository abstraction, existing audit/tenant patterns.

---

## Scope

This phase delivers the backend/data engine and API surface required for interactive bracketing. Full polished web UI is deferred to Phase 14, but the API must be designed so a frontend can perform drag-and-drop seeding, publish brackets, view public embeds, and react to verified match advancement without client-side bracket truth.

## Files

- Create `apps/api/src/brackets/bracket-engine.ts`: deterministic generation, advancement, standings, tiebreakers, safe DTO helpers.
- Create `apps/api/src/brackets/brackets.service.ts`: validation, orchestration, public-safe reads, destructive-regeneration guard.
- Create `apps/api/src/brackets/brackets.controller.ts`: tournament bracket endpoints and public bracket endpoint.
- Create `apps/api/src/brackets/brackets.module.ts`: module registration.
- Modify `apps/api/src/app.module.ts`: import `BracketsModule`.
- Modify `apps/api/src/common/store.ts`: in-memory records, bracket operations, match verification advancement hook.
- Modify `apps/api/src/common/permissions.ts`: add bracket permissions for super admin and school admin read.
- Modify `apps/api/src/repositories/repository.types.ts`: `BRACKET_REPOSITORY`, types, methods.
- Modify `apps/api/src/repositories/memory-repositories.ts`: add `MemoryBracketRepository`.
- Modify `apps/api/src/repositories/postgres-repositories.ts`: add `PostgresBracketRepository`, mapping, transactions, public-safe reads.
- Modify `apps/api/src/repositories/repository.module.ts`: register memory/postgres bracket repositories.
- Modify `packages/db/src/schema.ts`: bracket tables with tenant-safe indexes/FKs.
- Create `packages/db/drizzle/0009_phase_12_bracketing.sql`: migration.
- Modify `packages/db/drizzle/meta/_journal.json` and add `packages/db/drizzle/meta/0009_snapshot.json` through Drizzle generation or checked-in generated output.
- Modify `packages/db/src/schema.test.ts`: table/index/FK assertions.
- Create `apps/api/test/phase-12-bracketing.spec.ts`: memory HTTP/API behavior tests.
- Create `apps/api/test/phase-12-postgres-bracketing.spec.ts`: guarded Postgres repository/API parity test.
- Modify `apps/api/test/repository.module.spec.ts`: bracket repository routing assertions.
- Modify `README.md`: bracket operations section.
- Modify `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`: mark Phase 12 plan and completion.

## Data Model

Use these TypeScript record shapes in `apps/api/src/common/store.ts` and repository interfaces:

```ts
export type BracketFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'league'
  | 'group_stage_knockout';

export type BracketStatus = 'draft' | 'published' | 'archived';
export type BracketNodeStatus = 'pending' | 'scheduled' | 'ready' | 'completed' | 'bye';

export interface BracketRecord {
  id: string;
  tournamentId: string;
  format: BracketFormat;
  status: BracketStatus;
  activeVersionId: string;
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
  round: number;
  position: number;
  bracketSide: 'main' | 'winners' | 'losers' | 'placement' | 'group';
  homeTeamId?: string;
  awayTeamId?: string;
  winnerTeamId?: string;
  loserTeamId?: string;
  sourceNodeIds: string[];
  nextNodeId?: string;
  loserNextNodeId?: string;
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
```

Postgres tables should mirror these records and include `tenant_id` on every bracket table. Add unique indexes for `(tenant_id, id)` on parent tables before composite tenant FKs use them. Public reads must never include athlete IDs, private documents, payment data, user emails, token hashes, or raw audit metadata.

## Tasks

### Task 1: Failing API Tests For Core Bracket Behavior

**Files:**

- Create `apps/api/test/phase-12-bracketing.spec.ts`

- [x] **Step 1: Add failing memory-backed tests**

Create tests covering:

```ts
it('creates and publishes a single elimination bracket and advances verified winners', async () => {
  // Arrange four approved teams in an approved knockout tournament.
  // POST /api/tournaments/:id/brackets with format single_elimination and seeded team IDs.
  // POST /api/brackets/:id/publish.
  // Submit and verify first-round match results.
  // Expect next-round node to contain the winners and public view to omit athleteIds.
});

it('creates a double elimination bracket with winners and losers paths', async () => {
  // Arrange four approved teams.
  // Create/publish double_elimination bracket.
  // Verify one winners-bracket match.
  // Expect loserTeamId to route to a losers-side node and winnerTeamId to route forward.
});

it('ranks group standings with points, goal difference, head-to-head, and discipline', async () => {
  // Arrange a group_stage_knockout bracket with group A.
  // Record verified group match scores and disciplinary points.
  // GET standings.
  // Expect configured tiebreaker order to rank rows deterministically.
});

it('rejects destructive regenerate for a published bracket and creates a new version instead', async () => {
  // Publish version 1.
  // POST /api/brackets/:id/regenerate without createNewVersion.
  // Expect 400.
  // POST with createNewVersion true.
  // Expect versionNumber 2 and version 1 still readable.
});
```

- [x] **Step 2: Run the failing tests**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-12-bracketing.spec.ts
```

Expected: fails because bracket endpoints/module do not exist.

### Task 2: Bracket Engine

**Files:**

- Create `apps/api/src/brackets/bracket-engine.ts`

- [x] **Step 1: Implement engine types and generation**

Add pure functions:

```ts
generateSingleElimination(input): { seeds; nodes }
generateDoubleElimination(input): { seeds; nodes }
generateGroupStandings(input): StandingRowRecord[]
advanceBracketNode(nodes, match): BracketNodeRecord[]
toPublicBracketView(bracket, version, seeds, nodes, standings, teams)
```

Rules:

- Seed numbers are stable.
- Locked seeds cannot be moved by update/regeneration payloads.
- Byes advance automatically without creating fake private teams.
- Single elimination pads to the next power of two.
- Double elimination must create winners and losers side nodes for four-team and eight-team brackets at minimum.
- Standings default points: win 3, draw 1, loss 0.
- Tiebreaker order: points, goalDifference, goalsFor, headToHeadPoints, lower disciplinaryPoints, team name.
- Public DTO includes team IDs, team names, seed numbers, round/position, scores, status, and public slug only.

- [x] **Step 2: Run focused engine tests through API suite**

Run the Phase 12 spec again after the module exists. Expected engine-specific assertions pass once service/repository wiring is complete.

### Task 3: In-Memory Repository And Store Operations

**Files:**

- Modify `apps/api/src/common/store.ts`
- Modify `apps/api/src/repositories/repository.types.ts`
- Modify `apps/api/src/repositories/memory-repositories.ts`
- Modify `apps/api/src/repositories/repository.module.ts`
- Modify `apps/api/test/repository.module.spec.ts`

- [x] **Step 1: Add repository contract**

Add `BRACKET_REPOSITORY` and `BracketRepository` methods:

```ts
createBracket(actor, tournamentId, input)
updateSeeds(actor, bracketId, input)
publishBracket(actor, bracketId)
regenerateBracket(actor, bracketId, input)
getBracket(bracketId, versionId?)
getPublicBracket(slug)
listStandings(bracketId, groupKey?)
advanceFromVerifiedMatch(actor, matchId)
```

- [x] **Step 2: Add store maps and clone helpers**

Add maps for brackets, versions, seeds, nodes, standings, and public slugs. Clone array fields (`sourceNodeIds`) and never return mutable references.

- [x] **Step 3: Add store operations**

Implement tournament/team validation, seed validation, version creation, publishing, regeneration guard, standings rebuild, public DTO reads, and audit logs:

```ts
bracket.created;
bracket.seeded;
bracket.published;
bracket.regenerated;
bracket.advanced;
```

- [x] **Step 4: Hook match verification**

After `verifyMatch()` marks a match verified, call bracket advancement for any bracket node linked to that match. Advancement must be idempotent if the same verified match is processed twice.

- [x] **Step 5: Run focused tests**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-12-bracketing.spec.ts test/repository.module.spec.ts
```

Expected: pass after Task 4 API wiring.

### Task 4: Bracket API Module

**Files:**

- Create `apps/api/src/brackets/brackets.controller.ts`
- Create `apps/api/src/brackets/brackets.service.ts`
- Create `apps/api/src/brackets/brackets.module.ts`
- Modify `apps/api/src/app.module.ts`
- Modify `apps/api/src/common/permissions.ts`

- [x] **Step 1: Add endpoints**

Add:

```txt
POST /api/tournaments/:tournamentId/brackets
POST /api/brackets/:bracketId/seeds
POST /api/brackets/:bracketId/publish
POST /api/brackets/:bracketId/regenerate
GET  /api/brackets/:bracketId
GET  /api/brackets/:bracketId/standings
GET  /api/public/brackets/:slug
```

- [x] **Step 2: Add validation**

Reject:

- Unknown tournament.
- Tournament with fewer than two approved teams.
- Duplicate seed numbers or duplicate team IDs.
- Seed changes to locked seeds.
- Destructive regeneration of published brackets unless `createNewVersion: true`.
- Public reads by private ID; public uses slug only.

- [x] **Step 3: Add permissions**

Use role/permission patterns already in the API:

- `super_admin`: create, seed, publish, regenerate, read.
- `school_admin`, `coach`, `referee`, `federation_admin`, `government_viewer`: read.
- Public route: public-safe only.

- [x] **Step 4: Run focused tests**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api typecheck
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-12-bracketing.spec.ts
```

Expected: typecheck and memory API tests pass.

### Task 5: PostgreSQL Schema And Repository Parity

**Files:**

- Modify `packages/db/src/schema.ts`
- Create `packages/db/drizzle/0009_phase_12_bracketing.sql`
- Modify `packages/db/drizzle/meta/_journal.json`
- Create `packages/db/drizzle/meta/0009_snapshot.json`
- Modify `packages/db/src/schema.test.ts`
- Modify `apps/api/src/repositories/postgres-repositories.ts`
- Create `apps/api/test/phase-12-postgres-bracketing.spec.ts`

- [x] **Step 1: Add schema tables**

Create:

- `brackets`
- `bracket_versions`
- `bracket_seeds`
- `bracket_nodes`
- `standing_rows`

Required indexes:

- `(tenant_id)`
- `(tournament_id)`
- `(bracket_id)`
- `(version_id)`
- unique `(tenant_id, id)` where composite tenant FKs depend on it
- unique public slug when present
- unique `(version_id, team_id)` for seeds
- unique `(version_id, seed_number)` for seeds
- unique `(version_id, round, position, bracket_side)` for nodes

- [x] **Step 2: Add Postgres repository**

Implement the same repository contract as memory with transactions for:

- create bracket + version + seeds + nodes + matches + audit
- seed update + audit
- publish + slug + audit
- regenerate + version + audit
- match verification advancement + audit

- [x] **Step 3: Add guarded Postgres e2e**

Test the same single-elimination publish/advance/public-safe flow under:

```bash
ATHLETIQ_DATABASE_E2E=1 ATHLETIQ_DATA_BACKEND=postgres
```

- [x] **Step 4: Run DB verification**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C packages/db test
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-12-postgres-bracketing.spec.ts
```

Expected: DB schema tests pass; Postgres e2e skips unless database guard is enabled.

### Task 6: Documentation And Full Verification

**Files:**

- Modify `README.md`
- Modify `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`
- Modify this plan file checkboxes as tasks complete.

- [x] **Step 1: Document operations**

Document:

- Canonical bracket versions.
- Public-safe bracket views.
- Seed locking.
- Regeneration rules.
- Verified-result advancement.
- Standings tiebreakers.
- Postgres guard command.

- [x] **Step 2: Run full gate**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm format:check
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm lint
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm typecheck
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm test
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm build
```

Expected: all pass.

- [x] **Step 3: Self-review**

Review for:

- Public response leaks.
- Cross-tenant Postgres joins.
- Duplicate advancement from repeated verification.
- Published bracket mutation without versioning.
- Locked seed mutation.
- Match IDs linked to generated bracket nodes.

---

## Acceptance Checklist

- [x] Single elimination bracket advances winners correctly.
- [x] Double elimination routes winners and losers correctly for at least four teams.
- [x] Group standings apply points, goal difference, head-to-head, disciplinary points, and name tiebreakers in configured order.
- [x] Published bracket cannot be destructively regenerated without creating a new bracket version.
- [x] Public bracket view never exposes private athlete data.
- [x] Memory and Postgres repositories expose the same behavior.
- [x] Bracket changes are audited.
- [x] Master plan Phase 12 status is updated.
