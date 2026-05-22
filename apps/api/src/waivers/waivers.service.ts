import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import {
  type CreateTournamentWaiverRequirementInput,
  type CreateWaiverTemplateInput,
  type SignWaiverInput,
  WAIVER_REPOSITORY,
  type WaiverRepository,
} from '../repositories/repository.types.js';

@Injectable()
export class WaiversService {
  constructor(@Inject(WAIVER_REPOSITORY) private readonly waivers: WaiverRepository) {}

  createTemplate(actor: AuthenticatedUser, input: CreateWaiverTemplateInput) {
    this.assertNonBlank(input.name, 'name');
    this.assertNonBlank(input.body, 'body');
    this.assertNonBlank(input.version, 'version');
    if (
      input.expiresAfterDays !== undefined &&
      (!Number.isInteger(input.expiresAfterDays) || input.expiresAfterDays <= 0)
    ) {
      throw new BadRequestException('expiresAfterDays must be a positive integer');
    }

    return this.waivers.createWaiverTemplate(actor, {
      name: input.name.trim(),
      body: input.body.trim(),
      version: input.version.trim(),
      ...(input.expiresAfterDays ? { expiresAfterDays: input.expiresAfterDays } : {}),
    });
  }

  createTournamentRequirement(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: CreateTournamentWaiverRequirementInput,
  ) {
    this.assertNonBlank(tournamentId, 'tournamentId');
    this.assertNonBlank(input.waiverTemplateId, 'waiverTemplateId');

    return this.waivers.createTournamentWaiverRequirement(actor, tournamentId.trim(), {
      waiverTemplateId: input.waiverTemplateId.trim(),
    });
  }

  signWaiver(actor: AuthenticatedUser, input: SignWaiverInput) {
    this.assertNonBlank(input.waiverTemplateId, 'waiverTemplateId');
    this.assertNonBlank(input.athleteId, 'athleteId');
    this.assertNonBlank(input.schoolId, 'schoolId');
    this.assertNonBlank(input.guardianName, 'guardianName');
    this.assertNonBlank(input.relationship, 'relationship');
    this.assertNonBlank(input.ipAddress, 'ipAddress');
    this.assertNonBlank(input.userAgent, 'userAgent');

    return this.waivers.signWaiver(actor, {
      waiverTemplateId: input.waiverTemplateId.trim(),
      ...(input.tournamentId?.trim() ? { tournamentId: input.tournamentId.trim() } : {}),
      athleteId: input.athleteId.trim(),
      schoolId: input.schoolId.trim(),
      guardianName: input.guardianName.trim(),
      relationship: input.relationship.trim(),
      ipAddress: input.ipAddress.trim(),
      userAgent: input.userAgent.trim(),
    });
  }

  listAthleteSignatures(athleteId: string) {
    this.assertNonBlank(athleteId, 'athleteId');
    return this.waivers.listWaiverSignatures(athleteId.trim());
  }

  ensureTournamentWaiversSatisfied(input: {
    tournamentId: string;
    schoolId: string;
    athleteIds: string[];
  }) {
    return this.waivers.ensureTournamentWaiversSatisfied(input);
  }

  private assertNonBlank(value: string | undefined, field: string) {
    if (!value?.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
  }
}
