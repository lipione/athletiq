# ATHLETIQ Phase 13 Facilities, Officials, And Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add venue inventory, availability constraints, official management, conflict-aware match scheduling, publish notifications, and payout export foundations.

**Architecture:** Scheduling is canonical backend state attached to real matches, not calendar-only UI data. The scheduler reads tournament matches, teams, schools, venue units, availability windows, rest rules, and official assignments, then writes auditable schedule slots with deterministic conflict warnings. Memory and Postgres repositories must expose equivalent behavior.

**Tech Stack:** NestJS, TypeScript, Drizzle/PostgreSQL, Vitest, Supertest, existing ATHLETIQ repository abstraction, existing audit/tenant patterns.

---

## Scope

This phase delivers backend/data infrastructure for real tournament logistics:

- Facilities and playable units such as fields, courts, lanes, and rooms.
- Availability and blackout windows for venue units, schools, and officials.
- Official profiles, certifications, assignments, acceptance, check-in, and reports.
- Conflict-aware auto-scheduler with manual override.
- Schedule publish/unpublish and notification records.
- Official payout export records.

Polished calendar UI, drag/drop timeline editing, SMS/email delivery, map routing, and payroll processor integrations are deferred to later phases. This phase stores durable notification/export records so those systems can attach later without changing scheduling truth.

## Files

- Create `apps/api/src/scheduling/scheduling.controller.ts`: facilities, availability, scheduler, assignments, notifications, payout endpoints.
- Create `apps/api/src/scheduling/scheduling.service.ts`: input validation and orchestration.
- Create `apps/api/src/scheduling/scheduling.module.ts`: module registration.
- Create `apps/api/src/scheduling/scheduling-engine.ts`: pure overlap/rest/blackout scheduler helpers.
- Modify `apps/api/src/app.module.ts`: import `SchedulingModule`.
- Modify `apps/api/src/common/store.ts`: in-memory records/maps, scheduling operations, audit hooks.
- Modify `apps/api/src/common/permissions.ts`: scheduling permissions.
- Modify `apps/api/src/repositories/repository.types.ts`: scheduling repository token, input types, records, methods.
- Modify `apps/api/src/repositories/memory-repositories.ts`: `MemorySchedulingRepository`.
- Modify `apps/api/src/repositories/postgres-repositories.ts`: `PostgresSchedulingRepository`.
- Modify `apps/api/src/repositories/repository.module.ts`: route memory/Postgres scheduling repository.
- Modify `apps/api/test/repository.module.spec.ts`: scheduling repository routing assertion.
- Create `apps/api/test/phase-13-scheduling.spec.ts`: memory HTTP/API behavior tests.
- Create `apps/api/test/phase-13-postgres-scheduling.spec.ts`: guarded Postgres parity test.
- Modify `packages/db/src/schema.ts`: scheduling tables.
- Create `packages/db/drizzle/0010_phase_13_scheduling.sql`: scheduling tables migration.
- Create `packages/db/drizzle/0011_phase_13_scheduling_hardening.sql`: official home-school FK hardening migration.
- Modify `packages/db/drizzle/meta/_journal.json` and add `packages/db/drizzle/meta/0010_snapshot.json` / `0011_snapshot.json`.
- Modify `packages/db/src/schema.test.ts`: table/index/FK assertions.
- Modify `README.md`: scheduling operations and guarded Postgres command.
- Modify `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`: mark Phase 13 plan and completion when done.

## Data Model

Add these record types in `apps/api/src/common/store.ts` and repository interfaces:

