import { Module } from '@nestjs/common';
import { QrController } from './qr.controller.js';
import { QrService } from './qr.service.js';
import { RepositoryModule } from '../repositories/repository.module.js';
import { PrivacyModule } from '../privacy/privacy.module.js';

@Module({
  imports: [RepositoryModule, PrivacyModule],
  controllers: [QrController],
  providers: [QrService],
})
export class QrModule {}
