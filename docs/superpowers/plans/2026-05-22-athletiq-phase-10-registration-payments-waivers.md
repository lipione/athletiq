# ATHLETIQ Phase 10 Registration, Payments, Memberships, And Waivers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the backend foundation for school memberships, tournament fees, invoices, manual payments, refunds, discount codes, waiver signatures, and finance reporting.

**Architecture:** Add billing and waivers as first-class NestJS modules backed by repository interfaces. Keep the memory repository and PostgreSQL repository behavior equivalent, and gate tournament registration/team creation through service-level checks so existing free tournament flows keep working.

**Tech Stack:** NestJS, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Supertest.

---

## File Structure

- Modify `apps/api/src/common/store.ts`: add Phase 10 domain record types and memory store methods for billing and waivers.
- Modify `apps/api/src/repositories/repository.types.ts`: add `BILLING_REPOSITORY`, `WAIVER_REPOSITORY`, repository interfaces, inputs, and report result types.
- Modify `apps/api/src/repositories/memory-repositories.ts`: expose memory billing and waiver repositories over `AppDataStore`.
- Modify `apps/api/src/repositories/postgres-repositories.ts`: add PostgreSQL billing and waiver repositories and tournament fee mapping.
- Modify `apps/api/src/repositories/repository.module.ts`: register and export new repositories.
- Modify `packages/db/src/schema.ts`: add tournament fee columns and Phase 10 billing/waiver tables.
- Create `apps/api/src/billing/billing.module.ts`, `billing.service.ts`, `billing.controller.ts`.
- Create `apps/api/src/waivers/waivers.module.ts`, `waivers.service.ts`, `waivers.controller.ts`.
- Modify `apps/api/src/app.module.ts`: import billing and waiver modules.
- Modify `apps/api/src/tournaments/tournaments.service.ts`: require paid tournament fee before school registration when configured.
- Modify `apps/api/src/tournaments/tournaments.controller.ts`: no route shape change, but registration error behavior changes for paid tournaments.
- Modify `apps/api/src/teams/teams.service.ts`: require waiver signatures before athlete participation when configured.
- Modify `apps/api/src/common/permissions.ts`: add billing/waiver permissions to existing roles.
- Create `apps/api/test/phase-10-registration-payments-waivers.spec.ts`: memory-backed API acceptance tests.
- Create `apps/api/test/phase-10-postgres-billing-waivers.spec.ts`: guarded live PostgreSQL repository/API tests.
- Generate `packages/db/drizzle/0006_phase_10_registration_billing.sql` and matching Drizzle metadata.
- Modify `README.md`: document Phase 10 operational behavior and provider-adapter boundary.
- Modify `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`: mark Phase 10 plan and completion when verified.

## Task 1: Phase 10 API Acceptance Tests

**Files:**

- Create: `apps/api/test/phase-10-registration-payments-waivers.spec.ts`

- [x] **Step 1: Add failing tests for memberships, invoices, payments, refunds, waivers, and finance reports**

Use the existing Supertest helper style from `apps/api/test/phase-9-auth-security.spec.ts`. Cover these exact user stories:

```ts
it('school membership purchase stays pending until manual payment approval activates it', async () => {
  // Create school admin, approved school, membership plan.
  // Purchase the plan and expect invoice.status === 'open' and membership.status === 'pending'.
  // Approve a manual bank payment and expect invoice.status === 'paid' and membership.status === 'active'.
  // Read finance report and expect paidAmount to include the membership total.
});

it('tournament registration fee blocks registration until the invoice is paid', async () => {
  // Create and approve tournament, configure NPR registration fee, create registration invoice.
  // Attempt register-school before payment and expect 400 with payment required.
  // Approve manual payment, retry register-school, and expect schoolIds to include the school.
});

it('discount codes and installment schedules compute correct balances', async () => {
  // Create discount code worth 500 NPR, purchase 3500 NPR membership with two installments.
  // Expect subtotal 3500, discount 500, total 3000, balance 3000, and two installment records of 1500.
});

it('refunds create separate records and reduce report net revenue without deleting payment history', async () => {
  // Pay an invoice, refund part of the payment, and expect payment still present, refund present,
  // invoice.refundedAmount updated, and finance report netAmount reduced.
});

it('waiver requirement blocks team creation until each athlete has a valid signature', async () => {
  // Create active waiver template and tournament requirement.
  // Register school for free tournament, create approved athlete.
  // Team creation fails until a guardian signs the active waiver for the athlete.
});
```

