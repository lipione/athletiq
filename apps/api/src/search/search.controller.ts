import { Controller, Get, Inject, Query } from '@nestjs/common';
import { Permissions } from '../common/permissions.decorator.js';
import { RateLimit } from '../common/rate-limit.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Get()
  @Roles('super_admin', 'school_admin', 'coach', 'referee')
  @Permissions('search.read')
  @RateLimit('search', 60, 60)
  list(@Query('q') query: string) {
    return this.searchService.search(query);
  }
}
