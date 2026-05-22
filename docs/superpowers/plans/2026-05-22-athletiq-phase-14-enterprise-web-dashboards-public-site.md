# Phase 14 Enterprise Web Dashboards And Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a polished, responsive ATHLETIQ web product with role dashboards, scoped school management, public tournament pages, interactive brackets, and athlete passports.

**Architecture:** Keep Phase 14 web work inside `apps/web` with typed fixture-backed domain adapters so pages can be built and tested before a production API client is wired. Use reusable, accessible React components and pure guard/model functions that can be tested with Vitest and server-side markup rendering. Avoid backend schema changes unless integration review finds a blocking gap.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `@athletiq/ui` design tokens, CSS, Vitest, React DOM server rendering, optional `lucide-react` icons.

---

## File Structure

- Create `apps/web/src/lib/phase14-data.ts` for dashboard, school, tournament, bracket, athlete, and access-control fixtures.
- Create `apps/web/src/lib/phase14-format.ts` for date, score, status, and route formatting helpers.
- Create `apps/web/src/components/phase14/` for reusable shell, metrics, badges, tables, dashboards, bracket explorer, public tournament, athlete passport, and state components.
- Create role routes under `apps/web/app/workspaces/[role]/page.tsx`.
- Create scoped management route `apps/web/app/schools/[schoolId]/management/page.tsx`.
- Create public route `apps/web/app/public/tournaments/[slug]/page.tsx`.
- Create athlete route `apps/web/app/athletes/[athleteId]/passport/page.tsx`.
- Replace `apps/web/app/page.tsx` with an operational dashboard index, not a marketing landing page.
- Expand `apps/web/app/globals.css` for responsive layouts, focus states, print styles, and bracket/mobile table behavior.
- Add Phase 14 Vitest coverage in `apps/web/src/phase-14-web.test.tsx`.
- Update `README.md` and the master implementation plan after verification.

---

### Task 1: Domain Model, Guards, And Tests

**Files:**

- Create: `apps/web/src/lib/phase14-data.ts`
- Create: `apps/web/src/lib/phase14-format.ts`
- Create: `apps/web/src/phase-14-web.test.tsx`

- [x] **Step 1: Write failing tests for role routing, school scope, public data safety, and mobile table markup**

Create tests that assert:

- `getWorkspaceForRole('school-admin')` returns the school dashboard.
- `assertSchoolAccess({ role: 'school-admin', schoolId: 'school-kantipur' }, 'school-riverside')` denies access.
- Public tournament data does not expose `athleteIds`, `dateOfBirth`, or guardian fields.
- Rendered public tournament markup includes responsive table labels and bracket node buttons/details.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web test`
Expected: FAIL because the Phase 14 modules do not exist yet.

- [x] **Step 2: Implement typed fixtures and pure helpers**

Add role, school, team, tournament, match, bracket node, official assignment, dashboard metric, and athlete passport types. Export:

- `workspaceRoles`
- `getWorkspaceForRole(roleSlug)`
- `getDashboardSnapshot(roleSlug)`
- `getSchoolManagementView(actor, schoolId)`
- `assertSchoolAccess(actor, schoolId)`
- `getPublicTournament(slug)`
- `getAthletePassport(athleteId)`
- `getPublicTournamentPayload(slug)` with sensitive fields removed.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web test`
Expected: tests pass for model helpers that do not require page components.

---

### Task 2: Enterprise UI Components And Global Styles

**Files:**

- Create: `apps/web/src/components/phase14/state.tsx`
- Create: `apps/web/src/components/phase14/status-badge.tsx`
- Create: `apps/web/src/components/phase14/metric-strip.tsx`
- Create: `apps/web/src/components/phase14/data-table.tsx`
- Create: `apps/web/src/components/phase14/app-shell.tsx`
- Create: `apps/web/src/components/phase14/dashboard-workspace.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/package.json`