- [x] **Step 2: Run the new test and verify it fails for missing routes**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-10-registration-payments-waivers.spec.ts
```

Expected: FAIL with 404 responses for `/api/billing/*` or `/api/waivers/*`.

## Task 2: Billing Domain And Memory Repository

**Files:**

- Modify: `apps/api/src/common/store.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/repository.module.ts`

- [x] **Step 1: Add billing record types and repository contract**

Add types for membership plans, school memberships, discount codes, invoices, invoice installments, payments, refunds, tournament fee config, and finance reports. Use integer minor units for money, with `amount` representing NPR paisa or the smallest unit for the configured currency.

- [x] **Step 2: Implement memory billing behavior**

Implement these methods in `AppDataStore` and expose them through `MemoryBillingRepository`:

```ts
createMembershipPlan(actor, input);
listMembershipPlans();
createDiscountCode(actor, input);
purchaseSchoolMembership(actor, schoolId, input);
configureTournamentRegistrationFee(actor, tournamentId, input);
createTournamentRegistrationInvoice(actor, tournamentId, schoolId, input);
ensureTournamentRegistrationPaymentSatisfied(tournamentId, schoolId);
recordManualPayment(actor, invoiceId, input);
refundPayment(actor, paymentId, input);
getFinanceReport(actor, input);
```

Rules:

- A zero-total invoice is immediately `paid`; otherwise it starts `open`.
- A school membership starts `pending` and becomes `active` only when its linked invoice is paid.
- Tournament registration invoices use `entityType: 'tournament_registration'` and `entityId: '<tournamentId>:<schoolId>'`.
- Refunds are append-only records and update invoice `refundedAmount`, `balanceAmount`, and status without deleting payments.
- `ensureTournamentRegistrationPaymentSatisfied` returns without error when a tournament has no required fee.
- Every mutation writes an audit log.

- [x] **Step 3: Register repository providers**

Add `BILLING_REPOSITORY` to `repository.types.ts`, `memoryRepositoryProviders`, `postgresRepositoryProviders`, `repositoryTokenProviders`, and exports. The temporary PostgreSQL implementation may throw until Task 5 completes, but TypeScript must compile.

## Task 3: Billing Module, Controller, And Tournament Gate

**Files:**

- Create: `apps/api/src/billing/billing.module.ts`
- Create: `apps/api/src/billing/billing.service.ts`
- Create: `apps/api/src/billing/billing.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/tournaments/tournaments.service.ts`
- Modify: `apps/api/src/common/permissions.ts`

- [x] **Step 1: Add billing API routes**

Create these endpoints:

```txt
POST /api/billing/membership-plans
GET  /api/billing/membership-plans
POST /api/billing/discount-codes
POST /api/billing/schools/:schoolId/memberships
POST /api/billing/tournaments/:tournamentId/registration-fee
POST /api/billing/tournaments/:tournamentId/schools/:schoolId/registration-invoice
POST /api/billing/invoices/:invoiceId/manual-payments
POST /api/billing/payments/:paymentId/refunds
GET  /api/billing/reports/finance
```

Role rules:

- `super_admin` can create plans, discounts, fees, payments, refunds, and read all finance reports.
- `school_admin` can purchase memberships, create tournament registration invoices for their school, submit manual payment records for their school invoices, and read school-scoped reports.
- `federation_admin` can read finance reports.

- [x] **Step 2: Validate service inputs**

Reject blank names, non-positive paid amounts, refund amounts greater than refundable payment balance, unsupported currencies, and payment methods outside `manual_cash` or `manual_bank` for Phase 10.

- [x] **Step 3: Gate tournament school registration**

Inject `BILLING_REPOSITORY` into `TournamentsService.registerSchool`. Before calling `TournamentRepository.registerSchool`, call:

```ts
await this.billing.ensureTournamentRegistrationPaymentSatisfied(tournamentId, schoolId.trim());
```

Keep existing free tournament behavior unchanged.

## Task 4: Waivers Domain, API, And Team Gate

**Files:**

- Modify: `apps/api/src/common/store.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/repository.module.ts`
- Create: `apps/api/src/waivers/waivers.module.ts`
- Create: `apps/api/src/waivers/waivers.service.ts`
- Create: `apps/api/src/waivers/waivers.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/teams/teams.service.ts`
- Modify: `apps/api/src/common/permissions.ts`

- [x] **Step 1: Add waiver record types and repository contract**

Add waiver templates, tournament waiver requirements, and waiver signatures. Store version, signer name, guardian relationship, signed IP, user agent, signed timestamp, and expiry timestamp.

- [x] **Step 2: Add waiver API routes**

Create these endpoints:

```txt
POST /api/waivers/templates
POST /api/waivers/tournaments/:tournamentId/requirements
POST /api/waivers/signatures
GET  /api/waivers/athletes/:athleteId/signatures
```

Role rules:

- `super_admin` can create templates and tournament requirements.
- `school_admin` can sign waivers for athletes in their school.
- `coach` can read athlete waiver status for assigned workflows only after later team assignment; Phase 10 can keep read access to school admins and super admins.

- [x] **Step 3: Gate team creation**

Inject `WAIVER_REPOSITORY` into `TeamsService.create`. Before calling `TeamRepository.create`, call:

```ts
await this.waivers.ensureTournamentWaiversSatisfied({
  tournamentId: payload.tournamentId.trim(),
  schoolId: payload.schoolId.trim(),
  athleteIds: payload.athleteIds,
});
```

No requirement means no gate.

## Task 5: PostgreSQL Schema, Migration, And Repositories

**Files:**

- Modify: `packages/db/src/schema.ts`
- Generate: `packages/db/drizzle/0006_phase_10_registration_billing.sql`
- Generate: `packages/db/drizzle/meta/0006_snapshot.json`
- Modify: `packages/db/drizzle/meta/_journal.json`
- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Create: `apps/api/test/phase-10-postgres-billing-waivers.spec.ts`

- [x] **Step 1: Add Drizzle tables and tournament columns**

Add nullable tournament registration fee columns to `tournaments` and new tables:

```txt
membership_plans
school_memberships
discount_codes
invoices
invoice_installments
payments
refunds
waiver_templates
tournament_waiver_requirements
waiver_signatures
```

Every table must include `tenant_id`, `created_at`, useful indexes, and tenant-aware foreign keys where matching tenant columns exist.

- [x] **Step 2: Generate migration**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C packages/db db:generate
```

Rename the generated SQL file to `0006_phase_10_registration_billing.sql` only if Drizzle generated a different readable name, and keep `_journal.json` consistent.

- [x] **Step 3: Implement PostgreSQL billing and waiver repositories**

Mirror memory behavior with database transactions for invoice payment, membership activation, tournament fee checks, refunds, and waiver satisfaction checks.

- [x] **Step 4: Add guarded live PostgreSQL tests**

The test file must skip unless `ATHLETIQ_DATABASE_E2E=1`. Cover:

- migration-backed table writes for plans, invoices, payments, refunds, and waivers.
- tournament registration payment gate.
- waiver gate before team creation.

Run:

```bash
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq ATHLETIQ_DATABASE_E2E=1 ATHLETIQ_DATA_BACKEND=postgres PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-10-postgres-billing-waivers.spec.ts
```

Expected: PASS.

## Task 6: Documentation, Plan Status, And Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`
- Modify: `docs/superpowers/plans/2026-05-22-athletiq-phase-10-registration-payments-waivers.md`

- [x] **Step 1: Document Phase 10 operations**

Add README notes covering:

- money stored in integer minor units.
- manual payment approval is auditable and is the Phase 10 payment adapter.
- payment provider adapter boundary supports Stripe/local gateways later.
- refunds are append-only.
- waiver signatures store version/IP/timestamp/user agent and can block athlete participation.

- [x] **Step 2: Run targeted and full verification**

Run:

```bash
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-10-registration-payments-waivers.spec.ts
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm format:check
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm lint
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm typecheck
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm test
PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm build
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C packages/db db:migrate
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq ATHLETIQ_DATABASE_E2E=1 ATHLETIQ_DATA_BACKEND=postgres PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/api exec vitest run test/phase-10-postgres-billing-waivers.spec.ts
```

- [x] **Step 3: Mark Phase 10 complete after verification**

Update this file and the master plan only after the full verification gate passes.

## Self-Review

- Spec coverage: This plan covers school memberships, annual billing, tournament registration fees, player-registration-ready invoice structure, discount codes, invoices, manual payments, refunds, finance reports, waiver templates, guardian signatures, waiver expiry, and audit history.
- Placeholder scan: The plan uses concrete file paths, endpoint shapes, method names, commands, and expected behavior.
- Type consistency: Repository method names are shared across memory, PostgreSQL, services, and tests.
