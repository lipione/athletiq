import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repositories/repository.module.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [RepositoryModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
