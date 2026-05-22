import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { ATHLETIQ_DATABASE } from './database.tokens.js';

@Module({
  providers: [
    DatabaseService,
    {
      provide: ATHLETIQ_DATABASE,
      useExisting: DatabaseService,
    },
  ],
  exports: [DatabaseService, ATHLETIQ_DATABASE],
})
export class DatabaseModule {}
