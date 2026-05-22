import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import {
  SCHEDULING_REPOSITORY,
  type AssignOfficialInput,
  type AvailabilityFilter,
  type CreateAvailabilityInput,
  type CreateFacilityInput,
  type CreateOfficialProfileInput,
  type CreateVenueUnitInput,
  type GenerateScheduleInput,
  type OverrideMatchScheduleInput,
  type RespondAssignmentInput,
  type SchedulingRepository,
} from '../repositories/repository.types.js';

const venueUnitTypes = ['field', 'court', 'lane', 'room'] as const;
const venueUnitStatuses = ['active', 'maintenance', 'inactive'] as const;
const availabilityResourceTypes = ['venue_unit', 'school', 'official'] as const;
const availabilityStatuses = ['available', 'blackout'] as const;
const officialAssignmentRoles = ['referee', 'assistant_referee', 'scorer', 'timekeeper'] as const;
const assignmentResponseStatuses = ['accepted', 'declined'] as const;

@Injectable()
export class SchedulingService {
  constructor(@Inject(SCHEDULING_REPOSITORY) private readonly scheduling: SchedulingRepository) {}

  createFacility(actor: AuthenticatedUser, input: CreateFacilityInput) {
    if (!input.name?.trim()) {
      throw new BadRequestException('name is required');
    }
    if (!input.location?.trim()) {
      throw new BadRequestException('location is required');
    }
    return this.scheduling.createFacility(actor, {
      name: input.name.trim(),
      location: input.location.trim(),
      timezone: input.timezone?.trim() || 'Asia/Kathmandu',
    });
  }

  createVenueUnit(actor: AuthenticatedUser, facilityId: string, input: CreateVenueUnitInput) {
    if (!facilityId?.trim()) {
      throw new BadRequestException('facilityId is required');
    }
    if (!input.name?.trim()) {
      throw new BadRequestException('name is required');
    }
    const unitType = this.requiredEnum(input.unitType, venueUnitTypes, 'unitType');
    const sports = this.requiredStringList(input.sports, 'sports');
    return this.scheduling.createVenueUnit(actor, facilityId.trim(), {
      name: input.name.trim(),
      unitType,
      sports,
      ...(input.status
        ? { status: this.requiredEnum(input.status, venueUnitStatuses, 'status') }
        : {}),
    });
  }

  listFacilities() {
    return this.scheduling.listFacilities();
  }

  createAvailability(actor: AuthenticatedUser, input: CreateAvailabilityInput) {
    this.requireDateWindow(input.startsAt, input.endsAt);
    return this.scheduling.createAvailability(actor, {
      resourceType: this.requiredEnum(
        input.resourceType,
        availabilityResourceTypes,
        'resourceType',
      ),
      resourceId: this.required(input.resourceId, 'resourceId'),
      ...(input.tournamentId?.trim() ? { tournamentId: input.tournamentId.trim() } : {}),
      startsAt: new Date(input.startsAt).toISOString(),
      endsAt: new Date(input.endsAt).toISOString(),
      status: this.requiredEnum(input.status, availabilityStatuses, 'status'),
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    });
  }

  listAvailability(filter: AvailabilityFilter) {
    return this.scheduling.listAvailability({
      ...(filter.resourceType
        ? {
            resourceType: this.requiredEnum(
              filter.resourceType,
              availabilityResourceTypes,
              'resourceType',
            ),
          }
        : {}),
      ...(filter.resourceId?.trim() ? { resourceId: filter.resourceId.trim() } : {}),
      ...(filter.tournamentId?.trim() ? { tournamentId: filter.tournamentId.trim() } : {}),
    });
  }

  createOfficialProfile(actor: AuthenticatedUser, input: CreateOfficialProfileInput) {
    const sports = this.requiredStringList(input.sports, 'sports');
    return this.scheduling.createOfficialProfile(actor, {
      userId: this.required(input.userId, 'userId'),
      displayName: this.required(input.displayName, 'displayName'),
      sports,
      ...(input.certificationLevel?.trim()
        ? { certificationLevel: input.certificationLevel.trim() }
        : {}),
      ...(input.homeSchoolId?.trim() ? { homeSchoolId: input.homeSchoolId.trim() } : {}),
      ...(input.payoutRate !== undefined ? { payoutRate: input.payoutRate } : {}),
      ...(input.payoutCurrency?.trim() ? { payoutCurrency: input.payoutCurrency.trim() } : {}),
    });
  }

  listOfficialProfiles() {
    return this.scheduling.listOfficialProfiles();
  }

