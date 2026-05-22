import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { RepositoryModule } from '../repositories/repository.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';

@Module({
  imports: [RepositoryModule, TenancyModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
