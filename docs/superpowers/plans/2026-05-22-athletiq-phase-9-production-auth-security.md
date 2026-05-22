# ATHLETIQ Phase 9 Production Auth, Security, And Minor Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace prototype header/password behavior with production-grade password hashing, JWT access, refresh sessions, rate limits, impersonation audit, and minor-safe public profile controls.

**Architecture:** Phase 9 adds a security bounded context inside the existing NestJS modular monolith. Repository interfaces remain the persistence boundary; memory repositories preserve fast tests and Postgres repositories become the staging/production path. Existing `x-athletiq-*` headers remain available only as a development/test fallback while Bearer JWT becomes the production path.

**Tech Stack:** TypeScript, NestJS, Fastify, Drizzle ORM, PostgreSQL, Argon2, JOSE/JWT, Vitest, Supertest, pnpm.

---

## Current State

- `AuthService.register` stores the incoming password as-is.
- `AuthService.login` returns only `{ user }`; no access token, refresh token, cookie, session, logout, or revocation exists.
- `RolesGuard` authenticates every protected request with `x-athletiq-user-id` and `x-athletiq-user-role` headers.
- Runtime seed creates `usr_super_admin` with `admin123`.
- Public QR athlete response is minimal but there is no explicit privacy policy or guardian consent model.
- No auth/search/QR/public rate limits exist.
- No support impersonation workflow exists.

## File Structure

**Create:**

- `apps/api/src/auth/password.service.ts`: Argon2 hashing, verification, legacy plaintext migration detection.
- `apps/api/src/auth/token.service.ts`: HS256 JWT signing and verification with explicit claims.
- `apps/api/src/auth/session.service.ts`: Refresh token issue/rotate/revoke helpers.
- `apps/api/src/common/permissions.ts`: Role-to-permission map and permission type definitions.
- `apps/api/src/common/permissions.decorator.ts`: `@Permissions(...)` metadata decorator.
- `apps/api/src/common/rate-limit.decorator.ts`: Per-route rate limit metadata.
- `apps/api/src/common/rate-limit.guard.ts`: In-memory fixed-window limiter for selected public/high-risk routes.
- `apps/api/src/privacy/privacy.module.ts`: Privacy module.
- `apps/api/src/privacy/privacy.controller.ts`: Guardian consent and public profile endpoints.
- `apps/api/src/privacy/privacy.service.ts`: Minor privacy policy engine.
- `apps/api/test/phase-9-auth-security.spec.ts`: Memory-backed auth/session/security tests.
- `apps/api/test/phase-9-postgres-auth-security.spec.ts`: Guarded Postgres auth/session/security tests.
- `packages/db/drizzle/0004_phase_9_auth_security.sql`: Phase 9 migration.

**Modify:**

- `apps/api/package.json`: add `argon2` and `jose`.
- `packages/db/src/schema.ts`: add refresh sessions, guardian consents, athlete privacy fields.
- `apps/api/src/common/store.ts`: store hashed passwords, refresh sessions, guardian consent, public profile privacy state.
- `apps/api/src/common/roles.guard.ts`: authenticate Bearer JWT first, fall back to test headers only outside production.
- `apps/api/src/auth/auth.controller.ts`: return access tokens, set/clear HttpOnly refresh cookies, add refresh/logout/impersonation endpoints.
- `apps/api/src/auth/auth.service.ts`: hash passwords, verify/migrate legacy passwords, issue/rotate/revoke sessions, impersonate with audit.
- `apps/api/src/repositories/repository.types.ts`: add password update, refresh session, privacy, and audit write methods.
- `apps/api/src/repositories/memory-repositories.ts`: implement new repository methods using `AppDataStore`.
- `apps/api/src/repositories/postgres-repositories.ts`: implement new repository methods using Phase 9 tables.
- `apps/api/src/repositories/repository.module.ts`: export new repository providers if a new session/privacy repository is split out.
- `apps/api/src/app.module.ts`: register rate limit guard and privacy module.
- `apps/api/src/qr/qr.service.ts`: use privacy service for public athlete QR responses.
- `README.md`: document auth/session environment variables and test header fallback.

