import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { TeamsService } from './teams.service.js';

type TeamBody = {
  tournamentId: string;
  schoolId: string;
  name: string;
  athleteIds: string[];
  coachUserId?: string;
};

@Controller('teams')
export class TeamsController {
  constructor(@Inject(TeamsService) private readonly teamsService: TeamsService) {}

  @Get()
  list(@Query('tournamentId') tournamentId?: string, @Query('schoolId') schoolId?: string) {
    return this.teamsService.list(tournamentId?.trim(), schoolId?.trim());
  }

  @Post()
  @Roles('super_admin', 'school_admin')
  @HttpCode(201)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: TeamBody) {
    return this.teamsService.create(actor, body);
  }

  @Post(':teamId/approve')
  @Roles('super_admin')
  @HttpCode(201)
  approve(@CurrentUser() actor: AuthenticatedUser, @Param('teamId') teamId: string) {
    return this.teamsService.approve(actor, teamId);
  }

  @Get(':teamId')
  get(@Param('teamId') teamId: string) {
    return this.teamsService.getById(teamId);
  }
}
