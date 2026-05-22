import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { AthletesService } from './athletes.service.js';
import { Roles } from '../common/roles.decorator.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';

@Controller('athletes')
export class AthletesController {
  constructor(
    @Inject(AthletesService)
    private readonly athletesService: AthletesService,
  ) {}

  @Post('drafts')
  @Roles('school_admin')
  @HttpCode(201)
  createDraft(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { schoolId: string; fullName: string; dateOfBirth?: string; gender?: string },
  ) {
    return this.athletesService.createDraft(actor, body);
  }

  @Post(':athleteId/identity/approve')
  @Roles('super_admin')
  @HttpCode(201)
  approveIdentity(@CurrentUser() actor: AuthenticatedUser, @Param('athleteId') athleteId: string) {
    return this.athletesService.approveIdentity(actor, athleteId);
  }

  @Get(':athleteId')
  @Roles('super_admin', 'school_admin', 'coach', 'referee')
  getAthlete(@Param('athleteId') athleteId: string) {
    return this.athletesService.getAthlete(athleteId);
  }
}
