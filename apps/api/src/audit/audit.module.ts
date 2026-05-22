import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { RepositoryModule } from '../repositories/repository.module.js';

@Module({
  imports: [RepositoryModule],
  controllers: [AuditController],
})
export class AuditModule {}