```ts
export type VenueUnitType = 'field' | 'court' | 'lane' | 'room';
export type VenueUnitStatus = 'active' | 'maintenance' | 'inactive';
export type AvailabilityResourceType = 'venue_unit' | 'school' | 'official';
export type AvailabilityStatus = 'available' | 'blackout';
export type MatchScheduleStatus = 'draft' | 'published' | 'unpublished';
export type OfficialAssignmentStatus = 'proposed' | 'accepted' | 'declined' | 'checked_in';
export type NotificationStatus = 'pending' | 'read';
export type PayoutExportStatus = 'draft' | 'exported' | 'reconciled';

export interface FacilityRecord {
  id: string;
  name: string;
  location: string;
  timezone: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueUnitRecord {
  id: string;
  facilityId: string;
  name: string;
  unitType: VenueUnitType;
  sports: string[];
  status: VenueUnitStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityWindowRecord {
  id: string;
  resourceType: AvailabilityResourceType;
  resourceId: string;
  tournamentId?: string;
  startsAt: string;
  endsAt: string;
  status: AvailabilityStatus;
  reason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficialProfileRecord {
  id: string;
  userId: string;
  displayName: string;
  sports: string[];
  certificationLevel?: string;
  homeSchoolId?: string;
  payoutRate?: number;
  payoutCurrency?: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchScheduleRecord {
  id: string;
  tournamentId: string;
  matchId: string;
  venueUnitId: string;
  startsAt: string;
  endsAt: string;
  status: MatchScheduleStatus;
  conflictWarnings: string[];
  overrideReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedBy?: string;
}

export interface OfficialAssignmentRecord {
  id: string;
  matchId: string;
  officialProfileId: string;
  role: 'referee' | 'assistant_referee' | 'scorer' | 'timekeeper';
  status: OfficialAssignmentStatus;
  assignedBy: string;
  assignedAt: string;
  respondedAt?: string;
  checkedInAt?: string;
  report?: string;
}

export interface ScheduleNotificationRecord {
  id: string;
  recipientUserId: string;
  tournamentId: string;
  resourceType: 'schedule' | 'official_assignment';
  resourceId: string;
  type: 'schedule_published' | 'assignment_created' | 'assignment_changed';
  message: string;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
}

export interface OfficialPayoutExportRecord {
  id: string;
  tournamentId: string;
  officialProfileId: string;
  assignmentIds: string[];
  amount: number;
  currency: string;
  status: PayoutExportStatus;
  createdBy: string;
  createdAt: string;
  reconciledAt?: string;
}
```

Postgres tables mirror these records and include `tenant_id` on each table. Composite tenant FKs must reference existing `(tenant_id, id)` unique indexes where appropriate.

## API Surface

Add endpoints:

```txt
POST /api/facilities
POST /api/facilities/:facilityId/units
GET  /api/facilities
POST /api/scheduling/availability
GET  /api/scheduling/availability?resourceType=&resourceId=&tournamentId=
POST /api/officials/profiles
GET  /api/officials/profiles
POST /api/tournaments/:tournamentId/schedule/generate
POST /api/matches/:matchId/schedule/override
GET  /api/tournaments/:tournamentId/schedule
POST /api/tournaments/:tournamentId/schedule/publish
POST /api/tournaments/:tournamentId/schedule/unpublish
POST /api/matches/:matchId/officials
POST /api/official-assignments/:assignmentId/respond
POST /api/official-assignments/:assignmentId/check-in
GET  /api/scheduling/notifications
POST /api/tournaments/:tournamentId/official-payouts/export
```

Permissions:

- `super_admin`: all scheduling/facility/official operations.
- `referee`: read own official profile, respond to own assignment, check in to own assignment, read own notifications.
- `school_admin`, `coach`, `federation_admin`, `government_viewer`: read tournament schedule.

## Tasks

### Task 1: Failing Scheduling API Tests

**Files:**

- Create `apps/api/test/phase-13-scheduling.spec.ts`

- [x] **Step 1: Add memory-backed acceptance tests**

Create tests with local helpers copied from Phase 12 style:

```ts
it('generates non-overlapping field schedules', async () => {
  // Arrange approved tournament, four schools/teams, two matches, one facility unit.
  // POST /api/tournaments/:id/schedule/generate with slotMinutes 60.
  // Expect two schedule rows for the same venueUnitId with non-overlapping startsAt/endsAt.
});

it('respects school blackout windows and minimum rest rules', async () => {
  // Arrange two matches involving the same school.
  // Add school blackout for the first slot.
  // Generate with minRestMinutes 120.
  // Expect no match inside blackout and at least 120 minutes between that school team's matches.
});

it('prevents overlapping official assignments', async () => {
  // Arrange two matches scheduled at the same time on two units.
  // Create one referee profile and assign to first match.
  // Attempt assign same official to second match.
  // Expect 400.
});

it('requires reason for conflict override and audits accepted override', async () => {
  // Arrange an existing schedule.
  // Override another match into the same unit/time with allowConflicts true and no reason.
  // Expect 400.
  // Retry with reason.
  // Expect conflictWarnings and audit action schedule.override.
});

it('published schedule changes create notifications', async () => {
  // Arrange a scheduled match with proposed official assignment.
  // Publish tournament schedule.
  // GET /api/scheduling/notifications as official user.
  // Expect schedule_published or assignment_changed notification.
});
```

