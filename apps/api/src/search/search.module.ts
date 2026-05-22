import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repositories/repository.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

@Module({
  imports: [RepositoryModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
