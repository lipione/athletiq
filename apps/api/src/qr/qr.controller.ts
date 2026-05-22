import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Public } from '../common/public.decorator.js';
import { RateLimit } from '../common/rate-limit.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { QrService } from './qr.service.js';

type ScanBody = {
  code: string;
};

type TeamScanBody = {
  teamId: string;
};

@Controller('qr')
export class QrController {
  constructor(@Inject(QrService) private readonly qrService: QrService) {}

  @Post('athlete/:athleteId')
  @Roles('super_admin', 'school_admin', 'coach', 'referee')
  @RateLimit('qr.generate', 60, 60)
  @HttpCode(201)
  generateAthleteCode(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('athleteId') athleteId: string,
  ) {
    return this.qrService.generateAthleteCode(actor, athleteId);
  }

  @Post('match/:matchId')
  @Roles('super_admin', 'school_admin', 'coach', 'referee')
  @RateLimit('qr.generate', 60, 60)
  @HttpCode(201)
  generateMatchCode(@CurrentUser() actor: AuthenticatedUser, @Param('matchId') matchId: string) {
    return this.qrService.generateMatchCode(actor, matchId);
  }

  @Post('team')
  @Roles('super_admin', 'school_admin', 'coach', 'referee')
  @RateLimit('qr.generate', 60, 60)
  @HttpCode(201)
  generateTeamCode(@CurrentUser() actor: AuthenticatedUser, @Body() body: TeamScanBody) {
    return this.qrService.generateTeamCode(actor, body.teamId);
  }

  @Post('scan')
  @Roles('super_admin', 'school_admin', 'coach', 'referee', 'federation_admin', 'government_viewer')
  @RateLimit('qr.scan', 60, 60)
  @HttpCode(201)
  scan(@CurrentUser() actor: AuthenticatedUser, @Body() body: ScanBody) {
    return this.qrService.scan(actor, body.code);
  }

  @Get('public/athlete/:code')
  @Public()
  @RateLimit('public.profile', 120, 60)
  resolveAthlete(@Param('code') code: string) {
    return this.qrService.resolveAthletePublic(code);
  }

  @Get('public/match/:code')
  @Public()
  @RateLimit('public.profile', 120, 60)
  resolveMatch(@Param('code') code: string) {
    return this.qrService.resolveMatchPublic(code);
  }

  @Get('public/team/:code')
  @Public()
  @RateLimit('public.profile', 120, 60)
  resolveTeam(@Param('code') code: string) {
    return this.qrService.resolveTeamPublic(code);
  }
}
