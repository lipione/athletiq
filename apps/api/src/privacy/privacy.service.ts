import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/store.js';
import { ATHLETE_REPOSITORY, type AthleteRepository } from '../repositories/repository.types.js';

@Injectable()
export class PrivacyService {
  constructor(@Inject(ATHLETE_REPOSITORY) private readonly athletes: AthleteRepository) {}

  async recordGuardianConsent(
    actor: AuthenticatedUser,
    athleteId: string,
    input: { guardianName?: string; relationship?: string; consentType?: string },
  ) {
    if (!input.guardianName?.trim() || !input.relationship?.trim()) {
      throw new BadRequestException('guardianName and relationship are required');
    }

    return this.athletes.recordGuardianConsent(actor, athleteId, {
      guardianName: input.guardianName.trim(),
      relationship: input.relationship.trim(),
      consentType: input.consentType?.trim() || 'public_profile',
    });
  }

  publishAthleteProfile(actor: AuthenticatedUser, athleteId: string, status: 'private' | 'public') {
    if (status !== 'private' && status !== 'public') {
      throw new BadRequestException('status must be private or public');
    }
    return this.athletes.setPublicProfileStatus(actor, athleteId, status);
  }

  async getPublicAthleteProfileById(athleteId: string) {
    const profile = await this.athletes.getPublicProfile(athleteId);
    if (!profile) {
      throw new NotFoundException('Athlete not found');
    }
    return profile;
  }
}
