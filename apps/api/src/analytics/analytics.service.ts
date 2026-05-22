import { Injectable, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import {
  ANALYTICS_REPOSITORY,
  type AnalyticsRepository,
} from '../repositories/repository.types.js';

type ParticipantStats = {
  schoolId: string;
  schoolName: string;
  verifiedAthletes: number;
  totalAthletes: number;
};

@Injectable()
export class AnalyticsService {
  constructor(@Inject(ANALYTICS_REPOSITORY) private readonly analytics: AnalyticsRepository) {}

  async getFederationOverview() {
    const [schools, tournaments, athletes] = await Promise.all([
      this.analytics.listSchools(),
      this.analytics.listTournaments(),
      this.analytics.listAthletes(),
    ]);

    return {
      schools: schools.length,
      tournaments: tournaments.length,
      athletes: athletes.length,
      verifiedAthletes: athletes.filter((athlete) => athlete.status === 'identity_approved').length,
    };
  }

  async getParticipationReport(tournamentId?: string) {
    const [schools, tournaments, teams, athletes] = await Promise.all([
      this.analytics.listSchools(),
      this.analytics.listTournaments(),
      this.analytics.listTeams(tournamentId),
      this.analytics.listAthletes(),
    ]);

    if (tournamentId) {
      const tournament = tournaments.find((candidate) => candidate.id === tournamentId);
      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }
    }

    const uniqueAthletes = new Set<string>();
    const statsBySchool = new Map<string, ParticipantStats>();

    for (const athlete of athletes) {
      uniqueAthletes.add(athlete.id);
      if (!statsBySchool.has(athlete.schoolId)) {
        const school = schools.find((candidate) => candidate.id === athlete.schoolId);
        if (!school) {
          continue;
        }
        statsBySchool.set(athlete.schoolId, {
          schoolId: school.id,
          schoolName: school.name,
          totalAthletes: 0,
          verifiedAthletes: 0,
        });
      }
      const entry = statsBySchool.get(athlete.schoolId);
      if (!entry) {
        continue;
      }
      entry.totalAthletes += 1;
      if (athlete.status === 'identity_approved') {
        entry.verifiedAthletes += 1;
      }
    }

    const participantSchools = teams.reduce((acc, team) => {
      if (!acc.has(team.schoolId)) {
        acc.add(team.schoolId);
      }
      return acc;
    }, new Set<string>());

    return {
      tournamentId: tournamentId ?? null,
      totalAthletes: uniqueAthletes.size,
      schoolsParticipating: participantSchools.size,
      schoolStats: [...statsBySchool.values()],
    };
  }

  async exportTournament(tournamentId: string) {
    const tournament = await this.analytics.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const leaderboard = await this.analytics.getTournamentLeaderboard(tournamentId, 1000);
    return {
      tournamentId,
      tournamentName: tournament.name,
      exportedAt: new Date().toISOString(),
      totalTeams: tournament.teamIds.length,
      leaderboard,
    };
  }

  recordOverride(
    actor: AuthenticatedUser,
    payload: { scope: string; targetId: string; field: string; reason?: string },
  ) {
    if (!payload.scope?.trim() || !payload.targetId?.trim() || !payload.field?.trim()) {
      throw new BadRequestException('scope, targetId and field are required');
    }

    const reason = payload.reason?.trim();
    const overridePayload = {
      scope: payload.scope.trim(),
      targetId: payload.targetId.trim(),
      field: payload.field.trim(),
    };
    return this.analytics.recordFederationOverride(
      actor,
      reason ? { ...overridePayload, reason } : overridePayload,
    );
  }
}
