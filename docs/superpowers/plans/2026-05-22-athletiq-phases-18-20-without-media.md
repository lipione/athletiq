# ATHLETIQ Phases 18-20 Without Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the non-media platform phases after intentionally skipping Phase 17, covering advanced analytics, imports/open APIs, and production hardening.

**Architecture:** Keep the existing modular NestJS monolith and repository boundary. Phase 18 extends the analytics module with deterministic AI-style report drafts that require human approval; Phase 19 adds a dedicated integrations module; Phase 20 adds deployable infrastructure, operational runbooks, and machine-readable readiness checks.

**Tech Stack:** NestJS, TypeScript, Vitest, Supertest, pnpm/Turborepo, Docker Compose, GitHub Actions, JSON/YAML operational manifests.

---

## Phase 17 Decision

Phase 17 media/video/highlights/scouting is intentionally skipped for this pass. Phases 18-20 must not depend on video or scouting tables.

## Task 1: Phase 18 Advanced Analytics And AI Report Drafts

**Files:**

- Modify: `apps/api/src/analytics/analytics.controller.ts`
- Modify: `apps/api/src/analytics/analytics.service.ts`
- Modify: `apps/api/src/common/store.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Test: `apps/api/test/phase-18-advanced-analytics.spec.ts`

- [ ] Write an API test that creates schools, athletes, teams, match events, and verifies athlete development, rankings, data quality, export catalog, report draft creation, and report approval.
- [ ] Run the Phase 18 test and confirm it fails because the endpoints do not exist.
- [ ] Add analytics repository/store types and methods for longitudinal athlete records, rankings, data quality checks, export catalog entries, and report draft lifecycle.
- [ ] Add service/controller methods with `analytics.read`, `analytics.export`, and `analytics.override` permissions.
- [ ] Run the Phase 18 test and confirm it passes.

## Task 2: Phase 19 Integrations, Imports, Exports, And Open APIs

**Files:**

- Create: `apps/api/src/integrations/integrations.controller.ts`
- Create: `apps/api/src/integrations/integrations.module.ts`
- Create: `apps/api/src/integrations/integrations.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/common/permissions.ts`
- Modify: `apps/api/src/common/store.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Modify: `apps/api/src/repositories/repository.module.ts`
- Test: `apps/api/test/phase-19-integrations.spec.ts`

- [ ] Write an API test covering spreadsheet preview/commit/rollback, partner API key lifecycle, public fixture/result access, export bundles, webhook subscriptions, and webhook test delivery.
- [ ] Run the Phase 19 test and confirm it fails because the integrations module does not exist.
- [ ] Add integration record types, repository contract, memory repository, and Postgres fallback.
- [ ] Add controller/service endpoints with partner-safe validation, role/permission checks, and public-safe read endpoints.
- [ ] Run the Phase 19 test and confirm it passes.

## Task 3: Phase 20 Production Infrastructure, QA, Pilot, And Scale Hardening

**Files:**

- Modify: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/test/phase-20-readiness.spec.ts`
- Create: `infra/docker-compose.production.yml`
- Create: `infra/k8s/api-deployment.yaml`
- Create: `infra/k8s/web-deployment.yaml`
- Create: `infra/k8s/worker-deployment.yaml`
- Create: `infra/observability/otel-collector.yaml`
- Create: `infra/load-tests/k6-smoke.js`
- Create: `docs/operations/production-readiness.md`
- Create: `docs/operations/pilot-playbook.md`
- Create: `docs/operations/disaster-recovery.md`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] Write a readiness test proving `/api/health/readiness` reports backend, database, Redis/storage configuration, observability, backups, and deployment metadata.
- [ ] Run the readiness test and confirm it fails because readiness does not exist.
- [ ] Implement the readiness endpoint without leaking secrets.
- [ ] Add production deployment manifests, observability collector config, load-test smoke script, and operational runbooks.
- [ ] Run the Phase 20 readiness test and confirm it passes.

## Final Gate

- [ ] Run `pnpm format:check`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Review `git diff` for unrelated churn.
- [ ] Commit and push.
