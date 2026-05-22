import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repositories/repository.module.js';
import { DocumentExtractionProvider } from './document-extraction.provider.js';
import { DocumentStorageService } from './document-storage.service.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  imports: [RepositoryModule],
  controllers: [DocumentsController],
  providers: [DocumentExtractionProvider, DocumentStorageService, DocumentsService],
})
export class DocumentsModule {}
