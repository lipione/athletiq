import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repositories/repository.module.js';
import { IntegrationsController } from './integrations.controller.js';
import { IntegrationsService } from './integrations.service.js';

@Module({
  imports: [RepositoryModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
