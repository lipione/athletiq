import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser, type AvailabilityResourceType } from '../common/store.js';
import type {
  AssignOfficialInput,
  CreateAvailabilityInput,
  CreateFacilityInput,
  CreateOfficialProfileInput,
  CreateVenueUnitInput,
  GenerateScheduleInput,
  OverrideMatchScheduleInput,
  RespondAssignmentInput,
} from '../repositories/repository.types.js';
import { SchedulingService } from './scheduling.service.js';

@Controller()
export class SchedulingController {
  constructor(@Inject(SchedulingService) private readonly scheduling: SchedulingService) {}

  @Post('facilities')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  createFacility(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateFacilityInput) {
    return this.scheduling.createFacility(actor, body);
  }

  @Post('facilities/:facilityId/units')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  createVenueUnit(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('facilityId') facilityId: string,
    @Body() body: CreateVenueUnitInput,
  ) {
    return this.scheduling.createVenueUnit(actor, facilityId, body);
  }

  @Get('facilities')
  @Roles('super_admin', 'school_admin', 'coach', 'referee', 'federation_admin', 'government_viewer')
  @Permissions('scheduling.read')
  listFacilities() {
    return this.scheduling.listFacilities();
  }

  @Post('scheduling/availability')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  createAvailability(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateAvailabilityInput,
  ) {
    return this.scheduling.createAvailability(actor, body);
  }

  @Get('scheduling/availability')
  @Roles('super_admin')
  @Permissions('scheduling.read')
  listAvailability(
    @Query('resourceType') resourceType?: AvailabilityResourceType,
    @Query('resourceId') resourceId?: string,
    @Query('tournamentId') tournamentId?: string,
  ) {
    return this.scheduling.listAvailability({
      ...(resourceType ? { resourceType } : {}),
      ...(resourceId ? { resourceId } : {}),
      ...(tournamentId ? { tournamentId } : {}),
    });
  }

  @Post('officials/profiles')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  createOfficialProfile(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateOfficialProfileInput,
  ) {
    return this.scheduling.createOfficialProfile(actor, body);
  }

  @Get('officials/profiles')
  @Roles('super_admin')
  @Permissions('scheduling.read')
  listOfficialProfiles() {
    return this.scheduling.listOfficialProfiles();
  }

  @Post('tournaments/:tournamentId/schedule/generate')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  generateSchedule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
    @Body() body: GenerateScheduleInput,
  ) {
    return this.scheduling.generateSchedule(actor, tournamentId, body);
  }

  @Get('tournaments/:tournamentId/schedule')
  @Roles('super_admin', 'school_admin', 'coach', 'referee', 'federation_admin', 'government_viewer')
  @Permissions('scheduling.read')
  listTournamentSchedule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
  ) {
    return this.scheduling.listTournamentSchedule(actor, tournamentId);
  }

  @Post('matches/:matchId/schedule/override')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  overrideMatchSchedule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('matchId') matchId: string,
    @Body() body: OverrideMatchScheduleInput,
  ) {
    return this.scheduling.overrideMatchSchedule(actor, matchId, body);
  }

  @Post('tournaments/:tournamentId/schedule/publish')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  publishSchedule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
  ) {
    return this.scheduling.publishSchedule(actor, tournamentId);
  }

  @Post('tournaments/:tournamentId/schedule/unpublish')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  unpublishSchedule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
  ) {
    return this.scheduling.unpublishSchedule(actor, tournamentId);
  }

  @Post('matches/:matchId/officials')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  assignOfficial(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('matchId') matchId: string,
    @Body() body: AssignOfficialInput,
  ) {
    return this.scheduling.assignOfficial(actor, matchId, body);
  }

  @Post('official-assignments/:assignmentId/respond')
  @Roles('super_admin', 'referee')
  @Permissions('scheduling.read')
  @HttpCode(201)
  respondToAssignment(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() body: RespondAssignmentInput,
  ) {
    return this.scheduling.respondToAssignment(actor, assignmentId, body);
  }

  @Post('official-assignments/:assignmentId/check-in')
  @Roles('super_admin', 'referee')
  @Permissions('scheduling.read')
  @HttpCode(201)
  checkInAssignment(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.scheduling.checkInAssignment(actor, assignmentId);
  }

  @Get('scheduling/notifications')
  @Roles('super_admin', 'referee')
  @Permissions('scheduling.read')
  listNotifications(@CurrentUser() actor: AuthenticatedUser) {
    return this.scheduling.listNotifications(actor);
  }

  @Post('tournaments/:tournamentId/official-payouts/export')
  @Roles('super_admin')
  @Permissions('scheduling.manage')
  @HttpCode(201)
  exportOfficialPayouts(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
  ) {
    return this.scheduling.exportOfficialPayouts(actor, tournamentId);
  }
}
