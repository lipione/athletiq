import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import {
  TEAM_REPOSITORY,
  WAIVER_REPOSITORY,
  type TeamRepository,
  type WaiverRepository,
} from '../repositories/repository.types.js';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(TEAM_REPOSITORY) private readonly teams: TeamRepository,
    @Inject(WAIVER_REPOSITORY) private readonly waivers: WaiverRepository,
  ) {}

  list(tournamentId?: string, schoolId?: string) {
    return this.teams.list(tournamentId || undefined, schoolId || undefined);
  }

  async create(
    actor: AuthenticatedUser,
    payload: {
      tournamentId: string;
      schoolId: string;
      name: string;
      athleteIds: string[];
      coachUserId?: string;
    },
  ) {
    if (!payload.tournamentId?.trim()) {
      throw new BadRequestException('tournamentId is required');
    }
    if (!payload.schoolId?.trim()) {
      throw new BadRequestException('schoolId is required');
    }
    if (!payload.name?.trim()) {
      throw new BadRequestException('name is required');
    }
    if (!payload.athleteIds || payload.athleteIds.length === 0) {
      throw new BadRequestException('athleteIds is required');
    }

    await this.waivers.ensureTournamentWaiversSatisfied({
      tournamentId: payload.tournamentId.trim(),
      schoolId: payload.schoolId.trim(),
      athleteIds: payload.athleteIds,
    });

    return this.teams.create({
      actor,
      tournamentId: payload.tournamentId.trim(),
      schoolId: payload.schoolId.trim(),
      name: payload.name.trim(),
      athleteIds: payload.athleteIds,
      ...(payload.coachUserId ? { coachUserId: payload.coachUserId } : {}),
    });
  }

  approve(actor: AuthenticatedUser, teamId: string) {
    return this.teams.approve(actor, teamId);
  }

  async getById(teamId: string) {
    const team = await this.teams.findById(teamId);
    if (!team) {
      throw new BadRequestException('Team not found');
    }
    return team;
  }
}
