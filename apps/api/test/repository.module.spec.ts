import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  ATHLETE_REPOSITORY,
  BILLING_REPOSITORY,
  BRACKET_REPOSITORY,
  DOCUMENT_REPOSITORY,
  SCHEDULING_REPOSITORY,
  USER_REPOSITORY,
  WAIVER_REPOSITORY,
} from '../src/repositories/repository.types.js';
import {
  MemoryAthleteRepository,
  MemoryBillingRepository,
  MemoryBracketRepository,
  MemoryDocumentRepository,
  MemorySchedulingRepository,
  MemoryUserRepository,
  MemoryWaiverRepository,
} from '../src/repositories/memory-repositories.js';
import {
  PostgresAthleteRepository,
  PostgresBillingRepository,
  PostgresBracketRepository,
  PostgresDocumentRepository,
  PostgresSchedulingRepository,
  PostgresUserRepository,
  PostgresWaiverRepository,
} from '../src/repositories/postgres-repositories.js';
import { RepositoryModule } from '../src/repositories/repository.module.js';

describe('RepositoryModule', () => {
  it('resolves memory repositories when ATHLETIQ_DATA_BACKEND is unset', async () => {
    const previousBackend = process.env.ATHLETIQ_DATA_BACKEND;
    delete process.env.ATHLETIQ_DATA_BACKEND;

    try {
      const moduleRef = await Test.createTestingModule({
        imports: [RepositoryModule],
      }).compile();

      expect(moduleRef.get(USER_REPOSITORY)).toBeInstanceOf(MemoryUserRepository);
      expect(moduleRef.get(ATHLETE_REPOSITORY)).toBeInstanceOf(MemoryAthleteRepository);
      expect(moduleRef.get(BILLING_REPOSITORY)).toBeInstanceOf(MemoryBillingRepository);
      expect(moduleRef.get(BRACKET_REPOSITORY)).toBeInstanceOf(MemoryBracketRepository);
      expect(moduleRef.get(DOCUMENT_REPOSITORY)).toBeInstanceOf(MemoryDocumentRepository);
      expect(moduleRef.get(SCHEDULING_REPOSITORY)).toBeInstanceOf(MemorySchedulingRepository);
      expect(moduleRef.get(WAIVER_REPOSITORY)).toBeInstanceOf(MemoryWaiverRepository);

      await moduleRef.close();
    } finally {
      if (previousBackend === undefined) {
        delete process.env.ATHLETIQ_DATA_BACKEND;
      } else {
        process.env.ATHLETIQ_DATA_BACKEND = previousBackend;
      }
    }
  });

  it('resolves postgres repositories when ATHLETIQ_DATA_BACKEND is postgres', async () => {
    const previousBackend = process.env.ATHLETIQ_DATA_BACKEND;
    process.env.ATHLETIQ_DATA_BACKEND = 'postgres';

    try {
      const moduleRef = await Test.createTestingModule({
        imports: [RepositoryModule],
      }).compile();

      expect(moduleRef.get(USER_REPOSITORY)).toBeInstanceOf(PostgresUserRepository);
      expect(moduleRef.get(ATHLETE_REPOSITORY)).toBeInstanceOf(PostgresAthleteRepository);
      expect(moduleRef.get(BILLING_REPOSITORY)).toBeInstanceOf(PostgresBillingRepository);
      expect(moduleRef.get(BRACKET_REPOSITORY)).toBeInstanceOf(PostgresBracketRepository);
      expect(moduleRef.get(DOCUMENT_REPOSITORY)).toBeInstanceOf(PostgresDocumentRepository);
      expect(moduleRef.get(SCHEDULING_REPOSITORY)).toBeInstanceOf(PostgresSchedulingRepository);
      expect(moduleRef.get(WAIVER_REPOSITORY)).toBeInstanceOf(PostgresWaiverRepository);

      await moduleRef.close();
    } finally {
      if (previousBackend === undefined) {
        delete process.env.ATHLETIQ_DATA_BACKEND;
      } else {
        process.env.ATHLETIQ_DATA_BACKEND = previousBackend;
      }
    }
  });
});
