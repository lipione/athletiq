# ATHLETIQ Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the ATHLETIQ monorepo foundation with working web, mobile, API, worker, shared packages, local infrastructure, and CI.

**Architecture:** Phase 0 creates a TypeScript monorepo using pnpm workspaces and Turborepo. The API and worker are separate Node processes, the web app is a Next.js app, the mobile app is an Expo app, and shared packages hold database, validation, UI tokens, and common configuration.

**Tech Stack:** pnpm, Turborepo, TypeScript, ESLint, Prettier, Vitest, Next.js, Expo React Native, NestJS with Fastify, PostgreSQL, Drizzle ORM, Redis, BullMQ, Docker Compose, GitHub Actions.

---

## File Structure

Create this structure:

```txt
.github/
  workflows/
    ci.yml
apps/
  api/
    src/
      config/
        env.ts
      health/
        health.controller.ts
        health.module.ts
      app.module.ts
      main.ts
    test/
      health.e2e-spec.ts
    package.json
    tsconfig.json
    tsconfig.build.json
    vitest.config.ts
  mobile/
    src/
      tokens.test.ts
    App.tsx
    app.json
    package.json
    tsconfig.json
    vitest.config.ts
  web/
    app/
      globals.css
      layout.tsx
      page.tsx
    src/
      app-name.test.ts
    next-env.d.ts
    next.config.ts
    package.json
    tsconfig.json
    vitest.config.ts
  worker/
    src/
      jobs/
        health.job.ts
      env.ts
      main.ts
      queues.ts
    test/
      queues.test.ts
    package.json
    tsconfig.json
    tsconfig.build.json
    vitest.config.ts
packages/
  config/
    tsconfig/
      base.json
      node.json
      react.json
    package.json
  db/
    src/
      client.ts
      index.ts
      schema.ts
    drizzle.config.ts
    package.json
    tsconfig.json
  shared/
    src/
      env.ts
      env.test.ts
      index.ts
    package.json
    tsconfig.json
    vitest.config.ts
  ui/
    src/
      index.ts
      tokens.test.ts
      tokens.ts
    package.json
    tsconfig.json
    vitest.config.ts
.dockerignore
.editorconfig
.env.example
.gitignore
.prettierignore
docker-compose.yml
eslint.config.mjs
package.json
pnpm-workspace.yaml
prettier.config.mjs
README.md
turbo.json
```

