import { Module, type Provider } from '@nestjs/common';
import { DataModule } from '../common/data.module.js';
import { DatabaseModule } from '../database/database.module.js';
import {
  MemoryAnalyticsRepository,
  MemoryAuthSessionRepository,
  MemoryAthleteRepository,
  MemoryAuditRepository,
  MemoryBillingRepository,
  MemoryBracketRepository,
  MemoryCommunicationRepository,
  MemoryDocumentRepository,
  MemoryMatchRepository,
  MemoryQrRepository,
  MemorySchedulingRepository,
  MemorySchoolRepository,
  MemorySearchRepository,
  MemorySyncRepository,
  MemoryTeamRepository,
  MemoryTournamentRepository,
  MemoryUserRepository,
  MemoryWaiverRepository,
} from './memory-repositories.js';
import {
  PostgresAnalyticsRepository,
  PostgresAuthSessionRepository,
  PostgresAthleteRepository,
  PostgresAuditRepository,
  PostgresBillingRepository,
  PostgresBracketRepository,
  PostgresCommunicationRepository,
  PostgresDocumentRepository,
  PostgresMatchRepository,
  PostgresQrRepository,
  PostgresSchedulingRepository,
  PostgresSchoolRepository,
  PostgresSearchRepository,
  PostgresSyncRepository,
  PostgresTeamRepository,
  PostgresTournamentRepository,
  PostgresUserRepository,
  PostgresWaiverRepository,
} from './postgres-repositories.js';
import {
  ANALYTICS_REPOSITORY,
  AUTH_SESSION_REPOSITORY,
  ATHLETE_REPOSITORY,
  AUDIT_REPOSITORY,
  BILLING_REPOSITORY,
  BRACKET_REPOSITORY,
  COMMUNICATION_REPOSITORY,
  DOCUMENT_REPOSITORY,
  MATCH_REPOSITORY,
  QR_REPOSITORY,
  SCHEDULING_REPOSITORY,
  SCHOOL_REPOSITORY,
  SEARCH_REPOSITORY,
  SYNC_REPOSITORY,
  TEAM_REPOSITORY,
  TOURNAMENT_REPOSITORY,
  USER_REPOSITORY,
  WAIVER_REPOSITORY,
} from './repository.types.js';

const usePostgresRepositories = () => process.env.ATHLETIQ_DATA_BACKEND === 'postgres';

const memoryRepositoryProviders = [
  MemoryAnalyticsRepository,
  MemoryAuthSessionRepository,
  MemoryAthleteRepository,
  MemoryAuditRepository,
  MemoryBillingRepository,
  MemoryBracketRepository,
  MemoryCommunicationRepository,
  MemoryDocumentRepository,
  MemoryMatchRepository,
  MemoryQrRepository,
  MemorySchedulingRepository,
  MemorySchoolRepository,
  MemorySearchRepository,
  MemorySyncRepository,
  MemoryTeamRepository,
  MemoryTournamentRepository,
  MemoryUserRepository,
  MemoryWaiverRepository,
] as const;

const postgresRepositoryProviders = [
  PostgresAnalyticsRepository,
  PostgresAuthSessionRepository,
  PostgresAthleteRepository,
  PostgresAuditRepository,
  PostgresBillingRepository,
  PostgresBracketRepository,
  PostgresCommunicationRepository,
  PostgresDocumentRepository,
  PostgresMatchRepository,
  PostgresQrRepository,
  PostgresSchedulingRepository,
  PostgresSchoolRepository,
  PostgresSearchRepository,
  PostgresSyncRepository,
  PostgresTeamRepository,
  PostgresTournamentRepository,
  PostgresUserRepository,
  PostgresWaiverRepository,
] as const;

