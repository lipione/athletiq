import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../src/database/database.service.js';

describe('DatabaseService', () => {
  it('stays disabled unless the postgres backend is explicitly selected', () => {
    const previousBackend = process.env.ATHLETIQ_DATA_BACKEND;
    delete process.env.ATHLETIQ_DATA_BACKEND;

    const service = new DatabaseService();
    service.onModuleInit();

    expect(service.isEnabled()).toBe(false);
    expect(() => service.db).toThrow('PostgreSQL data backend is not enabled');

    if (previousBackend === undefined) {
      delete process.env.ATHLETIQ_DATA_BACKEND;
    } else {
      process.env.ATHLETIQ_DATA_BACKEND = previousBackend;
    }
  });
});
