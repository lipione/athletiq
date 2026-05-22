# ATHLETIQ Phase 16 Communications Family Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add guardian/family access, announcements, notification preferences, bilingual templates, delivery audit, and moderated team communication workflows.

**Architecture:** Phase 16 adds a `CommunicationsModule` behind the existing repository boundary. The first implementation stores canonical communication records in `AppDataStore` with repository interfaces and keeps all official sends auditable; web receives a static enterprise-grade family communications view that mirrors the backend concepts.

**Tech Stack:** NestJS, TypeScript, existing repository module, Vitest/Supertest, Next.js App Router, React server components, existing Phase 14 UI primitives.

---

## File Structure

- Create `apps/api/src/communications/communications.module.ts` for Nest module wiring.
- Create `apps/api/src/communications/communications.controller.ts` for API routes.
- Create `apps/api/src/communications/communications.service.ts` for validation, scoping, template rendering, and channel rules.
- Modify `apps/api/src/common/store.ts` to add records and in-memory canonical operations.
- Modify `apps/api/src/common/roles.ts` and `apps/api/src/common/permissions.ts` to add guardian role and communication permissions.
- Modify `apps/api/src/repositories/repository.types.ts`, `memory-repositories.ts`, `postgres-repositories.ts`, and `repository.module.ts` to expose a communication repository.
- Modify `apps/api/src/app.module.ts` to import `CommunicationsModule`.
- Add `apps/api/test/phase-16-communications.spec.ts`.
- Create `apps/web/app/family/communications/page.tsx`.
- Create `apps/web/src/components/phase16/family-communications.tsx`.
- Create `apps/web/src/lib/phase16-data.ts`.
- Add `apps/web/src/phase-16-web.test.tsx`.
- Update `README.md` and the master implementation checklist.

## Task 1: Backend Communication Model And Repository

- [x] **Step 1: Define Phase 16 record types**
      Add guardian links, announcements, notification preferences, templates, delivery logs, and message threads to `apps/api/src/common/store.ts`.

- [x] **Step 2: Add store operations**
      Implement methods to link guardians to athletes, list a guardian family dashboard, create announcements, send template notifications, update preferences, create moderated threads, post messages, hide messages, and list the unified inbox.

- [x] **Step 3: Add repository contracts**
      Extend `apps/api/src/repositories/repository.types.ts` with `COMMUNICATION_REPOSITORY`, input types, and `CommunicationRepository`.

- [x] **Step 4: Wire repository implementations**
      Add `MemoryCommunicationRepository` and `PostgresCommunicationRepository` wrappers and bind the repository token in `RepositoryModule`.

## Task 2: Backend API, Permissions, And Tests

- [x] **Step 1: Add role and permissions**
      Add the `guardian` role and communication permissions to role metadata.

- [x] **Step 2: Add communications service and controller**
      Expose routes under `/api/communications/*` for guardian links, family dashboard, announcements, notification templates, preferences, inbox, threads, messages, and moderation.

- [x] **Step 3: Write API acceptance tests**
      Cover guardian scoping, schedule-change notification creation, preference suppression for optional channels, bilingual template rendering, and moderated thread audit behavior.

## Task 3: Web Family Communications Experience

- [x] **Step 1: Add family data model**
      Create static Phase 16 data with athletes, notices, preferences, bilingual templates, and moderated threads.

- [x] **Step 2: Add family communications component**
      Build a dense, mobile-friendly family communications surface using existing Phase 14 UI patterns.

- [x] **Step 3: Add route and tests**
      Add `/family/communications` and tests for key visible content.

## Task 4: Documentation And Verification

- [x] **Step 1: Update docs**
      Update the README and master checklist with Phase 16 status.

- [x] **Step 2: Run focused checks**
      Run API and web tests for Phase 16 plus typecheck for touched apps.

- [x] **Step 3: Run full verification**
      Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
