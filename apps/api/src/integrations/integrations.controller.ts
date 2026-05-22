import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { Public } from '../common/public.decorator.js';
import { RateLimit } from '../common/rate-limit.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { IntegrationsService } from './integrations.service.js';

@Controller()
export class IntegrationsController {
  constructor(@Inject(IntegrationsService) private readonly integrations: IntegrationsService) {}

  @Post('integrations/imports/spreadsheet/preview')
  @Roles('super_admin')
  @Permissions('integrations.manage')
  @HttpCode(201)
  previewSpreadsheetImport(@CurrentUser() actor: AuthenticatedUser, @Body() body: unknown) {
    return this.integrations.previewSpreadsheetImport(actor, body as never);
  }

  @Post('integrations/imports/:importId/commit')
  @Roles('super_admin')
  @Permissions('integrations.manage')
  @HttpCode(201)
  commitSpreadsheetImport(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('importId') importId: string,
    @Body() body: { mode?: string },
  ) {
    return this.integrations.commitSpreadsheetImport(actor, importId, body);
  }

  @Post('integrations/imports/:importId/rollback')
  @Roles('super_admin')
  @Permissions('integrations.manage')
  @HttpCode(201)
  rollbackSpreadsheetImport(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('importId') importId: string,
    @Body() body: { reason?: string },
  ) {
    return this.integrations.rollbackSpreadsheetImport(actor, importId, body);
  }

  @Post('integrations/api-keys')
  @Roles('super_admin')
  @Permissions('integrations.manage')
  @HttpCode(201)
  createPartnerApiKey(@CurrentUser() actor: AuthenticatedUser, @Body() body: unknown) {
    return this.integrations.createPartnerApiKey(actor, body as never);
  }

  @Public()
  @RateLimit('public-fixtures', 120, 60)
  @Get('public/tournaments/:tournamentId/fixtures')
  publicFixtures(@Param('tournamentId') tournamentId: string) {
    return this.integrations.getPublicFixtures(tournamentId);
  }

  @Public()
  @RateLimit('public-results', 120, 60)
  @Get('public/tournaments/:tournamentId/results')
  publicResults(@Param('tournamentId') tournamentId: string) {
    return this.integrations.getPublicResults(tournamentId);
  }

  @Post('integrations/export-bundles')
  @Roles('super_admin', 'federation_admin')
  @Permissions('integrations.read')
  @HttpCode(201)
  createExportBundle(@CurrentUser() actor: AuthenticatedUser, @Body() body: unknown) {
    return this.integrations.createExportBundle(actor, body as never);
  }

  @Post('integrations/webhooks')
  @Roles('super_admin')
  @Permissions('integrations.manage')
  @HttpCode(201)
  createWebhook(@CurrentUser() actor: AuthenticatedUser, @Body() body: unknown) {
    return this.integrations.createWebhook(actor, body as never);
  }

  @Post('integrations/webhooks/:webhookId/test-delivery')
  @Roles('super_admin')
  @Permissions('integrations.manage')
  @HttpCode(201)
  createWebhookTestDelivery(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('webhookId') webhookId: string,
    @Body() body: { event?: string },
  ) {
    return this.integrations.createWebhookTestDelivery(actor, webhookId, body);
  }
}