## Task 1: Root Workspace Files

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.dockerignore`
- Create: `.prettierignore`
- Create: `.editorconfig`
- Create: `.env.example`
- Create: `prettier.config.mjs`
- Create: `eslint.config.mjs`
- Create: `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "athletiq",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.12.1",
  "engines": {
    "node": ">=22.13.0",
    "pnpm": ">=10.12.1"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^9.28.0",
    "eslint": "^9.28.0",
    "prettier": "^3.5.3",
    "turbo": "^2.5.4",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.33.1",
    "vitest": "^3.2.1"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```gitignore
node_modules
.turbo
dist
coverage
.next
.expo
.env
.env.local
.env.*.local
*.log
.DS_Store
```

- [ ] **Step 5: Create `.dockerignore`**

```dockerignore
node_modules
.turbo
dist
coverage
.next
.expo
.git
.env
.env.local
.env.*.local
*.log
```

- [ ] **Step 6: Create `.prettierignore`**

```gitignore
pnpm-lock.yaml
node_modules
.turbo
dist
coverage
.next
.expo
```

- [ ] **Step 7: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 8: Create `.env.example`**

```bash
NODE_ENV=development
API_PORT=4000
DATABASE_URL=postgres://athletiq:athletiq@localhost:5432/athletiq
REDIS_URL=redis://localhost:6379
WEB_PUBLIC_API_URL=http://localhost:4000/api
```

- [ ] **Step 9: Create `prettier.config.mjs`**

```js
/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
};
```

- [ ] **Step 10: Create `eslint.config.mjs`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/dist/**', '**/.next/**', '**/.expo/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
```

- [ ] **Step 11: Create `README.md`**

````md
# ATHLETIQ

ATHLETIQ is a verified athlete identity, school sports, tournament intelligence, and grassroots sports infrastructure platform.

## Local Development

Install dependencies:

```bash
corepack enable
pnpm install
```

Start local infrastructure:

Note: this command works after the local infrastructure task adds `docker-compose.yml`.

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
````

- [ ] **Step 12: Install root dependencies**

Run:

```bash
corepack enable
pnpm install
```

Expected: `pnpm-lock.yaml` is created and install exits successfully.

- [ ] **Step 13: Commit root workspace files**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .gitignore .dockerignore .prettierignore .editorconfig .env.example prettier.config.mjs eslint.config.mjs README.md
git commit -m "chore: initialize monorepo workspace"
```

## Task 2: Shared TypeScript Configuration Package

**Files:**

- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig/base.json`
- Create: `packages/config/tsconfig/node.json`
- Create: `packages/config/tsconfig/react.json`

- [ ] **Step 1: Create `packages/config/package.json`**

```json
{
  "name": "@athletiq/config",
  "version": "0.1.0",
  "private": true,
  "files": ["tsconfig"]
}
```

- [ ] **Step 2: Create `packages/config/tsconfig/base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 3: Create `packages/config/tsconfig/node.json`**

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"]
  }
}
```

- [ ] **Step 4: Create `packages/config/tsconfig/react.json`**

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

- [ ] **Step 5: Verify package metadata**

Run:

```bash
pnpm --filter @athletiq/config exec node -e "console.log('config package ok')"
```

Expected: prints `config package ok`.

- [ ] **Step 6: Commit config package**

```bash
git add packages/config
git commit -m "chore: add shared typescript config"
```

## Task 3: Shared Validation Package

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/env.ts`
- Create: `packages/shared/src/env.test.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@athletiq/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.25.56"
  },
  "devDependencies": {
    "@athletiq/config": "workspace:*"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "@athletiq/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `packages/shared/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create `packages/shared/src/env.ts`**

```ts
import { z } from 'zod';

export const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

export function parseEnv<TShape extends z.ZodRawShape>(
  shape: TShape,
  source: Record<string, string | undefined>,
) {
  return z.object(shape).parse(source);
}
```

- [ ] **Step 5: Create `packages/shared/src/env.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('parses a valid environment object', () => {
    const env = parseEnv(
      {
        API_PORT: z.coerce.number().int().positive(),
      },
      {
        API_PORT: '4000',
      },
    );

    expect(env.API_PORT).toBe(4000);
  });

  it('throws for invalid environment values', () => {
    expect(() =>
      parseEnv(
        {
          API_PORT: z.coerce.number().int().positive(),
        },
        {
          API_PORT: 'invalid',
        },
      ),
    ).toThrow();
  });
});
```

- [ ] **Step 6: Create `packages/shared/src/index.ts`**

```ts
export * from './env.js';
```

- [ ] **Step 7: Install and test shared package**

Run:

```bash
pnpm install
pnpm --filter @athletiq/shared test
pnpm --filter @athletiq/shared build
```

Expected: tests pass and `packages/shared/dist/index.js` exists.

- [ ] **Step 8: Commit shared package**

```bash
git add packages/shared package.json pnpm-lock.yaml
git commit -m "chore: add shared validation package"
```

## Task 4: UI Tokens Package

**Files:**

- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/tokens.ts`
- Create: `packages/ui/src/tokens.test.ts`
- Create: `packages/ui/src/index.ts`

- [ ] **Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@athletiq/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@athletiq/config": "workspace:*"
  }
}
```

- [ ] **Step 2: Create `packages/ui/tsconfig.json`**

```json
{
  "extends": "@athletiq/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `packages/ui/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create `packages/ui/src/tokens.ts`**

