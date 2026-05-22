import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller.js';
import { SchoolsService } from './schools.service.js';
import { RepositoryModule } from '../repositories/repository.module.js';

@Module({
  imports: [RepositoryModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