  generateSchedule(actor: AuthenticatedUser, tournamentId: string, input: GenerateScheduleInput) {
    if (!Array.isArray(input.venueUnitIds) || !input.venueUnitIds.length) {
      throw new BadRequestException('venueUnitIds is required');
    }
    if (!Number.isInteger(input.slotMinutes) || input.slotMinutes < 1) {
      throw new BadRequestException('slotMinutes must be positive');
    }
    if (!Number.isInteger(input.matchDurationMinutes) || input.matchDurationMinutes < 1) {
      throw new BadRequestException('matchDurationMinutes must be positive');
    }
    if (!Number.isInteger(input.minRestMinutes ?? 0) || (input.minRestMinutes ?? 0) < 0) {
      throw new BadRequestException('minRestMinutes must be zero or positive');
    }
    return this.scheduling.generateSchedule(actor, this.required(tournamentId, 'tournamentId'), {
      venueUnitIds: input.venueUnitIds.map((venueUnitId) =>
        this.required(venueUnitId, 'venueUnitId'),
      ),
      startsAt: this.requiredDate(input.startsAt, 'startsAt'),
      slotMinutes: input.slotMinutes,
      matchDurationMinutes: input.matchDurationMinutes,
      minRestMinutes: input.minRestMinutes ?? 0,
    });
  }

  overrideMatchSchedule(
    actor: AuthenticatedUser,
    matchId: string,
    input: OverrideMatchScheduleInput,
  ) {
    this.requireDateWindow(input.startsAt, input.endsAt);
    return this.scheduling.overrideMatchSchedule(actor, this.required(matchId, 'matchId'), {
      venueUnitId: this.required(input.venueUnitId, 'venueUnitId'),
      startsAt: new Date(input.startsAt).toISOString(),
      endsAt: new Date(input.endsAt).toISOString(),
      allowConflicts: input.allowConflicts ?? false,
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    });
  }

  listTournamentSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.scheduling.listTournamentSchedule(
      actor,
      this.required(tournamentId, 'tournamentId'),
    );
  }

  publishSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.scheduling.publishSchedule(actor, this.required(tournamentId, 'tournamentId'));
  }

  unpublishSchedule(actor: AuthenticatedUser, tournamentId: string) {
    return this.scheduling.unpublishSchedule(actor, this.required(tournamentId, 'tournamentId'));
  }

  assignOfficial(actor: AuthenticatedUser, matchId: string, input: AssignOfficialInput) {
    return this.scheduling.assignOfficial(actor, this.required(matchId, 'matchId'), {
      officialProfileId: this.required(input.officialProfileId, 'officialProfileId'),
      role: this.requiredEnum(input.role, officialAssignmentRoles, 'role'),
    });
  }

  respondToAssignment(
    actor: AuthenticatedUser,
    assignmentId: string,
    input: RespondAssignmentInput,
  ) {
    return this.scheduling.respondToAssignment(actor, this.required(assignmentId, 'assignmentId'), {
      status: this.requiredEnum(input.status, assignmentResponseStatuses, 'status'),
    });
  }

  checkInAssignment(actor: AuthenticatedUser, assignmentId: string) {
    return this.scheduling.checkInAssignment(actor, this.required(assignmentId, 'assignmentId'));
  }

  listNotifications(actor: AuthenticatedUser) {
    return this.scheduling.listNotifications(actor);
  }

  exportOfficialPayouts(actor: AuthenticatedUser, tournamentId: string) {
    return this.scheduling.exportOfficialPayouts(
      actor,
      this.required(tournamentId, 'tournamentId'),
    );
  }

  private required(value: string, fieldName: string) {
    if (!value?.trim()) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return value.trim();
  }

  private requireDateWindow(startsAt: string, endsAt: string) {
    if (Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt))) {
      throw new BadRequestException('startsAt and endsAt must be valid dates');
    }
    if (Date.parse(startsAt) >= Date.parse(endsAt)) {
      throw new BadRequestException('startsAt must be before endsAt');
    }
  }

  private requiredDate(value: string, fieldName: string) {
    if (Number.isNaN(Date.parse(value))) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
    return new Date(value).toISOString();
  }

  private requiredStringList(values: string[], fieldName: string) {
    const normalized = Array.isArray(values)
      ? values.map((value) => value.trim()).filter(Boolean)
      : [];
    if (!normalized.length) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return normalized;
  }

  private requiredEnum<const T extends readonly string[]>(
    value: string,
    allowedValues: T,
    fieldName: string,
  ): T[number] {
    if (!allowedValues.includes(value as T[number])) {
      throw new BadRequestException(`${fieldName} is invalid`);
    }
    return value as T[number];
  }
}
