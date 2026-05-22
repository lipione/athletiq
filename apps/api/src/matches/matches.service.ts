import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AuthenticatedUser, type MatchReport, type MatchEventType } from '../common/store.js';
import {
  BRACKET_REPOSITORY,
  MATCH_REPOSITORY,
  type BracketRepository,
  type MatchRepository,
} from '../repositories/repository.types.js';

@Injectable()
export class MatchesService {
  constructor(
    @Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository,
    @Inject(BRACKET_REPOSITORY) private readonly brackets: BracketRepository,
  ) {}

  list(tournamentId?: string) {
    return this.matches.list(tournamentId?.trim());
  }

  create(
    actor: AuthenticatedUser,
    payload: {
      tournamentId: string;
      homeTeamId: string;
      awayTeamId: string;
      scheduledAt: string;
    },
  ) {
    if (!payload.tournamentId?.trim()) {
      throw new BadRequestException('tournamentId is required');
    }
    if (!payload.homeTeamId?.trim() || !payload.awayTeamId?.trim()) {
      throw new BadRequestException('Both homeTeamId and awayTeamId are required');
    }
    if (!payload.scheduledAt?.trim()) {
      throw new BadRequestException('scheduledAt is required');
    }

    return this.matches.create({
      actor,
      tournamentId: payload.tournamentId.trim(),
      homeTeamId: payload.homeTeamId.trim(),
      awayTeamId: payload.awayTeamId.trim(),
      scheduledAt: payload.scheduledAt.trim(),
    });
  }

  submitResult(actor: AuthenticatedUser, matchId: string, report: MatchReport) {
    if (typeof report.homeScore !== 'number' || typeof report.awayScore !== 'number') {
      throw new BadRequestException('homeScore and awayScore are required');
    }

    if (!Number.isFinite(report.homeScore) || !Number.isFinite(report.awayScore)) {
      throw new BadRequestException('Scores must be valid numbers');
    }

    return this.matches.submitResult(actor, matchId, report);
  }

  async verify(actor: AuthenticatedUser, matchId: string) {
    return this.brackets.verifyMatchAndAdvance(actor, matchId);
  }

  listEvents(matchId: string) {
    return this.matches.listEvents(matchId);
  }

  submitEvent(
    actor: AuthenticatedUser,
    matchId: string,
    payload: {
      athleteId: string;
      teamId: string;
      type: MatchEventType;
      minute?: number;
      details?: string;
      quantity?: number;
    },
  ) {
    return this.matches.submitEvent(actor, matchId, payload);
  }

  correctEvent(
    actor: AuthenticatedUser,
    matchId: string,
    eventId: string,
    payload: {
      athleteId: string;
      teamId: string;
      type: MatchEventType;
      minute?: number;
      details?: string;
      quantity?: number;
      reason?: string;
    },
  ) {
    return this.matches.correctEvent(actor, matchId, eventId, payload);
  }

  getMatchStats(matchId: string) {
    return this.matches.getDerivedStats(matchId);
  }

  async getById(matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) {
      throw new BadRequestException('Match not found');
    }
    const stats = await this.matches.getDerivedStats(matchId);
    if (stats) {
      return {
        ...match,
        stats,
      };
    }
    return match;
  }
}