- [x] **Step 2: Run failing tests**

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-13-scheduling.spec.ts
```

Expected: fails because scheduling module/endpoints do not exist.

### Task 2: Scheduling Engine

**Files:**

- Create `apps/api/src/scheduling/scheduling-engine.ts`

- [x] **Step 1: Implement pure time helpers**

Add:

```ts
export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  return (
    new Date(aStart).getTime() < new Date(bEnd).getTime() &&
    new Date(bStart).getTime() < new Date(aEnd).getTime()
  );
};

export const addMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
```

- [x] **Step 2: Implement conflict detection**

Add `detectScheduleConflicts(candidate, context)` returning warning strings:

- `venue_unit_overlap`
- `school_blackout`
- `team_rest_window`
- `official_overlap`
- `official_blackout`

- [x] **Step 3: Implement deterministic slot search**

Add `generateScheduleSlots(input)`:

- Sort matches by current `scheduledAt`, then `id`.
- Iterate candidate times in `slotMinutes`.
- Iterate venue units in input order.
- Accept the first candidate with no hard conflicts.
- Return scheduled rows and skipped match IDs.

- [x] **Step 4: Run focused tests**

Run the Phase 13 test. Expected: still fails until store/repository/API wiring exists.

### Task 3: Store And Repository Contract

**Files:**

- Modify `apps/api/src/common/store.ts`
- Modify `apps/api/src/repositories/repository.types.ts`
- Modify `apps/api/src/repositories/memory-repositories.ts`
- Modify `apps/api/src/repositories/repository.module.ts`
- Modify `apps/api/test/repository.module.spec.ts`

- [x] **Step 1: Add repository token and input types**

Add `SCHEDULING_REPOSITORY`, `SchedulingRepository`, and input DTO types:

```ts
createFacility(actor, input);
createVenueUnit(actor, facilityId, input);
listFacilities();
createAvailability(actor, input);
listAvailability(filter);
createOfficialProfile(actor, input);
listOfficialProfiles();
generateSchedule(actor, tournamentId, input);
overrideMatchSchedule(actor, matchId, input);
listTournamentSchedule(actor, tournamentId);
publishSchedule(actor, tournamentId);
unpublishSchedule(actor, tournamentId);
assignOfficial(actor, matchId, input);
respondToAssignment(actor, assignmentId, input);
checkInAssignment(actor, assignmentId);
listNotifications(actor);
exportOfficialPayouts(actor, tournamentId);
```

- [x] **Step 2: Add in-memory maps and clone helpers**

Add maps for facilities, venue units, availability windows, official profiles, match schedules, official assignments, notifications, and payout exports. Clone array fields (`sports`, `conflictWarnings`, `assignmentIds`) before returning.

- [x] **Step 3: Implement validation and operations**

Rules:

- Facility names and venue unit names are required.
- Venue units must belong to an existing facility.
- Availability windows require `startsAt < endsAt`.
- Official profiles must reference an existing user with referee or super admin role.
- Generate schedule requires at least one venue unit and at least one match.
- Manual conflict override with warnings requires `allowConflicts: true` and non-empty `reason`.
- Official assignment requires a scheduled match and no overlapping assignment for that official.
- Publish marks draft rows published and creates notifications for assignment officials.
- Unpublish marks published rows unpublished and audits the action.

- [x] **Step 4: Add audit actions**

Record:

```txt
facility.created
venue_unit.created
availability.created
official.created
schedule.generated
schedule.override
schedule.published
schedule.unpublished
official.assigned
official.responded
official.checked_in
official_payout.exported
```

### Task 4: Scheduling API Module

**Files:**

- Create `apps/api/src/scheduling/scheduling.controller.ts`
- Create `apps/api/src/scheduling/scheduling.service.ts`
- Create `apps/api/src/scheduling/scheduling.module.ts`
- Modify `apps/api/src/app.module.ts`
- Modify `apps/api/src/common/permissions.ts`

- [x] **Step 1: Add service validation**

Trim string IDs, reject missing bodies, normalize dates to ISO strings, and pass typed input to the repository. Keep controller thin.

- [x] **Step 2: Add controller endpoints**

Implement the API surface listed above using `@Roles` and `@Permissions`.

- [x] **Step 3: Add module import**

Import `SchedulingModule` in `AppModule`.

- [x] **Step 4: Run focused memory tests**

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api typecheck
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-13-scheduling.spec.ts test/repository.module.spec.ts
```

