import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SchoolsModule } from './schools/schools.module.js';
import { AthletesModule } from './athletes/athletes.module.js';
import { AuditModule } from './audit/audit.module.js';
import { TournamentsModule } from './tournaments/tournaments.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { SearchModule } from './search/search.module.js';
import { RolesGuard } from './common/roles.guard.js';
import { RateLimitGuard } from './common/rate-limit.guard.js';
import { QrModule } from './qr/qr.module.js';
import { SyncModule } from './sync/sync.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';
import { DatabaseModule } from './database/database.module.js';
import { RepositoryModule } from './repositories/repository.module.js';
import { PrivacyModule } from './privacy/privacy.module.js';
import { BillingModule } from './billing/billing.module.js';
import { WaiversModule } from './waivers/waivers.module.js';
import { BracketsModule } from './brackets/brackets.module.js';
import { SchedulingModule } from './scheduling/scheduling.module.js';
import { CommunicationsModule } from './communications/communications.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    SchoolsModule,
    AthletesModule,
    AuditModule,
    TournamentsModule,
    TeamsModule,
    MatchesModule,
    DocumentsModule,
    SearchModule,
    QrModule,
    SyncModule,
    AnalyticsModule,
    PrivacyModule,
    BillingModule,
    WaiversModule,
    BracketsModule,
    SchedulingModule,
    CommunicationsModule,
    IntegrationsModule,
    TenancyModule,
    DatabaseModule,
    RepositoryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
