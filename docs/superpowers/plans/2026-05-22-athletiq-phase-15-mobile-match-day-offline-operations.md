# Phase 15 Mobile Match-Day App And Offline Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the Expo match-day app surface and tested offline operations model for login, match packets, QR scan handling, scoring, sync, conflicts, and school/referee workflows.

**Architecture:** Keep native UI in `apps/mobile/App.tsx` and focused components under `apps/mobile/src/components` because the app does not yet use Expo Router. Put durable offline behavior in pure TypeScript services under `apps/mobile/src/offline` so it can be tested without native device APIs, then expose adapter interfaces for secure token storage, QR scanning, and local database persistence.

**Tech Stack:** Expo 55, React Native 0.83, React 19, TypeScript, `@athletiq/ui` tokens, Vitest, optional Expo Go-compatible modules for secure storage, SQLite, camera, crypto, and network adapters.

---

## File Structure

- Create `apps/mobile/src/offline/match-day-types.ts` for packet, auth, QR, event, mutation, conflict, and sync types.
- Create `apps/mobile/src/offline/match-day-store.ts` for deterministic local database-style state transitions.
- Create `apps/mobile/src/offline/match-day-api.ts` for fetch request builders and adapter interfaces.
- Create `apps/mobile/src/offline/match-day-fixtures.ts` for realistic packet and workflow fixtures.
- Create `apps/mobile/src/components/match-day.tsx` for the production native workflow UI.
- Replace `apps/mobile/App.tsx` with the match-day app shell.
- Add `apps/mobile/src/phase-15-offline.test.ts` for login/token, packet download, QR scan, offline scoring, idempotent sync, conflict retention, and logout behavior.
- Update `README.md` and the master implementation plan after verification.

---

### Task 1: Offline Types, Store, And Tests

**Files:**

- Create: `apps/mobile/src/offline/match-day-types.ts`
- Create: `apps/mobile/src/offline/match-day-store.ts`
- Create: `apps/mobile/src/offline/match-day-fixtures.ts`
- Create: `apps/mobile/src/phase-15-offline.test.ts`

- [x] **Step 1: Write failing offline workflow tests**

Tests must cover:

- Secure token value can be stored and cleared through the app session model.
- Match packet can be downloaded into local state and used without network.
- QR scans classify athlete, team, match, check-in, and venue payloads.
- Offline scoring appends immutable mutation log entries.
- Duplicate mutation IDs are idempotent.
- Conflicting edits remain visible in the conflict inbox.
- Logout clears token and active packet while retaining already-audited mutation history.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile test`
Expected: FAIL until store modules exist.

- [x] **Step 2: Implement the deterministic local store**

Implement:

- `createInitialMatchDayState()`
- `storeToken(state, token)`
- `logout(state)`
- `downloadMatchPacket(state, packet)`
- `classifyQrPayload(payload)`
- `recordCheckIn(state, scan)`
- `recordMatchEvent(state, input)`
- `markMutationSynced(state, mutationId, serverId)`
- `markMutationConflict(state, mutationId, reason, serverSnapshot)`
- `retryPendingMutations(state)`

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile test`
Expected: PASS for store tests.

---

### Task 2: API Adapter And Native Module Boundaries

**Files:**

- Create: `apps/mobile/src/offline/match-day-api.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/src/phase-15-offline.test.ts`

- [x] **Step 1: Add Expo Go-compatible native modules**

Install compatible modules:

- `expo-secure-store`
- `expo-sqlite`
- `expo-camera`
- `expo-crypto`
- `expo-network`

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile exec expo install expo-secure-store expo-sqlite expo-camera expo-crypto expo-network`
Expected: dependencies added without custom native build requirements.

- [x] **Step 2: Implement request builders and adapters**

Implement:

- `buildLoginRequest(email, password)`
- `buildMatchPacketRequest(matchId, token)`
- `buildQrScanRequest(code, token)`
- `buildPushMutationsRequest(clientId, mutations, token, schoolId?)`
- `createSecureTokenAdapter()` boundary for SecureStore.
- `createQrScannerDescriptor()` boundary for camera permissions and QR scanning.
- `createLocalDatabaseDescriptor()` boundary for SQLite packet/mutation tables.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile typecheck`
Expected: PASS.

---

### Task 3: Match-Day Native UI

**Files:**

- Create: `apps/mobile/src/components/match-day.tsx`
- Modify: `apps/mobile/App.tsx`
- Modify: `apps/mobile/src/phase-15-offline.test.ts`

- [x] **Step 1: Build the native match-day shell**

The UI must show:

- Login/session card with secure storage status.
- Offline packet status and retry action.
- QR scan panel for athlete, team, match, check-in, and venue results.
- Referee match sheet with lineups, scoring actions, submit result, and signature/confirmation.
- School workflow with athlete lookup, team check-in, and document status.
- Sync status panel with pending/synced/conflict counts and retry controls.
- Conflict inbox preserving server/client snapshots.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile typecheck`
Expected: PASS.

- [x] **Step 2: Add render smoke coverage**

Use React element inspection or pure props helpers to verify the app exposes:

- Match-day title.
- QR scan status.
- Offline queue count.
- Conflict inbox count.
- Logout-clears-session behavior through store tests.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile test`
Expected: PASS.

---

### Task 4: Verification, Docs, And Phase Tracking

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`
- Modify: `docs/superpowers/plans/2026-05-22-athletiq-phase-15-mobile-match-day-offline-operations.md`

- [x] **Step 1: Run focused mobile verification**

Run:

- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile test`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile typecheck`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile lint`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/mobile build`

Expected: PASS.

- [x] **Step 2: Run full workspace verification**

Run:

- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm format:check`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm lint`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm typecheck`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm test`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm build`

Expected: PASS.

- [x] **Step 3: Update docs and mark Phase 15 complete**

Document:

- Mobile workflows.
- Offline store semantics.
- Sync mutation behavior.
- Native adapter boundaries.
- Verification commands.

Mark Phase 15 code-level plan and implementation complete in the master plan.
