import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import { ATHLETE_REPOSITORY, type AthleteRepository } from '../repositories/repository.types.js';

@Injectable()
export class AthletesService {
  constructor(@Inject(ATHLETE_REPOSITORY) private readonly athletes: AthleteRepository) {}

  createDraft(
    actor: AuthenticatedUser,
    payload: { schoolId: string; fullName: string; dateOfBirth?: string; gender?: string },
  ) {
    if (!payload.schoolId || !payload.fullName?.trim()) {
      throw new BadRequestException('schoolId and fullName are required');
    }

    return this.athletes.createDraft(actor, {
      schoolId: payload.schoolId,
      fullName: payload.fullName.trim(),
      ...(payload.dateOfBirth ? { dateOfBirth: payload.dateOfBirth } : {}),
      ...(payload.gender ? { gender: payload.gender } : {}),
    });
  }

  approveIdentity(actor: AuthenticatedUser, athleteId: string) {
    return this.athletes.approveIdentity(actor, athleteId);
  }

  async getAthlete(athleteId: string) {
    const athlete = await this.athletes.findWithVerifiedStats(athleteId);
    if (!athlete) {
      throw new NotFoundException('Athlete not found');
    }
    return athlete;
  }
}
