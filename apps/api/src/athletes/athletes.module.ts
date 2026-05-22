import { Module } from '@nestjs/common';
import { AthletesService } from './athletes.service.js';
import { AthletesController } from './athletes.controller.js';
import { RepositoryModule } from '../repositories/repository.module.js';

@Module({
  imports: [RepositoryModule],
  controllers: [AthletesController],
  providers: [AthletesService],
})
export class AthletesModule {}