const repositoryTokenProviders: Provider[] = [
  {
    provide: ANALYTICS_REPOSITORY,
    useFactory: (memory: MemoryAnalyticsRepository, postgres: PostgresAnalyticsRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryAnalyticsRepository, PostgresAnalyticsRepository],
  },
  {
    provide: AUTH_SESSION_REPOSITORY,
    useFactory: (memory: MemoryAuthSessionRepository, postgres: PostgresAuthSessionRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryAuthSessionRepository, PostgresAuthSessionRepository],
  },
  {
    provide: ATHLETE_REPOSITORY,
    useFactory: (memory: MemoryAthleteRepository, postgres: PostgresAthleteRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryAthleteRepository, PostgresAthleteRepository],
  },
  {
    provide: AUDIT_REPOSITORY,
    useFactory: (memory: MemoryAuditRepository, postgres: PostgresAuditRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryAuditRepository, PostgresAuditRepository],
  },
  {
    provide: BILLING_REPOSITORY,
    useFactory: (memory: MemoryBillingRepository, postgres: PostgresBillingRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryBillingRepository, PostgresBillingRepository],
  },
  {
    provide: BRACKET_REPOSITORY,
    useFactory: (memory: MemoryBracketRepository, postgres: PostgresBracketRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryBracketRepository, PostgresBracketRepository],
  },
  {
    provide: DOCUMENT_REPOSITORY,
    useFactory: (memory: MemoryDocumentRepository, postgres: PostgresDocumentRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryDocumentRepository, PostgresDocumentRepository],
  },
  {
    provide: COMMUNICATION_REPOSITORY,
    useFactory: (
      memory: MemoryCommunicationRepository,
      postgres: PostgresCommunicationRepository,
    ) => (usePostgresRepositories() ? postgres : memory),
    inject: [MemoryCommunicationRepository, PostgresCommunicationRepository],
  },
  {
    provide: MATCH_REPOSITORY,
    useFactory: (memory: MemoryMatchRepository, postgres: PostgresMatchRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryMatchRepository, PostgresMatchRepository],
  },
  {
    provide: QR_REPOSITORY,
    useFactory: (memory: MemoryQrRepository, postgres: PostgresQrRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryQrRepository, PostgresQrRepository],
  },
  {
    provide: SCHEDULING_REPOSITORY,
    useFactory: (memory: MemorySchedulingRepository, postgres: PostgresSchedulingRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemorySchedulingRepository, PostgresSchedulingRepository],
  },
  {
    provide: SCHOOL_REPOSITORY,
    useFactory: (memory: MemorySchoolRepository, postgres: PostgresSchoolRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemorySchoolRepository, PostgresSchoolRepository],
  },
  {
    provide: SEARCH_REPOSITORY,
    useFactory: (memory: MemorySearchRepository, postgres: PostgresSearchRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemorySearchRepository, PostgresSearchRepository],
  },
  {
    provide: SYNC_REPOSITORY,
    useFactory: (memory: MemorySyncRepository, postgres: PostgresSyncRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemorySyncRepository, PostgresSyncRepository],
  },
  {
    provide: TEAM_REPOSITORY,
    useFactory: (memory: MemoryTeamRepository, postgres: PostgresTeamRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryTeamRepository, PostgresTeamRepository],
  },
  {
    provide: TOURNAMENT_REPOSITORY,
    useFactory: (memory: MemoryTournamentRepository, postgres: PostgresTournamentRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryTournamentRepository, PostgresTournamentRepository],
  },
  {
    provide: USER_REPOSITORY,
    useFactory: (memory: MemoryUserRepository, postgres: PostgresUserRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryUserRepository, PostgresUserRepository],
  },
  {
    provide: WAIVER_REPOSITORY,
    useFactory: (memory: MemoryWaiverRepository, postgres: PostgresWaiverRepository) =>
      usePostgresRepositories() ? postgres : memory,
    inject: [MemoryWaiverRepository, PostgresWaiverRepository],
  },
] as const;

@Module({
  imports: [DataModule, DatabaseModule],
  providers: [
    ...memoryRepositoryProviders,
    ...postgresRepositoryProviders,
    ...repositoryTokenProviders,
  ],
  exports: [
    ...memoryRepositoryProviders,
    ...postgresRepositoryProviders,
    ...repositoryTokenProviders,
  ],
})
export class RepositoryModule {}
