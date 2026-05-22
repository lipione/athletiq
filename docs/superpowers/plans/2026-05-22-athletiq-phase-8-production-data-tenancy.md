# ATHLETIQ Phase 8 Production Data Layer And Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the prototype `AppDataStore` persistence path with production-ready PostgreSQL schema, repository boundaries, and tenant isolation while preserving all existing API behavior.

**Architecture:** Phase 8 keeps the modular NestJS monolith, but moves source-of-truth data access behind explicit repository ports. The in-memory store remains only as a test/development fallback until every bounded context has a PostgreSQL repository and database-backed e2e coverage.

**Tech Stack:** TypeScript, NestJS, Drizzle ORM, PostgreSQL, pnpm, Vitest, Supertest.

---

## Current State

- Runtime data is centralized in `apps/api/src/common/store.ts`.
- PostgreSQL and Drizzle exist in `packages/db`, but API behavior is not yet normalized around relational repositories.
- Tests exercise endpoint behavior with the in-memory store.
- Phase 8 must preserve all current tests while adding database schema and tenant-isolation coverage.

## File Structure

**Create:**

- `apps/api/src/database/database.module.ts`: Nest module that creates a database connection provider only when `ATHLETIQ_DATA_BACKEND=postgres`.
- `apps/api/src/database/database.tokens.ts`: DI token constants for database/repository providers.
- `apps/api/src/database/database.service.ts`: Lifecycle-managed Drizzle/Postgres wrapper.
- `apps/api/src/tenancy/tenant.types.ts`: Tenant scope and tenant-aware actor types.
- `apps/api/src/tenancy/tenancy.service.ts`: Tenant resolution and authorization helpers.
- `apps/api/src/tenancy/tenancy.module.ts`: Nest module exporting `TenancyService`.
- `apps/api/src/repositories/repository.types.ts`: Repository interfaces grouped by bounded context.
- `apps/api/src/repositories/repository.module.ts`: Provider selection for memory and PostgreSQL repositories.
- `apps/api/src/repositories/memory-repositories.ts`: Adapter around existing `AppDataStore` methods so services can migrate incrementally.
- `apps/api/src/repositories/postgres-repositories.ts`: PostgreSQL repository implementations.
- `apps/api/test/phase-8-tenancy.spec.ts`: API-level tenancy and data-isolation tests.
- `packages/db/src/schema.test.ts`: Schema export and table-shape smoke tests.

**Modify:**

- `packages/db/src/schema.ts`: Add normalized Phase 8 tables, tenant columns, indexes, and unique constraints.
- `packages/db/drizzle/*.sql`: Add migration for Phase 8 tables.
- `apps/api/src/app.module.ts`: Import database, tenancy, and repository modules.
- `apps/api/src/common/store.ts`: Keep as compatibility layer, but remove long-term responsibility for persistence snapshots.
- Existing module services: migrate reads/writes from `AppDataStore` to repositories bounded-context by bounded-context.

## Task 1: Normalize Database Schema For Phase 8

**Files:**

- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/src/schema.test.ts`
- Create: `packages/db/drizzle/0002_phase_8_tenancy.sql`

- [x] **Step 1: Add schema smoke tests**

Create `packages/db/src/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  auditLogs,
  athletes,
  matchEvents,
  matches,
  qrCodes,
  schools,
  syncMutations,
  teams,
  tenants,
  tournaments,
  users,
} from './schema.js';

