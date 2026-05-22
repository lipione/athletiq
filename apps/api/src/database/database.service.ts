import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createDatabase } from '@athletiq/db';

type DatabaseConnection = ReturnType<typeof createDatabase>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: DatabaseConnection | null = null;

  onModuleInit() {
    if (process.env.ATHLETIQ_DATA_BACKEND !== 'postgres') {
      return;
    }

    this.connection = createDatabase(process.env.DATABASE_URL);
  }

  async onModuleDestroy() {
    if (!this.connection) {
      return;
    }

    await this.connection.pool.end();
    this.connection = null;
  }

  isEnabled() {
    return this.connection !== null;
  }

  get db() {
    if (!this.connection) {
      throw new Error('PostgreSQL data backend is not enabled');
    }

    return this.connection.db;
  }

  get pool() {
    if (!this.connection) {
      throw new Error('PostgreSQL data backend is not enabled');
    }

    return this.connection.pool;
  }
}
