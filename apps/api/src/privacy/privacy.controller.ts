import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { Public } from '../common/public.decorator.js';
import { RateLimit } from '../common/rate-limit.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { AuthenticatedUser } from '../common/store.js';
import { PrivacyService } from './privacy.service.js';

@Controller('privacy')
export class PrivacyController {
  constructor(@Inject(PrivacyService) private readonly privacy: PrivacyService) {}

  @Post('athletes/:athleteId/guardian-consents')
  @Roles('super_admin', 'school_admin')
  @Permissions('privacy.manage')
  @RateLimit('privacy.write', 30, 60)
  @HttpCode(201)
  recordGuardianConsent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('athleteId') athleteId: string,
    @Body() body: { guardianName?: string; relationship?: string; consentType?: string },
  ) {
    return this.privacy.recordGuardianConsent(actor, athleteId, body);
  }

  @Post('athletes/:athleteId/public-profile')
  @Roles('super_admin', 'school_admin')
  @Permissions('privacy.manage')
  @RateLimit('privacy.write', 30, 60)
  @HttpCode(201)
  publishPublicProfile(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('athleteId') athleteId: string,
    @Body() body: { status?: 'private' | 'public' },
  ) {
    return this.privacy.publishAthleteProfile(actor, athleteId, body.status ?? 'private');
  }

  @Get('public/athletes/:athleteId')
  @Public()
  @RateLimit('public.profile', 120, 60)
  publicAthleteProfile(@Param('athleteId') athleteId: string) {
    return this.privacy.getPublicAthleteProfileById(athleteId);
  }
}
