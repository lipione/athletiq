# Production Readiness

Use this checklist before promoting ATHLETIQ beyond a pilot environment.

## Release

- Build immutable API, web, and worker images from the same commit SHA.
- Set `ATHLETIQ_RELEASE_SHA` on every runtime.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Apply database migrations before scaling the new API version.

## Runtime Configuration

- `NODE_ENV=production`.
- `ATHLETIQ_DATA_BACKEND=postgres`.
- `DATABASE_URL`, `REDIS_URL`, and `ATHLETIQ_JWT_SECRET` come from the secret manager.
- Disable development-only auth header fallbacks.
- Configure `WEB_PUBLIC_API_URL` to the public API origin.
- Configure OTLP export and alert routing before pilot traffic starts.

## Deployment Checks

- API `/api/health` returns `200` and `/api/health/readiness` returns `200` from inside and outside the cluster.
- Web root returns `200` through the public ingress.
- Worker logs show startup without Redis connection errors.
- Postgres and Redis backups are scheduled and restorable.
- Dashboards track API error rate, p95 latency, worker failures, database storage, Redis memory, and pod restarts.

## Smoke Test

Run the load-test smoke against the target API:

```bash
BASE_URL=https://api.example.com k6 run infra/load-tests/k6-smoke.js
```

Promotion is blocked if HTTP failures are at or above 1% or health p95 latency is above 500 ms.
