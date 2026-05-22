import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repositories/repository.module.js';
import { WaiversController } from './waivers.controller.js';
import { WaiversService } from './waivers.service.js';

@Module({
  imports: [RepositoryModule],
  controllers: [WaiversController],
  providers: [WaiversService],
  exports: [WaiversService],
})
export class WaiversModule {}
