import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { WaiversService } from './waivers.service.js';

type WaiverTemplateBody = {
  name: string;
  body: string;
  version: string;
  expiresAfterDays?: number;
};

type TournamentRequirementBody = {
  waiverTemplateId: string;
};

type WaiverSignatureBody = {
  waiverTemplateId: string;
  tournamentId?: string;
  athleteId: string;
  schoolId: string;
  guardianName: string;
  relationship: string;
};

@Controller('waivers')
export class WaiversController {
  constructor(@Inject(WaiversService) private readonly waiversService: WaiversService) {}

  @Post('templates')
  @Roles('super_admin')
  @Permissions('waiver.manage')
  @HttpCode(201)
  createTemplate(@CurrentUser() actor: AuthenticatedUser, @Body() body: WaiverTemplateBody) {
    return this.waiversService.createTemplate(actor, body);
  }

  @Post('tournaments/:tournamentId/requirements')
  @Roles('super_admin')
  @Permissions('waiver.manage')
  @HttpCode(201)
  createTournamentRequirement(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
    @Body() body: TournamentRequirementBody,
  ) {
    return this.waiversService.createTournamentRequirement(actor, tournamentId, body);
  }

  @Post('signatures')
  @Roles('super_admin', 'school_admin')
  @Permissions('waiver.sign')
  @HttpCode(201)
  signWaiver(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: WaiverSignatureBody,
    @Req() request: FastifyRequest,
  ) {
    return this.waiversService.signWaiver(actor, {
      ...body,
      ipAddress: request.ip || 'unknown',
      userAgent: this.headerValue(request.headers['user-agent']) || 'unknown',
    });
  }

  @Get('athletes/:athleteId/signatures')
  @Roles('super_admin', 'school_admin')
  @Permissions('waiver.read')
  listAthleteSignatures(@Param('athleteId') athleteId: string) {
    return this.waiversService.listAthleteSignatures(athleteId);
  }

  private headerValue(rawValue: string | string[] | undefined) {
    return Array.isArray(rawValue) ? (rawValue[0] ?? '') : (rawValue ?? '');
  }
}