- [x] **Step 1: Add icon dependency if not present**

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm --filter @athletiq/web add lucide-react`
Expected: package and lockfile update cleanly.

- [x] **Step 2: Build accessible reusable components**

Components must include:

- Skip link and focus-visible styling.
- Sidebar/top navigation with role switcher links.
- Metric strip with compact operational KPIs.
- Table component with `data-label` mobile cells.
- Status badges with semantic text and non-color-only labels.
- Loading, empty, and error states.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web typecheck`
Expected: PASS.

---

### Task 3: Role Dashboards And Scoped School Management

**Files:**

- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/workspaces/[role]/page.tsx`
- Create: `apps/web/app/schools/[schoolId]/management/page.tsx`
- Modify: `apps/web/src/components/phase14/dashboard-workspace.tsx`
- Modify: `apps/web/src/phase-14-web.test.tsx`

- [x] **Step 1: Add server routes for each workspace**

Routes must render:

- Super Admin control tower.
- School Admin roster, documents, billing, and tournament readiness.
- Coach/referee match-day workspace.
- Federation dashboard with rankings, participation, disputes, and exports.
- Government read-only analytics dashboard.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web test`
Expected: PASS for role landing assertions.

- [x] **Step 2: Add scoped school management page**

The route must:

- Allow a super admin.
- Allow a school admin only for their own school.
- Render access-denied state for another school without showing private roster data.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web test`
Expected: PASS for school access assertions.

---

### Task 4: Public Tournament, Interactive Bracket, And Athlete Passport

**Files:**

- Create: `apps/web/src/components/phase14/bracket-explorer.tsx`
- Create: `apps/web/src/components/phase14/public-tournament.tsx`
- Create: `apps/web/src/components/phase14/athlete-passport.tsx`
- Create: `apps/web/app/public/tournaments/[slug]/page.tsx`
- Create: `apps/web/app/athletes/[athleteId]/passport/page.tsx`
- Modify: `apps/web/src/phase-14-web.test.tsx`

- [x] **Step 1: Build public tournament page**

The page must render:

- Public-safe tournament overview.
- Fixtures/results table.
- Standings table.
- Schedule status.
- Interactive bracket explorer with filter controls and per-match details.
- No authenticated-only athlete or guardian data.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web test`
Expected: PASS for public safety and bracket markup assertions.

- [x] **Step 2: Build athlete passport**

The page must render:

- Verified identity summary.
- Timeline of tournaments, documents, awards, and development milestones.
- Multi-sport stats.
- Printable passport section with QR placeholder and verification status.

Run: `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web typecheck`
Expected: PASS.

---

### Task 5: Verification, Docs, And Phase Tracking

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`
- Modify: `docs/superpowers/plans/2026-05-22-athletiq-phase-14-enterprise-web-dashboards-public-site.md`

- [x] **Step 1: Run focused web verification**

Run:

- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web test`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web typecheck`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web lint`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web build`

Expected: PASS.

- [x] **Step 2: Run full workspace verification**

Run:

- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm format:check`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm lint`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm typecheck`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm test`
- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm build`

Expected: PASS.

- [x] **Step 3: Browser verification**

Start web dev server:

- `PATH="/Users/abhi/Library/pnpm/bin:$PATH" pnpm -C apps/web dev`

Verify desktop and mobile:

- `/`
- `/workspaces/super-admin`
- `/workspaces/school-admin`
- `/schools/school-kantipur/management?role=school-admin&schoolId=school-riverside`
- `/public/tournaments/kathmandu-school-cup-2026`
- `/athletes/ath-nima-rai/passport`

Expected: no blank screens, no text overlap, tables usable on mobile, bracket controls visible, passport printable section present.

- [x] **Step 4: Update docs and mark Phase 14 complete**

Document:

- Web routes.
- Role dashboard behavior.
- Public tournament and bracket behavior.
- Verification commands.

Mark Phase 14 code-level plan and implementation complete in the master plan.
