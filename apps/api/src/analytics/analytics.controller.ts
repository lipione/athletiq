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

type ReportDraftBody = {
  reportType?: string;
  scope?: string;
  locale?: string;
};

type ReportApprovalBody = {
  note?: string;
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

  @Get('athletes/:athleteId/development')
  @Roles('federation_admin', 'government_viewer', 'super_admin')
  @Permissions('analytics.read')
  athleteDevelopment(@Param('athleteId') athleteId: string) {
    return this.analyticsService.getAthleteDevelopment(athleteId);
  }

  @Get('rankings')
  @Roles('federation_admin', 'government_viewer', 'super_admin')
  @Permissions('analytics.read')
  rankings(
    @Query('scope') scope?: string,
    @Query('sport') sport?: string,
    @Query('metric') metric?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getRankings({
      ...(scope ? { scope } : {}),
      ...(sport ? { sport } : {}),
      ...(metric ? { metric } : {}),
      ...(limit ? { limit } : {}),
    });
  }

  @Get('data-quality')
  @Roles('federation_admin', 'government_viewer', 'super_admin')
  @Permissions('analytics.read')
  dataQuality() {
    return this.analyticsService.getDataQualityDashboard();
  }

  @Get('data-products/exports')
  @Roles('federation_admin', 'government_viewer', 'super_admin')
  @Permissions('analytics.export')
  dataProductExports() {
    return this.analyticsService.getDataProductExports();
  }

  @Post('reports/drafts')
  @Roles('federation_admin', 'super_admin')
  @Permissions('analytics.override')
  @HttpCode(201)
  createReportDraft(@CurrentUser() actor: AuthenticatedUser, @Body() body: ReportDraftBody) {
    return this.analyticsService.createReportDraft(actor, body);
  }

  @Post('reports/drafts/:draftId/approve')
  @Roles('federation_admin', 'super_admin')
  @Permissions('analytics.override')
  @HttpCode(201)
  approveReportDraft(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('draftId') draftId: string,
    @Body() body: ReportApprovalBody,
  ) {
    return this.analyticsService.approveReportDraft(actor, draftId, body);
  }

  @Post('federation/overrides')
  @Roles('federation_admin', 'super_admin')
  @Permissions('analytics.override')
  @HttpCode(201)
  override(@CurrentUser() actor: AuthenticatedUser, @Body() body: OverrideBody) {
    return this.analyticsService.recordOverride(actor, body);
  }
}
