import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { type MatchEventType, type MatchReport } from '../common/store.js';
import { MatchesService } from './matches.service.js';

type CreateMatchBody = {
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
};

type SubmitMatchBody = {
  homeScore: number;
  awayScore: number;
  sportStats?: Record<string, string | number | boolean | null>;
  notes?: string;
};

type MatchEventBody = {
  athleteId: string;
  teamId: string;
  type: MatchEventType;
  minute?: number;
  details?: string;
  quantity?: number;
};

type CorrectMatchEventBody = MatchEventBody & {
  reason?: string;
};

@Controller('matches')
export class MatchesController {
  constructor(@Inject(MatchesService) private readonly matchesService: MatchesService) {}

  @Get()
  list(@Query('tournamentId') tournamentId?: string) {
    return this.matchesService.list(tournamentId);
  }

  @Get(':matchId/events')
  listEvents(@Param('matchId') matchId: string) {
    return this.matchesService.listEvents(matchId);
  }

  @Post(':matchId/events')
  @Roles('super_admin', 'coach', 'referee')
  @HttpCode(201)
  submitEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('matchId') matchId: string,
    @Body() body: MatchEventBody,
  ) {
    return this.matchesService.submitEvent(actor, matchId, body);
  }

  @Post(':matchId/events/:eventId/correct')
  @Roles('super_admin', 'referee')
  @HttpCode(201)
  correctEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('matchId') matchId: string,
    @Param('eventId') eventId: string,
    @Body() body: CorrectMatchEventBody,
  ) {
    return this.matchesService.correctEvent(actor, matchId, eventId, body);
  }

  @Get(':matchId/stats')
  getStats(@Param('matchId') matchId: string) {
    return this.matchesService.getMatchStats(matchId);
  }

  @Post()
  @Roles('super_admin')
  @HttpCode(201)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateMatchBody) {
    return this.matchesService.create(actor, body);
  }

  @Post(':matchId/submit-result')
  @Roles('super_admin', 'coach', 'referee')
  @HttpCode(201)
  submitResult(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('matchId') matchId: string,
    @Body() body: SubmitMatchBody,
  ) {
    const report: MatchReport = {
      homeScore: body.homeScore,
      awayScore: body.awayScore,
      ...(body.sportStats ? { sportStats: body.sportStats } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
    };
    return this.matchesService.submitResult(actor, matchId, report);
  }

  @Post(':matchId/verify')
  @Roles('super_admin')
  @HttpCode(201)
  verify(@CurrentUser() actor: AuthenticatedUser, @Param('matchId') matchId: string) {
    return this.matchesService.verify(actor, matchId);
  }

  @Get(':matchId')
  get(@Param('matchId') matchId: string) {
    return this.matchesService.getById(matchId);
  }
}
