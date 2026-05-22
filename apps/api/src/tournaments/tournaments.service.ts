import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { type TournamentFormat, type AuthenticatedUser } from '../common/store.js';
import {
  TOURNAMENT_REPOSITORY,
  type TournamentRepository,
} from '../repositories/repository.types.js';

@Injectable()
export class TournamentsService {
  constructor(@Inject(TOURNAMENT_REPOSITORY) private readonly tournaments: TournamentRepository) {}

  async list(sport?: string) {
    const tournaments = await this.tournaments.list();
    if (!sport) {
      return tournaments;
    }

    const normalized = sport.trim().toLowerCase();
    return tournaments.filter((tournament) => tournament.sport.toLowerCase() === normalized);
  }

  create(
    actor: AuthenticatedUser,
    payload: {
      name: string;
      sport: string;
      format: TournamentFormat;
      maxTeams?: number;
      season?: string;
    },
  ) {
    if (!payload.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    if (!payload.sport?.trim()) {
      throw new BadRequestException('sport is required');
    }

    if (!payload.format) {
      throw new BadRequestException('format is required');
    }

    if (payload.maxTeams !== undefined && payload.maxTeams < 2) {
      throw new BadRequestException('maxTeams must be greater than 1');
    }

    return this.tournaments.create({
      actor,
      name: payload.name.trim(),
      sport: payload.sport.trim(),
      format: payload.format,
      ...(payload.maxTeams ? { maxTeams: payload.maxTeams } : {}),
      ...(payload.season ? { season: payload.season } : {}),
    });
  }

  approve(actor: AuthenticatedUser, tournamentId: string) {
    return this.tournaments.approve(actor, tournamentId);
  }

  async registerSchool(actor: AuthenticatedUser, tournamentId: string, schoolId: string) {
    if (!schoolId?.trim()) {
      throw new BadRequestException('schoolId is required');
    }
    return this.tournaments.registerSchool(actor, tournamentId, schoolId.trim());
  }

  async getById(tournamentId: string) {
    const tournament = await this.tournaments.findById(tournamentId);
    if (!tournament) {
      throw new BadRequestException('Tournament not found');
    }
    return tournament;
  }

  getLeaderboard(tournamentId: string) {
    return this.tournaments.getLeaderboard(tournamentId);
  }
}
