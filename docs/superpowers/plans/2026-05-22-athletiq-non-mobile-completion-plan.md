# ATHLETIQ Non-Mobile Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete ATHLETIQ's web and backend platform outside the mobile app, including production role provisioning, interactive tournament operations, OCR review UX, Postgres proof, and deployment readiness.

**Architecture:** Keep the current monorepo shape: NestJS API, repository abstraction over memory/Postgres, Next.js web workspaces, shared DB schema, and focused tests per phase. Each slice must be independently shippable, verified, committed, and pushed before the next broad slice.

**Tech Stack:** NestJS, Fastify, PostgreSQL/Drizzle, Next.js App Router, React, TypeScript, Vitest, Playwright/browser smoke checks, pnpm.

---

## File Structure

- `apps/api/src/auth/*`: production user provisioning, user list endpoint, validation, audit logging.
- `apps/api/src/common/permissions.ts`: `users.manage` permission for super-admin provisioning.
- `apps/api/src/repositories/*`: `UserRepository.list` for memory and Postgres.
- `apps/api/test/phase-9-auth-security.spec.ts`: auth provisioning security coverage.
- `apps/web/src/components/live/super-admin-console.tsx`: role-user provisioning panel and user roster.
- `apps/web/src/components/live/analytics-console.tsx`: real login/session path for federation/government users.
- `apps/web/src/components/live/bracket-operations-console.tsx` or existing bracket components: interactive seed editing, generation, advancement, reset, and public preview.
- `apps/web/src/components/live/document-review-console.tsx` or school admin console: document upload/extraction/review workflow.
- `apps/api/test/phase-18-advanced-analytics.spec.ts` and `apps/api/test/phase-19-integrations.spec.ts`: gated Postgres proof for reports/integrations tables.
- `packages/db/drizzle/meta/*`: repair missing Drizzle snapshot metadata for existing phase 18/19 migration if generation tooling permits.
- `docs/operations/production-readiness.md`: update remaining non-mobile readiness checklist.

## Task 1: Production Role User Provisioning

- [ ] Add `users.manage` to super-admin permissions only.
- [ ] Add `UserRepository.list()` to memory and Postgres repositories.
- [ ] Add `AuthService.provisionUser(actor, input)` and `AuthService.listUsers(actor)`.
- [ ] Add `POST /api/auth/users` and `GET /api/auth/users`, both super-admin only and permission-gated.
- [ ] Validate email, password length, role values, duplicate email, and empty role sets.
- [ ] Generate a one-time temporary password when the caller omits `password`; never return password hashes.
- [ ] Audit successful provisioning as `auth.user_provisioned`.
- [ ] Tests:
  - Public signup still rejects `super_admin`, `federation_admin`, and `government_viewer`.
  - Super admin provisions federation/government users and those users can log in.
  - Non-super-admin users cannot provision or list users.
  - User list omits password material.
- [ ] Web:
  - Add a super-admin provisioning panel for platform roles.
  - Show a role-user roster with email, roles, school count, and created date.
  - Keep dev headers as local fallback, but support bearer-token sessions.
- [ ] Verify with `pnpm --filter @athletiq/api test -- phase-9-auth-security.spec.ts`, web typecheck/tests, lint, format, build, and browser smoke.
- [ ] Commit: `feat: add production user provisioning`.

## Task 2: Interactive Tournament Bracketing

- [ ] Build live bracket operations UI against existing bracket endpoints.
- [ ] Support selecting/creating a tournament, editing seed slots, generating bracket nodes, recording winners, recalculating standings, and resetting/regenerating.
- [ ] Use stable board dimensions and dense operations UI; no nested cards.
- [ ] Render knockout, double-elimination, league, and group-stage states using existing API data.
- [ ] Add focused React tests for empty, generated, and advanced bracket states.
- [ ] Add API smoke tests only if endpoint behavior gaps are discovered.
- [ ] Browser-verify `/workspaces/super-admin` and relevant tournament/bracket route.
- [ ] Commit: `feat: add interactive bracket operations`.

## Task 3: OCR Document Review Workspace

- [ ] Build a live upload/extract/review panel for identity documents.
- [ ] Expose extracted identity fields, confidence, duplicate candidates, review queue, expiry signals, and approve/reject actions.
- [ ] Keep the UI mobile-responsive but do not build the mobile app.
- [ ] Add focused React tests around upload state, extraction results, and review queue rendering.
- [ ] Add API tests only for behavior gaps found while wiring the UI.
- [ ] Browser-verify school-admin review workflows.
- [ ] Commit: `feat: add document verification workspace`.

## Task 4: Tournament Operations Command Center

- [ ] Unify scheduling, officials, venues, match sheets, communications, and bracket links into one web workspace surface.
- [ ] Ensure coach/referee console can submit match events and verification against live backend state.
- [ ] Add operational status metrics: unscheduled matches, official conflicts, pending verification, unread tournament messages.
- [ ] Add focused React tests.
- [ ] Browser-verify `/workspaces/coach-referee` and `/workspaces/super-admin`.
- [ ] Commit: `feat: add tournament operations command center`.

## Task 5: Postgres Proof for Reports and Integrations

- [ ] Confirm `0012_phase_18_19_reports_integrations.sql` is represented in Drizzle metadata; regenerate or repair metadata if tooling supports it.
- [ ] Add gated Postgres e2e tests with `ATHLETIQ_DATA_BACKEND=postgres` and `ATHLETIQ_DATABASE_E2E=1`.
- [ ] Assert direct DB rows for `analytics_report_drafts`, `spreadsheet_imports`, `partner_api_keys`, `export_bundles`, `webhook_subscriptions`, and `webhook_deliveries`.
- [ ] Do not add read/list repository APIs unless public restart-level assertions require them.
- [ ] Commit: `test: prove postgres analytics and integrations persistence`.

## Task 6: Deployment Readiness and E2E Smoke

- [ ] Add a browser smoke script or Vitest-backed route smoke for every non-mobile workspace.
- [ ] Check API docs, health, readiness, auth, school admin, super admin, coach/referee, federation, government, public tournament, and athlete passport surfaces.
- [ ] Update `docs/operations/production-readiness.md` with remaining deploy prerequisites and explicit skipped mobile scope.
- [ ] Run full gate: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `git diff --check`, API health/readiness, browser smoke.
- [ ] Commit: `chore: add non-mobile deployment readiness checks`.

## Out Of Scope

- Native mobile app implementation.
- Wearables/video analytics.
- Paid production deployment credentials.
- Live third-party OCR provider credentials beyond the existing extraction abstraction.

## Self-Review

- Spec coverage: non-mobile backend, web workspaces, bracketing, OCR, production auth, persistence proof, and readiness are covered.
- Placeholder scan: no task uses undefined placeholders as acceptance criteria.
- Type consistency: role names match `UserRole`; permission name is `users.manage`; repository method is `list()`.