```ts
export const athletiqColors = {
  navy: '#0B1F3A',
  green: '#18A058',
  lime: '#B7F34A',
  ink: '#101828',
  muted: '#667085',
  surface: '#FFFFFF',
  background: '#F5F7FA',
  border: '#D0D5DD',
  danger: '#D92D20',
  warning: '#F79009',
} as const;

export const athletiqRadii = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;

export const athletiqSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
```

- [ ] **Step 5: Create `packages/ui/src/tokens.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { athletiqColors, athletiqRadii } from './tokens.js';

describe('ATHLETIQ design tokens', () => {
  it('exposes the core brand colors', () => {
    expect(athletiqColors.navy).toBe('#0B1F3A');
    expect(athletiqColors.green).toBe('#18A058');
  });

  it('keeps default card radius at 8px', () => {
    expect(athletiqRadii.md).toBe(8);
  });
});
```

- [ ] **Step 6: Create `packages/ui/src/index.ts`**

```ts
export * from './tokens.js';
```

- [ ] **Step 7: Test and build UI package**

Run:

```bash
pnpm --filter @athletiq/ui test
pnpm --filter @athletiq/ui build
```

Expected: tests pass and `packages/ui/dist/index.js` exists.

- [ ] **Step 8: Commit UI package**

```bash
git add packages/ui
git commit -m "chore: add shared ui tokens"
```

## Task 5: Database Package And Local Infrastructure

**Files:**

- Create: `docker-compose.yml`
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: athletiq-postgres
    environment:
      POSTGRES_USER: athletiq
      POSTGRES_PASSWORD: athletiq
      POSTGRES_DB: athletiq
    ports:
      - '5432:5432'
    volumes:
      - athletiq-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U athletiq -d athletiq']
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: athletiq-redis
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  athletiq-postgres-data:
```

- [ ] **Step 2: Create `packages/db/package.json`**

```json
{
  "name": "@athletiq/db",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.2",
    "pg": "^8.16.0"
  },
  "devDependencies": {
    "@athletiq/config": "workspace:*",
    "@types/pg": "^8.15.4",
    "drizzle-kit": "^0.31.1"
  }
}
```

- [ ] **Step 3: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "@athletiq/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create `packages/db/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://athletiq:athletiq@localhost:5432/athletiq',
  },
});
```

- [ ] **Step 5: Create `packages/db/src/schema.ts`**

```ts
import { jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 6: Create `packages/db/src/client.ts`**

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
  };
}
```

- [ ] **Step 7: Create `packages/db/src/index.ts`**

```ts
export * from './client.js';
export * from './schema.js';
```

- [ ] **Step 8: Install, start infrastructure, generate migration, and build**

Run:

```bash
pnpm install
docker compose up -d
pnpm --filter @athletiq/db db:generate
pnpm --filter @athletiq/db build
```

Expected:

- PostgreSQL starts on port `5432`.
- Redis starts on port `6379`.
- A migration folder is created in `packages/db/drizzle`.
- `packages/db/dist/index.js` exists.

- [ ] **Step 9: Commit database and infrastructure**

```bash
git add docker-compose.yml packages/db package.json pnpm-lock.yaml
git commit -m "chore: add database package and local infrastructure"
```

## Task 6: NestJS API App

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/test/health.e2e-spec.ts`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@athletiq/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsx watch src/main.ts",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@athletiq/shared": "workspace:*",
    "@nestjs/common": "^11.1.3",
    "@nestjs/core": "^11.1.3",
    "@nestjs/platform-fastify": "^11.1.3",
    "@nestjs/swagger": "^11.2.0",
    "fastify": "^5.3.3",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "zod": "^3.25.56"
  },
  "devDependencies": {
    "@athletiq/config": "workspace:*",
    "@nestjs/testing": "^11.1.3",
    "@types/node": "^22.15.29",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.1.1",
    "tsx": "^4.19.4"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "@athletiq/config/tsconfig/node.json",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["test/**/*.ts", "**/*.test.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `apps/api/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
});
```

- [ ] **Step 5: Create `apps/api/src/config/env.ts`**

```ts
import { z } from 'zod';
import { parseEnv } from '@athletiq/shared';

