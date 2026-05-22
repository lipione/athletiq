# Production Readiness

Use this checklist before promoting ATHLETIQ beyond a pilot environment.

## Release

- Build immutable API, web, and worker images from the same commit SHA.
- Set `ATHLETIQ_RELEASE_SHA` on every runtime.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Run `pnpm --filter @athletiq/web test -- non-mobile-route-smoke.test.tsx` before web promotion.
- Apply database migrations before scaling the new API version.
- Drizzle journal entries exist for migrations `0012` and `0013`, but local metadata snapshots
  currently stop at `0011`; verify migration state from SQL files before relying on snapshot-based
  diff tooling.

## Runtime Configuration

- `NODE_ENV=production`.
- `ATHLETIQ_DATA_BACKEND=postgres`.
- `DATABASE_URL`, `REDIS_URL`, and `ATHLETIQ_JWT_SECRET` come from the secret manager.
- Disable development-only auth header fallbacks.
- Configure `WEB_PUBLIC_API_URL` to the public API origin.
- Configure OTLP export and alert routing before pilot traffic starts.
- Native mobile apps are intentionally excluded from this release train until the offline mobile
  product plan is finalized.

## Deployment Checks

- API `/api/health` returns `200` and `/api/health/readiness` returns `200` from inside and outside the cluster.
- Web root returns `200` through the public ingress.
- Web routes render for `/workspaces/super-admin`, `/workspaces/school-admin`,
  `/workspaces/coach-referee`, `/workspaces/federation`, `/workspaces/government`,
  `/family/communications`, `/schools/school-kantipur/management`,
  `/public/tournaments/kathmandu-school-cup-2026`, and `/athletes/ath-nima-rai/passport`.
- Worker logs show startup without Redis connection errors.
- Postgres and Redis backups are scheduled and restorable.
- Dashboards track API error rate, p95 latency, worker failures, database storage, Redis memory, and pod restarts.

## Smoke Test

Run the load-test smoke against the target API:

```bash
BASE_URL=https://api.example.com k6 run infra/load-tests/k6-smoke.js
```

Promotion is blocked if HTTP failures are at or above 1% or health p95 latency is above 500 ms.
