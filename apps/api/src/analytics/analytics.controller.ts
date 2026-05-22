import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../common/roles.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { AnalyticsService } from './analytics.service.js';

type OverrideBody = {
  scope: string;
  targetId: string;
  field: string;
  reason?: string;
};

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get('federation/overview')
  @Roles('federation_admin', 'government_viewer', 'super_admin')
  @Permissions('analytics.read')
  overview() {
    return this.analyticsService.getFederationOverview();
  }

  @Get('federation/participation')
  @Roles('federation_admin', 'government_viewer', 'super_admin')
  @Permissions('analytics.read')
  participation(@Query('tournamentId') tournamentId?: string) {
    return this.analyticsService.getParticipationReport(tournamentId);
  }

  @Get('tournaments/:tournamentId/export')
  @Roles('federation_admin', 'super_admin')
  @Permissions('analytics.export')
  @HttpCode(200)
  exportTournament(@Param('tournamentId') tournamentId: string) {
    return this.analyticsService.exportTournament(tournamentId);
  }

  @Post('federation/overrides')
  @Roles('federation_admin', 'super_admin')
  @Permissions('analytics.override')
  @HttpCode(201)
  override(@CurrentUser() actor: AuthenticatedUser, @Body() body: OverrideBody) {
    return this.analyticsService.recordOverride(actor, body);
  }
}