## Environment Contract

```txt
ATHLETIQ_JWT_SECRET=development-secret-minimum-32-characters
ATHLETIQ_ACCESS_TOKEN_TTL_SECONDS=900
ATHLETIQ_REFRESH_TOKEN_TTL_SECONDS=2592000
ATHLETIQ_ALLOW_TEST_HEADERS=1
ATHLETIQ_BOOTSTRAP_SUPER_ADMIN_EMAIL=admin@athletiq.local
ATHLETIQ_BOOTSTRAP_SUPER_ADMIN_PASSWORD=<optional local bootstrap only>
```

Production must provide `ATHLETIQ_JWT_SECRET` and must not rely on `ATHLETIQ_ALLOW_TEST_HEADERS`.

## Task 1: Password Hashing And No Default Plaintext Credentials

**Files:**

- Create: `apps/api/src/auth/password.service.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Modify: `apps/api/src/common/store.ts`
- Test: `apps/api/test/phase-9-auth-security.spec.ts`

- [x] **Step 1: Add failing password hashing tests**

Create `apps/api/test/phase-9-auth-security.spec.ts` with tests that:

```ts
it('stores only Argon2 password hashes and never returns password material', async () => {
  const app = await createApp();
  const api = request(app.getHttpServer());
  const email = `secure_${Date.now()}@athletiq.local`;

  const registration = await api
    .post('/api/auth/register')
    .send({ email, password: 'password123', role: 'school_admin' })
    .expect(201);

  expect(registration.body.user.password).toBeUndefined();
  expect(registration.body.user.passwordHash).toBeUndefined();

  const login = await api
    .post('/api/auth/login')
    .send({ email, password: 'password123' })
    .expect(201);
  expect(login.body.user.password).toBeUndefined();

  await app.close();
});
```

Add a repository-level assertion through the app module, not by leaking a password in HTTP:

```ts
const userRepository = app.get<UserRepository>(USER_REPOSITORY);
const stored = await userRepository.findByEmail(email);
expect(stored?.password).toMatch(/^\$argon2id\$/);
```

- [x] **Step 2: Run the failing auth security test**

Run:

```bash
pnpm -C apps/api exec vitest run test/phase-9-auth-security.spec.ts
```

Expected: fail because passwords are stored as plaintext.

- [x] **Step 3: Install hashing/token dependencies**

Run:

```bash
pnpm -C apps/api add argon2 jose
```

Expected: `apps/api/package.json` and `pnpm-lock.yaml` update.

- [x] **Step 4: Implement `PasswordService`**

Create `apps/api/src/auth/password.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';

@Injectable()
export class PasswordService {
  async hashPassword(password: string) {
    return hash(password, { type: 2 });
  }

  async verifyPassword(storedPassword: string, candidatePassword: string) {
    if (this.isArgon2Hash(storedPassword)) {
      return verify(storedPassword, candidatePassword);
    }
    return storedPassword === candidatePassword;
  }

  isArgon2Hash(value: string) {
    return (
      value.startsWith('$argon2id$') ||
      value.startsWith('$argon2i$') ||
      value.startsWith('$argon2d$')
    );
  }
}
```

- [x] **Step 5: Add password migration repository method**

Update `UserRepository`:

```ts
updatePassword(userId: string, passwordHash: string): Promise<UserRecord>;
```

Implement it in memory and Postgres repositories by updating the stored `password` column/property with the Argon2 hash and `updatedAt`.

- [x] **Step 6: Hash passwords in register and migrate legacy login**

Update `AuthService.register` to hash before `users.create`.

Update `AuthService.login` to:

```ts
const user = await this.users.findByEmail(input.email.trim().toLowerCase());
if (!user || !(await this.passwords.verifyPassword(user.password, input.password))) {
  throw new UnauthorizedException('Invalid credentials');
}
const normalizedUser = this.passwords.isArgon2Hash(user.password)
  ? user
  : await this.users.updatePassword(user.id, await this.passwords.hashPassword(input.password));
