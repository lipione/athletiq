import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { SchoolsService } from './schools.service.js';
import { Roles } from '../common/roles.decorator.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';

@Controller('schools')
export class SchoolsController {
  constructor(
    @Inject(SchoolsService)
    private readonly schoolsService: SchoolsService,
  ) {}

  @Get()
  listSchools() {
    return this.schoolsService.listSchools();
  }

  @Post()
  @Roles('super_admin', 'school_admin')
  @HttpCode(201)
  createSchool(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { name: string; location?: string },
  ) {
    return this.schoolsService.createSchool(actor, body);
  }

  @Post(':schoolId/approve')
  @Roles('super_admin')
  @HttpCode(201)
  approveSchool(@CurrentUser() actor: AuthenticatedUser, @Param('schoolId') schoolId: string) {
    return this.schoolsService.approveSchool(actor, schoolId);
  }

  @Post(':schoolId/invite')
  @Roles('super_admin', 'school_admin')
  @HttpCode(201)
  inviteCoach(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Body()
    body: {
      email: string;
      role?:
        | 'super_admin'
        | 'school_admin'
        | 'coach'
        | 'referee'
        | 'federation_admin'
        | 'government_viewer';
    },
  ) {
    return this.schoolsService.inviteCoach(actor, schoolId, body);
  }
}
