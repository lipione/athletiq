import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repositories/repository.module.js';
import { BracketsController } from './brackets.controller.js';
import { BracketsService } from './brackets.service.js';

@Module({
  imports: [RepositoryModule],
  controllers: [BracketsController],
  providers: [BracketsService],
})
export class BracketsModule {}
