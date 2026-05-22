import { afterEach, describe, expect, it } from 'vitest';

const { AppDataStore } = await import('../src/common/store.js');

describe('AppDataStore persistence boundary', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalBackend = process.env.ATHLETIQ_DATA_BACKEND;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.ATHLETIQ_DATA_BACKEND = originalBackend;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('remains an in-memory fallback even when database env vars are present', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://athletiq:athletiq@localhost:5432/athletiq';
    process.env.ATHLETIQ_DATA_BACKEND = 'postgres';

    const store = new AppDataStore();
    const schools = await store.listSchools();
    const superAdmin = await store.getUserById('usr_super_admin');

    expect(schools).toEqual([]);
    expect(superAdmin).toEqual(
      expect.objectContaining({
        id: 'usr_super_admin',
        roles: ['super_admin'],
      }),
    );
  });
});
