import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/store.js';
import {
  BRACKET_REPOSITORY,
  type BracketRepository,
  type BracketSeedInput,
  type CreateBracketInput,
  type RegenerateBracketInput,
  type UpdateBracketSeedsInput,
} from '../repositories/repository.types.js';

@Injectable()
export class BracketsService {
  constructor(@Inject(BRACKET_REPOSITORY) private readonly brackets: BracketRepository) {}

  createBracket(actor: AuthenticatedUser, tournamentId: string, input: CreateBracketInput) {
    this.assertTournamentId(tournamentId);
    this.assertSeeds(input.seeds);
    return this.brackets.createBracket(actor, tournamentId.trim(), input);
  }

  updateSeeds(actor: AuthenticatedUser, bracketId: string, input: UpdateBracketSeedsInput) {
    this.assertBracketId(bracketId);
    this.assertSeeds(input.seeds);
    return this.brackets.updateSeeds(actor, bracketId.trim(), input);
  }

  publishBracket(actor: AuthenticatedUser, bracketId: string) {
    this.assertBracketId(bracketId);
    return this.brackets.publishBracket(actor, bracketId.trim());
  }

  regenerateBracket(actor: AuthenticatedUser, bracketId: string, input: RegenerateBracketInput) {
    this.assertBracketId(bracketId);
    if (input.seeds) {
      this.assertSeeds(input.seeds);
    }
    return this.brackets.regenerateBracket(actor, bracketId.trim(), input);
  }

  async getBracket(actor: AuthenticatedUser, bracketId: string, versionId?: string) {
    this.assertBracketId(bracketId);
    const bracket = await this.brackets.getBracket(actor, bracketId.trim(), versionId?.trim());
    if (!bracket) {
      throw new NotFoundException('Bracket not found');
    }
    return bracket;
  }

  async getPublicBracket(slug: string) {
    if (!slug?.trim()) {
      throw new BadRequestException('slug is required');
    }
    const bracket = await this.brackets.getPublicBracket(slug.trim());
    if (!bracket) {
      throw new NotFoundException('Bracket not found');
    }
    return bracket;
  }

  listStandings(actor: AuthenticatedUser, bracketId: string, groupKey?: string) {
    this.assertBracketId(bracketId);
    return this.brackets.listStandings(actor, bracketId.trim(), groupKey?.trim());
  }

  private assertTournamentId(tournamentId: string) {
    if (!tournamentId?.trim()) {
      throw new BadRequestException('tournamentId is required');
    }
  }

  private assertBracketId(bracketId: string) {
    if (!bracketId?.trim()) {
      throw new BadRequestException('bracketId is required');
    }
  }

  private assertSeeds(seeds: BracketSeedInput[]) {
    if (!Array.isArray(seeds) || seeds.length < 2) {
      throw new BadRequestException('At least two bracket seeds are required');
    }
  }
}