Expected: pass.

### Task 5: PostgreSQL Schema And Repository Parity

**Files:**

- Modify `packages/db/src/schema.ts`
- Create `packages/db/drizzle/0010_phase_13_scheduling.sql`
- Modify `packages/db/drizzle/meta/_journal.json`
- Create `packages/db/drizzle/meta/0010_snapshot.json`
- Modify `packages/db/src/schema.test.ts`
- Modify `apps/api/src/repositories/postgres-repositories.ts`
- Create `apps/api/test/phase-13-postgres-scheduling.spec.ts`

- [x] **Step 1: Add schema tables**

Create:

- `facilities`
- `venue_units`
- `availability_windows`
- `official_profiles`
- `match_schedules`
- `official_assignments`
- `schedule_notifications`
- `official_payout_exports`

Required indexes:

- `(tenant_id)` on every table.
- `(facility_id)` on venue units.
- `(resource_type, resource_id)` and `(tournament_id)` on availability windows.
- unique `(tenant_id, user_id)` on official profiles.
- unique `(match_id)` on match schedules.
- `(tournament_id, status)` on match schedules.
- `(match_id)` and `(official_profile_id)` on assignments.
- `(recipient_user_id, status)` on notifications.
- `(tournament_id, official_profile_id)` on payout exports.
- unique `(tenant_id, id)` on each table for composite tenant FKs.

- [x] **Step 2: Implement Postgres repository**

Use transactions for schedule generation, manual override, publish/unpublish, official assignment, check-in, and payout export. Update `matches.scheduled_at` when a match schedule row is created or overridden.

- [x] **Step 3: Add guarded Postgres e2e**

Cover:

- Schedule generation avoids venue overlap.
- Official assignment overlap is rejected.
- Publish creates notification rows.

Run under:

```bash
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq \
ATHLETIQ_DATABASE_E2E=1 \
ATHLETIQ_DATA_BACKEND=postgres \
pnpm -C apps/api exec vitest run test/phase-13-postgres-scheduling.spec.ts
```

### Task 6: Documentation And Full Verification

**Files:**

- Modify `README.md`
- Modify this plan file checkboxes as tasks complete.
- Modify `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`

- [x] **Step 1: Document operations**

Document facilities, availability windows, auto-scheduler constraints, manual override policy, official assignments, publish notifications, payout exports, and Postgres guard command.

- [x] **Step 2: Run full gate**

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm format:check
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm lint
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm typecheck
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm test
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm build
PATH="/Users/abhi/Library/pnpm/bin:$PATH" DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq pnpm -C packages/db db:migrate
```

- [x] **Step 3: Self-review**

Review for:

- Public/private notification leaks.
- Cross-tenant Postgres joins.
- Venue, school, and official overlap correctness.
- Manual override without audit or reason.
- Published schedule mutation without notifications.
- Generated match schedule and `matches.scheduledAt` drift.

## Acceptance Checklist

- [x] Scheduler does not assign two matches to the same field at the same time.
- [x] Scheduler respects school blackout windows and minimum rest rules.
- [x] Official cannot be assigned to overlapping matches.
- [x] Manual override requires reason and writes audit log.
- [x] Published schedule changes create notifications.
- [x] Memory and Postgres repositories expose equivalent behavior.
- [x] Master plan Phase 13 status is updated.
