import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repositories/repository.module.js';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

@Module({
  imports: [RepositoryModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