```

- [x] **Step 7: Remove `admin123` runtime seed**

Change memory and Postgres default super admin seed to a non-login locked value:

```ts
password: `LOCKED:${this.randomToken(32)}`;
```

Keep `usr_super_admin` available for development/test header fallback, but ensure `POST /api/auth/login` with `admin@athletiq.local` and `admin123` fails.

- [x] **Step 8: Run password tests**

Run:

```bash
pnpm -C apps/api exec vitest run test/phase-9-auth-security.spec.ts
pnpm -C apps/api test
```

Expected: pass.

## Task 2: JWT Access Tokens And HttpOnly Refresh Session Rotation

**Files:**

- Create: `apps/api/src/auth/token.service.ts`
- Create: `apps/api/src/auth/session.service.ts`
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/drizzle/0004_phase_9_auth_security.sql`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Test: `apps/api/test/phase-9-auth-security.spec.ts`
- Test: `apps/api/test/phase-9-postgres-auth-security.spec.ts`

- [x] **Step 1: Add failing session tests**

Add tests for:

```txt
login returns accessToken
login sets an HttpOnly refresh cookie
POST /api/auth/refresh rotates the refresh token
using the old refresh token again returns 401
POST /api/auth/logout revokes the active refresh session
Bearer access token can call GET /api/auth/me without x-athletiq headers
```

- [x] **Step 2: Add refresh session schema**

Add `refreshSessions` to `packages/db/src/schema.ts`:

```ts
export const refreshSessions = pgTable(
  'refresh_sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    tokenHash: varchar('token_hash', { length: 128 }).notNull(),
    familyId: varchar('family_id', { length: 64 }).notNull(),
    rotatedFromSessionId: varchar('rotated_from_session_id', { length: 64 }),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 128 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('refresh_sessions_user_id_idx').on(table.userId),
    index('refresh_sessions_family_id_idx').on(table.familyId),
    uniqueIndex('refresh_sessions_token_hash_unique').on(table.tokenHash),
  ],
);
```

Generate migration:

```bash
pnpm -C packages/db db:generate
```

- [x] **Step 3: Add session repository methods**

Add repository types:

```ts
type CreateRefreshSessionInput = {
  actorUserId: string;
  tenantId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
};

interface AuthSessionRepository {
  createRefreshSession(input: CreateRefreshSessionInput): Promise<RefreshSessionRecord>;
  findRefreshSessionByTokenHash(tokenHash: string): Promise<RefreshSessionRecord | undefined>;
  rotateRefreshSession(input: RotateRefreshSessionInput): Promise<RefreshSessionRecord>;
  revokeRefreshSession(sessionId: string, actorUserId: string): Promise<RefreshSessionRecord>;
}
```

Implement in memory and Postgres repositories.

- [x] **Step 4: Implement JWT signing and verification**

Create `TokenService` using `jose` `SignJWT` and `jwtVerify` with claims:

```ts
{
  sub: user.id,
  email: user.email,
  role,
  roles: user.roles,
  schoolIds: user.schoolIds,
  typ: 'access',
  impersonatedBy?: string,
}
```

Use `ATHLETIQ_JWT_SECRET`, with a development/test fallback only outside production.

- [x] **Step 5: Implement refresh cookies**

Use cookie name:

```txt
athletiq_refresh
```

Set:

```txt
HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=<ttl>
```

Add `Secure` when `NODE_ENV=production`.

- [x] **Step 6: Wire auth endpoints**

Update:

```txt
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET /api/auth/me
```

`login` and `refresh` return `{ user, accessToken }`; `logout` clears cookie and returns `{ ok: true }`.

- [x] **Step 7: Run session tests**

Run:

```bash
pnpm -C apps/api exec vitest run test/phase-9-auth-security.spec.ts
```

