# ATHLETIQ

ATHLETIQ is a verified athlete identity, school sports, tournament intelligence, and grassroots sports infrastructure platform.

## Local Development

Install dependencies:

```bash
corepack enable
pnpm install
```

Start local infrastructure:

```bash
docker compose up -d
```

Run checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run apps:

```bash
pnpm --filter @athletiq/api dev
pnpm --filter @athletiq/web dev
pnpm --filter @athletiq/worker dev
pnpm --filter @athletiq/mobile dev
```
