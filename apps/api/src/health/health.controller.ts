import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Public } from '../common/public.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'athletiq-api',
    };
  }

  @Public()
  @Get('readiness')
  getReadiness(@Res({ passthrough: true }) response: FastifyReply) {
    const backend = process.env.ATHLETIQ_DATA_BACKEND ?? 'memory';
    const environment = process.env.NODE_ENV ?? 'development';
    const checks = {
      database: {
        configured: backend === 'postgres' && Boolean(process.env.DATABASE_URL),
        backend,
      },
      redis: {
        configured: Boolean(process.env.REDIS_URL),
      },
      storage: {
        configured: Boolean(process.env.BACKUP_BUCKET),
      },
      observability: {
        configured: Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT),
      },
      backups: {
        configured: Boolean(process.env.BACKUP_BUCKET),
        retentionDays: Number(process.env.BACKUP_RETENTION_DAYS ?? 30),
      },
    };
    const requiredChecks = Object.values(checks).map((check) => check.configured);
    const status = requiredChecks.every(Boolean) ? 'ready' : 'degraded';

    if (status === 'degraded') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status,
      service: 'athletiq-api',
      environment,
      releaseSha: process.env.ATHLETIQ_RELEASE_SHA ?? 'local',
      checkedAt: new Date().toISOString(),
      checks,
    };
  }
}