Expected: pass.

## Task 3: Bearer Auth, Permissions, And Test Header Fallback

**Files:**

- Create: `apps/api/src/common/permissions.ts`
- Create: `apps/api/src/common/permissions.decorator.ts`
- Modify: `apps/api/src/common/roles.guard.ts`
- Modify: selected controllers to use `@Permissions` where needed.
- Test: `apps/api/test/phase-9-auth-security.spec.ts`

- [x] **Step 1: Add failing guard tests**

Add tests that:

```txt
GET /api/auth/me accepts Bearer access token
protected endpoints reject missing auth without x headers
test headers work when NODE_ENV !== production
test headers fail when NODE_ENV=production and ATHLETIQ_ALLOW_TEST_HEADERS is unset
```

- [x] **Step 2: Implement permission map**

Add permissions:

```ts
export const rolePermissions = {
  super_admin: ['support.impersonate', 'analytics.read', 'privacy.manage', 'audit.read'],
  federation_admin: ['analytics.read', 'privacy.review'],
  government_viewer: ['analytics.read'],
  school_admin: ['school.manage', 'athlete.manage', 'privacy.manage'],
  coach: ['match.stats.write'],
  referee: ['match.stats.write', 'match.verify.assist'],
} as const;
```

- [x] **Step 3: Update `RolesGuard`**

Resolve auth in this order:

```txt
1. Bearer access token.
2. Development/test x-athletiq headers only when NODE_ENV !== production or ATHLETIQ_ALLOW_TEST_HEADERS=1.
```

Reject test headers in production unless explicitly enabled.

- [x] **Step 4: Run guard tests and existing API tests**

Run:

```bash
pnpm -C apps/api exec vitest run test/phase-9-auth-security.spec.ts
pnpm -C apps/api test
```

Expected: pass.

## Task 4: Minor Privacy And Guardian Consent

**Files:**

- Create: `apps/api/src/privacy/privacy.module.ts`
- Create: `apps/api/src/privacy/privacy.controller.ts`
- Create: `apps/api/src/privacy/privacy.service.ts`
- Modify: `packages/db/src/schema.ts`
- Modify: `apps/api/src/common/store.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Modify: `apps/api/src/qr/qr.service.ts`
- Test: `apps/api/test/phase-9-auth-security.spec.ts`

- [x] **Step 1: Add failing privacy tests**

Add tests that:

```txt
public athlete profile hides dateOfBirth, gender, and document fields
minor public profile publication fails when guardian consent is required and missing
guardian consent can be recorded by school_admin for their school
public QR athlete resolution returns the privacy-filtered public profile
```

- [x] **Step 2: Add privacy fields and guardian consent schema**

Add athlete columns:

```ts
publicProfileStatus: varchar('public_profile_status', { length: 32 }).notNull().default('private'),
guardianConsentRequired: boolean('guardian_consent_required').notNull().default(false),
guardianConsentGrantedAt: timestamp('guardian_consent_granted_at', { withTimezone: true }),
```

Add `guardianConsents` table:

```ts
(id,
  tenantId,
  athleteId,
  guardianName,
  relationship,
  consentType,
  grantedAt,
  revokedAt,
  recordedBy,
  createdAt);
