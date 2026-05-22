import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { Public } from '../common/public.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import type {
  CreateBracketInput,
  RegenerateBracketInput,
  UpdateBracketSeedsInput,
} from '../repositories/repository.types.js';
import { BracketsService } from './brackets.service.js';

@Controller()
export class BracketsController {
  constructor(@Inject(BracketsService) private readonly brackets: BracketsService) {}

  @Post('tournaments/:tournamentId/brackets')
  @Permissions('bracket.manage')
  @HttpCode(201)
  createBracket(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
    @Body() body: CreateBracketInput,
  ) {
    return this.brackets.createBracket(actor, tournamentId, body);
  }

  @Post('brackets/:bracketId/seeds')
  @Permissions('bracket.manage')
  @HttpCode(201)
  updateSeeds(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('bracketId') bracketId: string,
    @Body() body: UpdateBracketSeedsInput,
  ) {
    return this.brackets.updateSeeds(actor, bracketId, body);
  }

  @Post('brackets/:bracketId/publish')
  @Permissions('bracket.manage')
  @HttpCode(201)
  publishBracket(@CurrentUser() actor: AuthenticatedUser, @Param('bracketId') bracketId: string) {
    return this.brackets.publishBracket(actor, bracketId);
  }

  @Post('brackets/:bracketId/regenerate')
  @Permissions('bracket.manage')
  @HttpCode(201)
  regenerateBracket(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('bracketId') bracketId: string,
    @Body() body: RegenerateBracketInput,
  ) {
    return this.brackets.regenerateBracket(actor, bracketId, body);
  }

  @Get('brackets/:bracketId')
  @Permissions('bracket.read')
  getBracket(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('bracketId') bracketId: string,
    @Query('versionId') versionId?: string,
  ) {
    return this.brackets.getBracket(actor, bracketId, versionId);
  }

  @Get('brackets/:bracketId/standings')
  @Permissions('bracket.read')
  listStandings(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('bracketId') bracketId: string,
    @Query('groupKey') groupKey?: string,
  ) {
    return this.brackets.listStandings(actor, bracketId, groupKey);
  }

  @Public()
  @Get('public/brackets/:slug')
  getPublicBracket(@Param('slug') slug: string) {
    return this.brackets.getPublicBracket(slug);
  }
}
