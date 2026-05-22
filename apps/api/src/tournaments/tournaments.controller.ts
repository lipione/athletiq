import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser, type TournamentFormat } from '../common/store.js';
import { TournamentsService } from './tournaments.service.js';

type CreateTournamentBody = {
  name: string;
  sport: string;
  format: TournamentFormat;
  maxTeams?: number;
  season?: string;
};

type RegisterSchoolBody = {
  schoolId: string;
};

@Controller('tournaments')
export class TournamentsController {
  constructor(
    @Inject(TournamentsService) private readonly tournamentsService: TournamentsService,
  ) {}

  @Get()
  list(@Query('sport') sport?: string) {
    return this.tournamentsService.list(sport);
  }

  @Post()
  @Roles('super_admin')
  @HttpCode(201)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateTournamentBody) {
    return this.tournamentsService.create(actor, body);
  }

  @Post(':tournamentId/approve')
  @Roles('super_admin')
  @HttpCode(201)
  approve(@CurrentUser() actor: AuthenticatedUser, @Param('tournamentId') tournamentId: string) {
    return this.tournamentsService.approve(actor, tournamentId);
  }

  @Post(':tournamentId/register-school')
  @Roles('super_admin', 'school_admin')
  @HttpCode(201)
  registerSchool(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
    @Body() body: RegisterSchoolBody,
  ) {
    return this.tournamentsService.registerSchool(actor, tournamentId, body.schoolId);
  }

  @Get(':tournamentId')
  getById(@Param('tournamentId') tournamentId: string) {
    return this.tournamentsService.getById(tournamentId);
  }

  @Get(':tournamentId/leaderboard')
  @Roles('super_admin', 'school_admin', 'coach', 'referee', 'federation_admin', 'government_viewer')
  getLeaderboard(@Param('tournamentId') tournamentId: string) {
    return this.tournamentsService.getLeaderboard(tournamentId);
  }
}