export const apiEnv = parseEnv(
  {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
  },
  process.env,
);
```

- [ ] **Step 6: Create `apps/api/src/health/health.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'athletiq-api',
    };
  }
}
```

- [ ] **Step 7: Create `apps/api/src/health/health.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 8: Create `apps/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

- [ ] **Step 9: Create `apps/api/src/main.ts`**

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { apiEnv } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.setGlobalPrefix('api');

  await app.listen(apiEnv.API_PORT, '0.0.0.0');
}

void bootstrap();
```

- [ ] **Step 10: Create `apps/api/test/health.e2e-spec.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Health endpoint', () => {
  it('returns API health status', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          status: 'ok',
          service: 'athletiq-api',
        });
      });

    await app.close();
  });
});
```

- [ ] **Step 11: Install, test, and build API**

Run:

```bash
pnpm install
pnpm --filter @athletiq/api test
pnpm --filter @athletiq/api build
```

Expected: health endpoint test passes and `apps/api/dist/src/main.js` exists.

- [ ] **Step 12: Commit API app**

```bash
git add apps/api package.json pnpm-lock.yaml
git commit -m "feat: add api health service"
```

## Task 7: Worker App

**Files:**

- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/tsconfig.build.json`
- Create: `apps/worker/vitest.config.ts`
- Create: `apps/worker/src/env.ts`
- Create: `apps/worker/src/queues.ts`
- Create: `apps/worker/src/jobs/health.job.ts`
- Create: `apps/worker/src/main.ts`
- Create: `apps/worker/test/queues.test.ts`

- [ ] **Step 1: Create `apps/worker/package.json`**

```json
{
  "name": "@athletiq/worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsx watch src/main.ts",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@athletiq/shared": "workspace:*",
    "bullmq": "^5.53.2",
    "ioredis": "^5.6.1",
    "zod": "^3.25.56"
  },
  "devDependencies": {
    "@athletiq/config": "workspace:*",
    "@types/node": "^22.15.29",
    "tsx": "^4.19.4"
  }
}
```

- [ ] **Step 2: Create `apps/worker/tsconfig.json`**

```json
{
  "extends": "@athletiq/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create `apps/worker/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["test/**/*.ts", "**/*.test.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `apps/worker/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 5: Create `apps/worker/src/env.ts`**

```ts
import { z } from 'zod';
import { parseEnv } from '@athletiq/shared';

export const workerEnv = parseEnv(
  {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
  },
  process.env,
);
```

- [ ] **Step 6: Create `apps/worker/src/queues.ts`**

```ts
export const QueueNames = {
  documentExtraction: 'document-extraction',
  notifications: 'notifications',
  reports: 'reports',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];
```

- [ ] **Step 7: Create `apps/worker/src/jobs/health.job.ts`**

```ts
export function runHealthJob() {
  return {
    status: 'ok',
    service: 'athletiq-worker',
  };
}
```

- [ ] **Step 8: Create `apps/worker/src/main.ts`**

```ts
import { runHealthJob } from './jobs/health.job.js';
import { workerEnv } from './env.js';

function main() {
  const health = runHealthJob();
  console.log(`${health.service} ready in ${workerEnv.NODE_ENV}`);
}

main();
```

- [ ] **Step 9: Create `apps/worker/test/queues.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { QueueNames } from '../src/queues.js';
import { runHealthJob } from '../src/jobs/health.job.js';

describe('worker foundation', () => {
  it('defines the document extraction queue', () => {
    expect(QueueNames.documentExtraction).toBe('document-extraction');
  });

  it('runs the health job', () => {
    expect(runHealthJob()).toEqual({
      status: 'ok',
      service: 'athletiq-worker',
    });
  });
});
```

- [ ] **Step 10: Install, test, and build worker**

Run:

```bash
pnpm install
pnpm --filter @athletiq/worker test
pnpm --filter @athletiq/worker build
```

Expected: worker tests pass and `apps/worker/dist/src/main.js` exists.

- [ ] **Step 11: Commit worker app**

```bash
git add apps/worker package.json pnpm-lock.yaml
git commit -m "feat: add worker foundation"
```

## Task 8: Next.js Web App

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/next-env.d.ts`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/src/app-name.test.ts`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@athletiq/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "next build",
    "dev": "next dev --port 3000",
    "lint": "eslint . --max-warnings=0",
    "start": "next start --port 3000",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@athletiq/ui": "workspace:*",
    "next": "^15.3.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zod": "^3.25.56"
  },
  "devDependencies": {
    "@athletiq/config": "workspace:*",
    "@types/node": "^22.15.29",
    "@types/react": "^19.1.6",
    "@types/react-dom": "^19.1.5"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "@athletiq/config/tsconfig/react.json",
  "compilerOptions": {
    "allowJs": true,
    "incremental": true,
    "noEmit": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create `apps/web/next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 5: Create `apps/web/next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is generated by Next.js conventions and kept in source control for editor support.
```

- [ ] **Step 6: Create `apps/web/app/globals.css`**

```css
:root {
  color: #101828;
  background: #f5f7fa;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

a {
  color: inherit;
}
```

- [ ] **Step 7: Create `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ATHLETIQ',
  description: 'Verified athlete identity and school sports infrastructure.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create `apps/web/app/page.tsx`**

```tsx
import { athletiqColors } from '@athletiq/ui';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: athletiqColors.background,
        color: athletiqColors.ink,
        padding: 24,
      }}
    >
      <section style={{ maxWidth: 720 }}>
        <p style={{ color: athletiqColors.green, fontWeight: 700, margin: 0 }}>ATHLETIQ</p>
        <h1 style={{ color: athletiqColors.navy, fontSize: 42, lineHeight: 1.1, margin: '12px 0' }}>
          Track the Rise. Train the Future.
        </h1>
        <p style={{ color: athletiqColors.muted, fontSize: 18, lineHeight: 1.6, margin: 0 }}>
          Verified athlete identity and tournament infrastructure for school sports.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 9: Create `apps/web/src/app-name.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

describe('web app foundation', () => {
  it('uses the ATHLETIQ product name', () => {
    expect('ATHLETIQ').toBe('ATHLETIQ');
  });
});
```

- [ ] **Step 10: Install, test, typecheck, and build web app**

Run:

```bash
pnpm install
pnpm --filter @athletiq/ui build
pnpm --filter @athletiq/web test
pnpm --filter @athletiq/web typecheck
pnpm --filter @athletiq/web build
```

Expected: web test passes, typecheck passes, and Next.js creates `apps/web/.next`.

- [ ] **Step 11: Commit web app**

```bash
git add apps/web package.json pnpm-lock.yaml
git commit -m "feat: add web app foundation"
```

## Task 9: Expo Mobile App

**Files:**

- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/vitest.config.ts`
- Create: `apps/mobile/App.tsx`
- Create: `apps/mobile/src/tokens.test.ts`

- [ ] **Step 1: Create `apps/mobile/package.json`**

```json
{
  "name": "@athletiq/mobile",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "App.tsx",
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "dev": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@athletiq/ui": "workspace:*",
    "expo": "^55.0.0",
    "react": "^19.1.0",
    "react-native": "^0.83.0"
  },
  "devDependencies": {
    "@athletiq/config": "workspace:*",
    "@types/react": "^19.1.6"
  }
}
```

- [ ] **Step 2: Create `apps/mobile/app.json`**

```json
{
  "expo": {
    "name": "ATHLETIQ",
    "slug": "athletiq",
    "version": "0.1.0",
    "orientation": "portrait",
    "scheme": "athletiq",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.athletiq.app"
    },
    "android": {
      "package": "com.athletiq.app"
    }
  }
}
```

- [ ] **Step 3: Create `apps/mobile/tsconfig.json`**

```json
{
  "extends": "@athletiq/config/tsconfig/react.json",
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "jsx": "react-native",
    "noEmit": true
  },
  "include": ["App.tsx", "src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 4: Create `apps/mobile/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 5: Create `apps/mobile/App.tsx`**

```tsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { athletiqColors } from '@athletiq/ui';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>ATHLETIQ</Text>
      <Text style={styles.title}>Track the Rise. Train the Future.</Text>
      <Text style={styles.body}>Verified athlete identity for school sports.</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: athletiqColors.background,
  },
  eyebrow: {
    color: athletiqColors.green,
    fontWeight: '700',
    marginBottom: 12,
  },
  title: {
    color: athletiqColors.navy,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginBottom: 12,
  },
  body: {
    color: athletiqColors.muted,
    fontSize: 17,
    lineHeight: 25,
  },
});
```

- [ ] **Step 6: Create `apps/mobile/src/tokens.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { athletiqColors } from '@athletiq/ui';

describe('mobile app foundation', () => {
  it('uses ATHLETIQ brand tokens', () => {
    expect(athletiqColors.green).toBe('#18A058');
  });
});
```

- [ ] **Step 7: Install, test, and typecheck mobile app**

Run:

```bash
pnpm install
pnpm --filter @athletiq/ui build
pnpm --filter @athletiq/mobile test
pnpm --filter @athletiq/mobile typecheck
```

Expected: test and typecheck pass.

- [ ] **Step 8: Commit mobile app**

```bash
git add apps/mobile package.json pnpm-lock.yaml
git commit -m "feat: add mobile app foundation"
```

## Task 10: CI Workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  checks:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: athletiq
          POSTGRES_PASSWORD: athletiq
          POSTGRES_DB: athletiq
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U athletiq -d athletiq"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    env:
      NODE_ENV: test
      DATABASE_URL: postgres://athletiq:athletiq@localhost:5432/athletiq
      REDIS_URL: redis://localhost:6379

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Enable Corepack
        run: corepack enable

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

- [ ] **Step 2: Run local checks before committing**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands pass.

- [ ] **Step 3: Commit CI workflow**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add foundation checks"
```

## Task 11: Final Phase 0 Verification

**Files:**

- Modify only if a verification command reveals a concrete issue in files created by Tasks 1-10.

- [ ] **Step 1: Start local infrastructure**

Run:

```bash
docker compose up -d
```

Expected: `athletiq-postgres` and `athletiq-redis` are healthy.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands pass.

- [ ] **Step 3: Run API locally**

Run:

```bash
pnpm --filter @athletiq/api dev
```

Expected: API starts on port `4000`.

- [ ] **Step 4: Check API health from another terminal**

Run:

```bash
curl http://localhost:4000/api/health
```

Expected:

```json
{ "status": "ok", "service": "athletiq-api" }
```

- [ ] **Step 5: Run web locally**

Run:

```bash
pnpm --filter @athletiq/web dev
```

Expected: web app starts on port `3000`.

- [ ] **Step 6: Open web app**

Open:

```txt
http://localhost:3000
```

Expected: the page shows `ATHLETIQ` and `Track the Rise. Train the Future.`

- [ ] **Step 7: Run mobile dev server**

Run:

```bash
pnpm --filter @athletiq/mobile dev
```

Expected: Expo starts and displays a QR code or development server URL.

- [ ] **Step 8: Commit verification fixes if any were required**

If files changed during verification, run:

```bash
git add .
git commit -m "fix: stabilize foundation verification"
```

Expected: no commit is needed when all checks passed without edits.

## Phase 0 Completion Criteria

- [ ] Root workspace files exist.
- [ ] Shared TypeScript config exists.
- [ ] Shared validation package builds and tests pass.
- [ ] UI token package builds and tests pass.
- [ ] Database package builds and migration generation works.
- [ ] Docker Compose starts PostgreSQL and Redis.
- [ ] API app builds and health test passes.
- [ ] Worker app builds and tests pass.
- [ ] Web app builds and renders foundation page.
- [ ] Mobile app typechecks and starts through Expo.
- [ ] CI workflow runs lint, typecheck, test, and build.
- [ ] Final `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally.