```

- [x] **Step 3: Implement privacy repository methods**

Add:

```ts
recordGuardianConsent(actor, athleteId, input);
setAthletePublicProfile(actor, athleteId, status);
getPublicAthleteProfile(athleteId);
```

- [x] **Step 4: Implement privacy policy service**

Return only:

```ts
{
  type: 'athlete',
  athleteId,
  fullName,
  athletiqId,
  schoolId,
  publicProfileStatus,
}
```

Never return DOB, gender, guardians, documents, raw school admin IDs, or internal verification notes from public endpoints.

- [x] **Step 5: Wire QR public athlete response through privacy service**

`QrService.resolveAthletePublic` must call `PrivacyService.getPublicAthleteProfileById`.

- [x] **Step 6: Run privacy tests**

Run:

```bash
pnpm -C apps/api exec vitest run test/phase-9-auth-security.spec.ts
pnpm -C apps/api test
```

Expected: pass.

## Task 5: Rate Limiting And Support Impersonation

**Files:**

- Create: `apps/api/src/common/rate-limit.decorator.ts`
- Create: `apps/api/src/common/rate-limit.guard.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/repositories/repository.types.ts`
- Modify: `apps/api/src/repositories/memory-repositories.ts`
- Modify: `apps/api/src/repositories/postgres-repositories.ts`
- Test: `apps/api/test/phase-9-auth-security.spec.ts`

- [x] **Step 1: Add failing rate limit and impersonation tests**

Add tests that:

```txt
repeated bad login attempts eventually return 429
super admin impersonation requires reason
support impersonation returns an access token for the target user
impersonation token includes impersonatedBy in /api/auth/me
impersonation writes actorUserId, targetUserId, reason, and timestamp to audit logs
non-super-admin impersonation returns 403
```

- [x] **Step 2: Implement rate limit decorator and guard**

Use a fixed-window in-memory limiter keyed by:

```txt
route key + IP + authenticated user id when available
```

Default high-risk route limits:

```txt
auth.login: 5/min
auth.register: 10/min
auth.refresh: 30/min
qr.scan: 60/min
search: 60/min
public.profile: 120/min
```

- [x] **Step 3: Implement impersonation**

Add endpoint:

```txt
POST /api/auth/impersonation
```

Body:

```ts
{ targetUserId: string; role?: UserRole; reason: string }
```

Return `{ user, accessToken, impersonatedBy }`.

- [x] **Step 4: Audit impersonation**

Write audit action:

```txt
auth.impersonation_started
```

Metadata:

```ts
{
  (targetUserId, targetRole, reason, startedAt);
}
```

- [x] **Step 5: Run tests**

Run:

```bash
pnpm -C apps/api exec vitest run test/phase-9-auth-security.spec.ts
pnpm -C apps/api test
```

Expected: pass.

## Task 6: Postgres E2E, Docs, And Full Verification

**Files:**

- Create: `apps/api/test/phase-9-postgres-auth-security.spec.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-21-athletiq-master-implementation-plan.md`

- [x] **Step 1: Add guarded Postgres auth security e2e**

Guard with:

```ts
const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;
```

Cover:

```txt
Argon2 stored password
login access token and refresh cookie
refresh rotation rejects old token
logout revokes session
guardian consent and public profile privacy
impersonation audit
```

- [x] **Step 2: Update docs**

Document:

```txt
JWT secret requirements
refresh cookie behavior
test header fallback policy
rate limit defaults
bootstrap super admin policy
minor public profile fields
```

- [x] **Step 3: Run full verification**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq pnpm -C packages/db db:migrate
DATABASE_URL=postgres://athletiq:athletiq@localhost:15432/athletiq ATHLETIQ_DATABASE_E2E=1 ATHLETIQ_DATA_BACKEND=postgres pnpm -C apps/api exec vitest run test/phase-9-postgres-auth-security.spec.ts
```

Expected: all pass.

## Self-Review Checklist

- [x] Passwords are Argon2 hashed for new users.
- [x] Legacy plaintext passwords migrate to Argon2 on successful login.
- [x] No runtime seed path contains `admin123`.
- [x] Login and refresh return JWT access tokens.
- [x] Refresh cookies are HttpOnly and rotate.
- [x] Revoked refresh sessions cannot mint access tokens.
- [x] Bearer tokens work for protected routes.
- [x] Test headers are not accepted in production by default.
- [x] Minor public profiles are privacy-filtered.
- [x] Guardian consent gates public profile publishing when required.
- [x] Rate limits apply to high-risk routes.
- [x] Support impersonation requires reason and writes an audit log.
- [x] Memory and Postgres backend tests pass.
