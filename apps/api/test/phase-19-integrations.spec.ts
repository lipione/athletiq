import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

const describeDatabase = process.env.ATHLETIQ_DATABASE_E2E === '1' ? describe : describe.skip;

type Api = ReturnType<typeof request>;
type Actor = { id: string; role: string };

const headersFor = (user: Actor) => ({
  'x-athletiq-user-id': user.id,
  'x-athletiq-user-role': user.role,
});

const superAdmin = { id: 'usr_super_admin', role: 'super_admin' };
const uniqueRunId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const createApp = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};

const registerSchoolAdmin = async (api: Api) => {
  const response = await api
    .post('/api/auth/register')
    .send({
      email: `phase19_${Math.random().toString(36).slice(2, 10)}@athletiq.local`,
      password: 'password123',
      role: 'school_admin',
    })
    .expect(201);
  return { id: response.body.user.id as string, role: 'school_admin' };
};

describe('phase 19 integrations, imports, exports, and open APIs', () => {
  it('manages import previews, partner keys, public feeds, export bundles, and webhook test deliveries', async () => {
    const app = await createApp();

    const api = request(app.getHttpServer());
    const schoolAdmin = await registerSchoolAdmin(api);

    const school = await api
      .post('/api/schools')
      .set(headersFor(schoolAdmin))
      .send({ name: 'Phase 19 Import School', location: 'Pokhara' })
      .expect(201);
    await api
      .post(`/api/schools/${school.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);

    const preview = await api
      .post('/api/integrations/imports/spreadsheet/preview')
      .set(headersFor(superAdmin))
      .send({
        sourceName: 'district-school-upload.xlsx',
        entityType: 'athletes',
        rows: [
          {
            externalId: 'ath-001',
            schoolId: school.body.id,
            fullName: 'Import Athlete One',
            dateOfBirth: '2012-01-15',
            gender: 'female',
          },
          {
            externalId: 'ath-002',
            schoolId: school.body.id,
            fullName: '',
          },
        ],
      })
      .expect(201);

    expect(preview.body).toMatchObject({
      status: 'previewed',
      entityType: 'athletes',
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
    });
    expect(preview.body.errors[0]).toMatchObject({ rowIndex: 1, field: 'fullName' });

    const committed = await api
      .post(`/api/integrations/imports/${preview.body.id}/commit`)
      .set(headersFor(superAdmin))
      .send({ mode: 'create_missing' })
      .expect(201);
    expect(committed.body).toMatchObject({
      id: preview.body.id,
      status: 'committed',
      committedRows: 1,
    });

    const rolledBack = await api
      .post(`/api/integrations/imports/${preview.body.id}/rollback`)
      .set(headersFor(superAdmin))
      .send({ reason: 'pilot data reset' })
      .expect(201);
    expect(rolledBack.body).toMatchObject({
      id: preview.body.id,
      status: 'rolled_back',
      rollbackReason: 'pilot data reset',
    });

    const key = await api
      .post('/api/integrations/api-keys')
      .set(headersFor(superAdmin))
      .send({
        partnerName: 'National Federation Data Partner',
        scopes: ['fixtures.read', 'results.read'],
        expiresAt: '2027-01-01T00:00:00.000Z',
      })
      .expect(201);
    expect(key.body.secret).toMatch(/^atlq_live_/);
    expect(key.body.secretHash).toBeUndefined();
    expect(key.body).toMatchObject({
      partnerName: 'National Federation Data Partner',
      scopes: ['fixtures.read', 'results.read'],
      status: 'active',
    });

    const draftTournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({ name: 'Phase 19 Draft Cup', sport: 'football', format: 'league' })
      .expect(201);
    await api.get(`/api/public/tournaments/${draftTournament.body.id}/fixtures`).expect(404);

    const tournament = await api
      .post('/api/tournaments')
      .set(headersFor(superAdmin))
      .send({ name: 'Phase 19 Public Cup', sport: 'football', format: 'league' })
      .expect(201);
    await api
      .post(`/api/tournaments/${tournament.body.id}/approve`)
      .set(headersFor(superAdmin))
      .expect(201);
    await api
      .post(`/api/tournaments/${tournament.body.id}/register-school`)
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.body.id })
      .expect(201);

    const athleteA = await api
      .post('/api/athletes/drafts')
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.body.id, fullName: 'Open Feed Athlete A', gender: 'female' })
      .expect(201);
    const athleteB = await api
      .post('/api/athletes/drafts')
      .set(headersFor(schoolAdmin))
      .send({ schoolId: school.body.id, fullName: 'Open Feed Athlete B', gender: 'male' })
      .expect(201);
    await api
      .post(`/api/athletes/${athleteA.body.id}/identity/approve`)
      .set(headersFor(superAdmin))
      .expect(201);
    await api
      .post(`/api/athletes/${athleteB.body.id}/identity/approve`)
      .set(headersFor(superAdmin))
      .expect(201);

    const teamA = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.body.id,
        name: 'Open Feed A',
        athleteIds: [athleteA.body.id],
      })
      .expect(201);
    const teamB = await api
      .post('/api/teams')
      .set(headersFor(schoolAdmin))
      .send({
        tournamentId: tournament.body.id,
        schoolId: school.body.id,
        name: 'Open Feed B',
        athleteIds: [athleteB.body.id],
      })
      .expect(201);
    const match = await api
      .post('/api/matches')
      .set(headersFor(superAdmin))
      .send({
        tournamentId: tournament.body.id,
        homeTeamId: teamA.body.id,
        awayTeamId: teamB.body.id,
        scheduledAt: '2026-12-04T10:00:00.000Z',
      })
      .expect(201);
    await api
      .post(`/api/matches/${match.body.id}/submit-result`)
      .set(headersFor(superAdmin))
      .send({ homeScore: 3, awayScore: 2 })
      .expect(201);

    const unverifiedResults = await api
      .get(`/api/public/tournaments/${tournament.body.id}/results`)
      .expect(200);
    expect(unverifiedResults.body.results).toEqual([]);

    await api.post(`/api/matches/${match.body.id}/verify`).set(headersFor(superAdmin)).expect(201);

    const fixtures = await api
      .get(`/api/public/tournaments/${tournament.body.id}/fixtures`)
      .expect(200);
    expect(fixtures.body.matches[0]).toMatchObject({
      matchId: match.body.id,
      homeTeamName: 'Open Feed A',
      awayTeamName: 'Open Feed B',
    });

    const results = await api
      .get(`/api/public/tournaments/${tournament.body.id}/results`)
      .expect(200);
    expect(results.body.results[0]).toMatchObject({
      matchId: match.body.id,
      homeScore: 3,
      awayScore: 2,
      status: 'verified',
    });

    const bundle = await api
      .post('/api/integrations/export-bundles')
      .set(headersFor(superAdmin))
      .send({
        tournamentId: tournament.body.id,
        formats: ['json', 'csv'],
        include: ['fixtures', 'results'],
      })
      .expect(201);
    expect(bundle.body).toMatchObject({
      status: 'ready',
      tournamentId: tournament.body.id,
      formats: ['json', 'csv'],
    });

    const webhook = await api
      .post('/api/integrations/webhooks')
      .set(headersFor(superAdmin))
      .send({
        url: 'https://partner.example.com/athletiq',
        events: ['match.verified', 'import.committed'],
        secretLabel: 'primary',
      })
      .expect(201);
    expect(webhook.body).toMatchObject({
      status: 'active',
      events: ['match.verified', 'import.committed'],
    });

    const delivery = await api
      .post(`/api/integrations/webhooks/${webhook.body.id}/test-delivery`)
      .set(headersFor(superAdmin))
      .send({ event: 'match.verified' })
      .expect(201);
    expect(delivery.body).toMatchObject({
      webhookId: webhook.body.id,
      event: 'match.verified',
      status: 'delivered',
      attempt: 1,
    });

    await api
      .post('/api/integrations/api-keys')
      .set(headersFor(schoolAdmin))
      .send({ partnerName: 'Denied Partner', scopes: ['fixtures.read'] })
      .expect(403);

    await app.close();
  });
});

describeDatabase('phase 19 postgres integrations', () => {
  const originalBackend = process.env.ATHLETIQ_DATA_BACKEND;

  beforeEach(() => {
    process.env.ATHLETIQ_DATA_BACKEND = 'postgres';
  });

  afterEach(() => {
    if (originalBackend === undefined) {
      delete process.env.ATHLETIQ_DATA_BACKEND;
    } else {
      process.env.ATHLETIQ_DATA_BACKEND = originalBackend;
    }
  });

  it('persists import, partner key, export bundle, webhook subscription, and delivery rows in postgres', async () => {
    const runId = uniqueRunId();
    const app = await createApp();

    try {
      const api = request(app.getHttpServer());
      const schoolAdmin = await registerSchoolAdmin(api);
      const school = await api
        .post('/api/schools')
        .set(headersFor(schoolAdmin))
        .send({ name: `Phase 19 PG Import School ${runId}`, location: 'Pokhara' })
        .expect(201);
      await api
        .post(`/api/schools/${school.body.id}/approve`)
        .set(headersFor(superAdmin))
        .expect(201);

      const preview = await api
        .post('/api/integrations/imports/spreadsheet/preview')
        .set(headersFor(superAdmin))
        .send({
          sourceName: `district-school-upload-${runId}.xlsx`,
          entityType: 'athletes',
          rows: [
            {
              externalId: `ath-${runId}`,
              schoolId: school.body.id,
              fullName: 'Import Athlete One',
              dateOfBirth: '2012-01-15',
              gender: 'female',
            },
            {
              externalId: `ath-invalid-${runId}`,
              schoolId: school.body.id,
              fullName: '',
            },
          ],
        })
        .expect(201);

      await api
        .post(`/api/integrations/imports/${preview.body.id}/commit`)
        .set(headersFor(superAdmin))
        .send({ mode: 'create_missing' })
        .expect(201);
      await api
        .post(`/api/integrations/imports/${preview.body.id}/rollback`)
        .set(headersFor(superAdmin))
        .send({ reason: `pilot data reset ${runId}` })
        .expect(201);

      const key = await api
        .post('/api/integrations/api-keys')
        .set(headersFor(superAdmin))
        .send({
          partnerName: `National Federation Data Partner ${runId}`,
          scopes: ['fixtures.read', 'results.read'],
          expiresAt: '2027-01-01T00:00:00.000Z',
        })
        .expect(201);

      const tournament = await api
        .post('/api/tournaments')
        .set(headersFor(superAdmin))
        .send({ name: `Phase 19 PG Public Cup ${runId}`, sport: 'football', format: 'league' })
        .expect(201);
      await api
        .post(`/api/tournaments/${tournament.body.id}/approve`)
        .set(headersFor(superAdmin))
        .expect(201);

      const bundle = await api
        .post('/api/integrations/export-bundles')
        .set(headersFor(superAdmin))
        .send({
          tournamentId: tournament.body.id,
          formats: ['json', 'csv'],
          include: ['fixtures', 'results'],
        })
        .expect(201);

      const webhook = await api
        .post('/api/integrations/webhooks')
        .set(headersFor(superAdmin))
        .send({
          url: `https://partner.example.com/athletiq/${runId}`,
          events: ['match.verified', 'import.committed'],
          secretLabel: 'primary',
        })
        .expect(201);

      const delivery = await api
        .post(`/api/integrations/webhooks/${webhook.body.id}/test-delivery`)
        .set(headersFor(superAdmin))
        .send({ event: 'match.verified' })
        .expect(201);

      const database = app.get(DatabaseService);
      const importRow = await database.pool.query<{
        id: string;
        tenant_id: string;
        source_name: string;
        status: string;
        total_rows: number;
        valid_rows: number;
        invalid_rows: number;
        committed_rows: number;
        committed_by: string;
        rollback_reason: string;
        rolled_back_by: string;
        errors: Array<{ rowIndex: number; field: string }>;
        rows: Array<{ externalId: string }>;
      }>(
        `
          SELECT id, tenant_id, source_name, status, total_rows, valid_rows, invalid_rows,
                 committed_rows, committed_by, rollback_reason, rolled_back_by, errors, rows
          FROM spreadsheet_imports
          WHERE id = $1
        `,
        [preview.body.id],
      );
      expect(importRow.rows).toHaveLength(1);
      expect(importRow.rows[0]).toMatchObject({
        id: preview.body.id,
        tenant_id: 'platform',
        source_name: `district-school-upload-${runId}.xlsx`,
        status: 'rolled_back',
        total_rows: 2,
        valid_rows: 1,
        invalid_rows: 1,
        committed_rows: 1,
        committed_by: superAdmin.id,
        rollback_reason: `pilot data reset ${runId}`,
        rolled_back_by: superAdmin.id,
      });
      expect(importRow.rows[0]?.errors[0]).toMatchObject({ rowIndex: 1, field: 'fullName' });
      expect(importRow.rows[0]?.rows[0]?.externalId).toBe(`ath-${runId}`);

      const keyRow = await database.pool.query<{
        id: string;
        tenant_id: string;
        partner_name: string;
        key_prefix: string;
        secret_hash: string;
        scopes: string[];
        status: string;
        created_by: string;
      }>(
        `
          SELECT id, tenant_id, partner_name, key_prefix, secret_hash, scopes, status, created_by
          FROM partner_api_keys
          WHERE id = $1
        `,
        [key.body.id],
      );
      expect(keyRow.rows).toHaveLength(1);
      expect(keyRow.rows[0]).toMatchObject({
        id: key.body.id,
        tenant_id: 'platform',
        partner_name: `National Federation Data Partner ${runId}`,
        key_prefix: key.body.keyPrefix,
        scopes: ['fixtures.read', 'results.read'],
        status: 'active',
        created_by: superAdmin.id,
      });
      expect(keyRow.rows[0]?.secret_hash).toMatch(/^sha256:/);

      const bundleRow = await database.pool.query<{
        id: string;
        tenant_id: string;
        tournament_id: string;
        formats: string[];
        include: string[];
        status: string;
        download_url: string;
        created_by: string;
      }>(
        `
          SELECT id, tenant_id, tournament_id, formats, include, status, download_url, created_by
          FROM export_bundles
          WHERE id = $1
        `,
        [bundle.body.id],
      );
      expect(bundleRow.rows).toHaveLength(1);
      expect(bundleRow.rows[0]).toMatchObject({
        id: bundle.body.id,
        tournament_id: tournament.body.id,
        formats: ['json', 'csv'],
        include: ['fixtures', 'results'],
        status: 'ready',
        created_by: superAdmin.id,
      });
      expect(bundleRow.rows[0]?.download_url).toContain('/api/integrations/export-bundles/');

      const webhookRow = await database.pool.query<{
        id: string;
        tenant_id: string;
        url: string;
        events: string[];
        secret_label: string;
        status: string;
        created_by: string;
      }>(
        `
          SELECT id, tenant_id, url, events, secret_label, status, created_by
          FROM webhook_subscriptions
          WHERE id = $1
        `,
        [webhook.body.id],
      );
      expect(webhookRow.rows).toHaveLength(1);
      expect(webhookRow.rows[0]).toMatchObject({
        id: webhook.body.id,
        tenant_id: 'platform',
        url: `https://partner.example.com/athletiq/${runId}`,
        events: ['match.verified', 'import.committed'],
        secret_label: 'primary',
        status: 'active',
        created_by: superAdmin.id,
      });

      const deliveryRow = await database.pool.query<{
        id: string;
        tenant_id: string;
        webhook_id: string;
        event: string;
        status: string;
        attempt: number;
        response_code: number;
      }>(
        `
          SELECT id, tenant_id, webhook_id, event, status, attempt, response_code
          FROM webhook_deliveries
          WHERE id = $1
        `,
        [delivery.body.id],
      );
      expect(deliveryRow.rows).toHaveLength(1);
      expect(deliveryRow.rows[0]).toMatchObject({
        id: delivery.body.id,
        tenant_id: 'platform',
        webhook_id: webhook.body.id,
        event: 'match.verified',
        status: 'delivered',
        attempt: 1,
        response_code: 202,
      });
    } finally {
      await app.close();
    }
  });
});
