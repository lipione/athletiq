import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { SEARCH_REPOSITORY, type SearchRepository } from '../repositories/repository.types.js';

@Injectable()
export class SearchService {
  constructor(@Inject(SEARCH_REPOSITORY) private readonly searchRepository: SearchRepository) {}

  search(query?: string) {
    if (!query?.trim()) {
      throw new BadRequestException('q is required');
    }

    return this.searchRepository.search(query.trim());
  }
}