describe('database schema exports', () => {
  it('exports tenant-aware core tables', () => {
    expect(tenants).toBeDefined();
    expect(users).toBeDefined();
    expect(schools).toBeDefined();
    expect(athletes).toBeDefined();
    expect(tournaments).toBeDefined();
    expect(teams).toBeDefined();
    expect(matches).toBeDefined();
    expect(matchEvents).toBeDefined();
    expect(qrCodes).toBeDefined();
    expect(syncMutations).toBeDefined();
    expect(auditLogs).toBeDefined();
  });
});
```

- [x] **Step 2: Run the failing schema test**

Run: `pnpm -C packages/db test`

Expected: fail because `tenants`, `matchEvents`, `qrCodes`, or `syncMutations` are not exported yet.

- [x] **Step 3: Extend `packages/db/src/schema.ts`**

Add:

```ts
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: varchar('id', { length: 64 }).primaryKey(),
  type: varchar('type', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Then add tenant-aware columns and normalized tables for:

```txt
school_users
guardians
athlete_guardians
tournament_registrations
team_members
match_events
qr_codes
sync_mutations
federation_overrides
```

Add indexes for:

```txt
tenant_id
school_id
tournament_id
match_id
athlete_id
team_id
created_at
```

Add unique constraints for:

```txt
users.email
athletes.athletiq_id
qr_codes.code
sync_mutations(tenant_id, client_id, mutation_id)
```

- [x] **Step 4: Add the SQL migration**

Create `packages/db/drizzle/0002_phase_8_tenancy.sql` containing the equivalent `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, and `CREATE UNIQUE INDEX` statements for the Phase 8 schema additions.

- [x] **Step 5: Run schema verification**

Run:

```bash
pnpm -C packages/db lint
pnpm -C packages/db typecheck
pnpm -C packages/db test
```

Expected: all pass.

## Task 2: Add Database And Tenancy Modules

**Files:**

- Create: `apps/api/src/database/database.tokens.ts`
- Create: `apps/api/src/database/database.service.ts`
- Create: `apps/api/src/database/database.module.ts`
- Create: `apps/api/src/tenancy/tenant.types.ts`
- Create: `apps/api/src/tenancy/tenancy.service.ts`
- Create: `apps/api/src/tenancy/tenancy.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/phase-8-tenancy.spec.ts`

- [x] **Step 1: Write tenancy tests first**

Create `apps/api/test/phase-8-tenancy.spec.ts` with tests that:

```ts
import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const headersFor = (user: { id: string; role: string }) => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

describe('phase 8 tenancy isolation', () => {
  it('prevents a school admin from creating a team for another school', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const api = request(app.getHttpServer());
    const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };

    const schoolAdminA = await api
      .post('/api/auth/register')
      .send({
        email: `a_${Date.now()}@athletiq.local`,
        password: 'password123',
        role: 'school_admin',
      })
      .expect(201);

    const schoolAdminB = await api
      .post('/api/auth/register')
      .send({
        email: `b_${Date.now()}@athletiq.local`,
        password: 'password123',
        role: 'school_admin',
      })
      .expect(201);

    const schoolA = await api
      .post('/api/schools')
      .set(headersFor({ id: schoolAdminA.body.user.id, role: 'school_admin' }))
      .send({ name: 'Tenant A' })
      .expect(201);
    const schoolB = await api
      .post('/api/schools')
      .set(headersFor({ id: schoolAdminB.body.user.id, role: 'school_admin' }))
      .send({ name: 'Tenant B' })
      .expect(201);
    await api
      .post(`/api/schools/${schoolA.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);
    await api
      .post(`/api/schools/${schoolB.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({
        name: 'Tenant Cup',
        sport: 'football',
        format: 'league',
      })
      .expect(201);
    await api
      .post(`/api/tournaments/${tournament.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);
    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor({ id: schoolAdminB.body.user.id, role: 'school_admin' }))
      .send({ schoolId: schoolB.body.id })
      .expect(201);

    await api
      .post('/api/teams')
      .set(headersFor({ id: schoolAdminA.body.user.id, role: 'school_admin' }))
      .send({
        tournamentId: tournament.body.id,
        schoolId: schoolB.body.id,
        name: 'Illegal Team',
        athleteIds: ['ath_missing'],
      })
      .expect(403);

    await app.close();
  });
});
```

- [x] **Step 2: Implement tenancy types**

Create `apps/api/src/tenancy/tenant.types.ts`:

```ts
import type { AuthenticatedUser } from '../common/store.js';

export type TenantType = 'platform' | 'school' | 'federation' | 'government';

export type TenantScope = {
  tenantId: string;
  tenantType: TenantType;
  actor: AuthenticatedUser;
};
```

- [x] **Step 3: Implement tenancy service**

Create `apps/api/src/tenancy/tenancy.service.ts`:

```ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/store.js';
import type { TenantScope } from './tenant.types.js';

@Injectable()
export class TenancyService {
  resolveActorScope(actor: AuthenticatedUser): TenantScope {
    if (actor.role === 'super_admin') {
      return { tenantId: 'platform', tenantType: 'platform', actor };
    }
    if (actor.role === 'federation_admin') {
      return { tenantId: `federation:${actor.id}`, tenantType: 'federation', actor };
    }
    if (actor.role === 'government_viewer') {
      return { tenantId: `government:${actor.id}`, tenantType: 'government', actor };
    }
    const schoolId = actor.schoolIds[0];
    if (!schoolId) {
      throw new ForbiddenException('User is not linked to a school tenant');
    }
    return { tenantId: schoolId, tenantType: 'school', actor };
  }

  assertSchoolAccess(actor: AuthenticatedUser, schoolId: string) {
    if (actor.role === 'super_admin') {
      return;
    }
    if (!actor.schoolIds.includes(schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }
  }
}
```

- [x] **Step 4: Wire modules**

Create `apps/api/src/tenancy/tenancy.module.ts` and import it into `AppModule`.

- [x] **Step 5: Run tenancy tests**

Run: `pnpm -C apps/api test -- phase-8-tenancy.spec.ts`

Expected: pass after wiring.

## Task 3: Add Repository Contracts And Memory Adapter

**Files:**

- Create: `apps/api/src/repositories/repository.types.ts`
- Create: `apps/api/src/repositories/memory-repositories.ts`
- Create: `apps/api/src/repositories/repository.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: existing API tests.

- [x] **Step 1: Define repository interfaces**

Create interfaces for:

```txt
UserRepository
SchoolRepository
AthleteRepository
TournamentRepository
TeamRepository
MatchRepository
AuditRepository
QrRepository
SyncRepository
AnalyticsRepository
```

Each interface must map to current service needs without exposing `AppDataStore`.

- [x] **Step 2: Implement memory adapter**

Create adapter classes that delegate to `AppDataStore` so services can migrate one bounded context at a time while preserving existing behavior.

- [x] **Step 3: Export repository providers**

Create `RepositoryModule` that provides memory repositories by default and can switch to PostgreSQL repositories when `ATHLETIQ_DATA_BACKEND=postgres`.

- [x] **Step 4: Verify no behavior change**

Run:

```bash
pnpm -C apps/api lint
pnpm -C apps/api typecheck
pnpm -C apps/api test
```

Expected: all pass.

## Task 4: PostgreSQL Repositories For Identity, Schools, Athletes, And Audit

**Files:**

- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/schools/schools.service.ts`
- Modify: `apps/api/src/athletes/athletes.service.ts`
- Modify: `apps/api/src/audit/audit.controller.ts`
- Test: `apps/api/test/phase-8-tenancy.spec.ts`

- [x] **Step 1: Add repository-backed identity tests**

Add database-backend tests guarded by:

```ts
const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;
```

These tests must verify:

- User email uniqueness.
- School approval persists after app restart.
- Athlete approval persists and produces a unique ATHLETIQ ID.
- Audit logs remain append-only.

- [x] **Step 2: Implement PostgreSQL repositories**

Implement identity/school/athlete/audit CRUD with Drizzle transactions where writes affect multiple tables.

- [x] **Step 3: Preserve memory tests**

Run existing API tests with default memory backend.

- [x] **Step 4: Run optional database e2e**

With Docker Compose running:

```bash
ATHLETIQ_DATABASE_E2E=1 ATHLETIQ_DATA_BACKEND=postgres pnpm -C apps/api test -- phase-8-tenancy.spec.ts
```

Expected: database-backed tests pass.

## Task 5: PostgreSQL Repositories For Tournaments, Teams, Matches, Stats, QR, Sync, And Analytics

**Files:**

- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Modify service modules gradually to depend on repository interfaces.
- Test: `apps/api/test/phase-2-tournament.spec.ts`, `phase-4-stats.spec.ts`, `phase-5-qr.spec.ts`, `phase-6-sync.spec.ts`, `phase-7-analytics.spec.ts`.

- [x] **Step 1: Add database-backed end-to-end happy path**

Create a test that runs:

```txt
register users
create schools
approve schools
create tournament
register schools
approve athletes
create teams
create match
submit result
submit event
verify match
read leaderboard
generate QR
push duplicate sync mutation
read analytics overview
```

- [x] **Step 2: Implement tournament/team/match repositories**

Persist tournament registrations, team members, matches, results, match events, and event corrections in normalized tables.

- [x] **Step 3: Implement QR, sync, and analytics repositories**

Persist QR codes, sync mutations, audit logs, and read models needed by analytics.

- [x] **Step 4: Verify database and memory backends**

Run default tests and optional database e2e tests.

## Task 6: Remove Prototype Persistence Path

**Files:**

- Modify: `apps/api/src/common/store.ts`
- Modify: `packages/db/src/schema.ts`
- Modify: docs.

- [x] **Step 1: Remove JSON snapshot persistence from `AppDataStore`**

Remove `app_settings` snapshot persistence as an API runtime strategy after repositories are wired.

- [x] **Step 2: Keep `AppDataStore` only as test memory backend**

The class may remain for fast tests, but it must no longer pretend to be production persistence.

- [x] **Step 3: Update docs**

Document:

```txt
ATHLETIQ_DATA_BACKEND=memory for fast local tests
ATHLETIQ_DATA_BACKEND=postgres for staging/production and database e2e tests
```

- [x] **Step 4: Full verification**

Run:

```bash
pnpm -C . format:check
pnpm -C . lint
pnpm -C . typecheck
pnpm -C . test
pnpm -C . build
```

Expected: all pass.

## Self-Review Checklist

- [x] Every current API test still passes.
- [x] New tenancy tests cover cross-school access denial.
- [x] Database schema has tenant-aware indexes and uniqueness constraints.
- [x] PostgreSQL backend can run without `AppDataStore` snapshot persistence.
- [x] Memory backend remains available for fast tests only.
- [ ] No production path stores passwords in plaintext after Phase 9 begins.
- [ ] Phase 8 does not attempt Phase 9 auth changes prematurely.
