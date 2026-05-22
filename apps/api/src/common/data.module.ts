import { Module } from '@nestjs/common';
import { AppDataStore } from './store.js';

@Module({
  providers: [AppDataStore],
  exports: [AppDataStore],
})
export class DataModule {}
