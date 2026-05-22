import { Injectable, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type AuthenticatedUser, type MatchEventRecord } from '../common/store.js';
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

type RankingMetric = 'goals' | 'assists' | 'matchesPlayed';
type ReportType = 'federation_summary' | 'school_development' | 'data_quality';
type ReportLocale = 'en' | 'ne';

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

  async getAthleteDevelopment(athleteId: string) {
    const [athletes, schools, tournaments] = await Promise.all([
      this.analytics.listAthletes(),
      this.analytics.listSchools(),
      this.analytics.listTournaments(),
    ]);
    const athlete = athletes.find((candidate) => candidate.id === athleteId);
    if (!athlete) {
      throw new NotFoundException('Athlete not found');
    }

    const matches = await this.analytics.listMatches();
    const verifiedMatches = matches.filter((match) => match.status === 'verified');
    const events = (
      await Promise.all(verifiedMatches.map((match) => this.analytics.listMatchEvents(match.id)))
    ).flat();
    const athleteEvents = events.filter((event) => event.athleteId === athleteId);
    const matchIds = new Set(athleteEvents.map((event) => event.matchId));
    const goals = this.sumEvents(athleteEvents, 'goal');
    const assists = this.sumEvents(athleteEvents, 'assist');
    const cards =
      this.sumEvents(athleteEvents, 'yellow_card') + this.sumEvents(athleteEvents, 'red_card');
    const tournamentIds = new Set(athleteEvents.map((event) => event.tournamentId));
    const seasons = [...tournamentIds]
      .map((tournamentId) => {
        const tournament = tournaments.find((candidate) => candidate.id === tournamentId);
        const tournamentEvents = athleteEvents.filter(
          (event) => event.tournamentId === tournamentId,
        );
        return {
          season: tournament?.season ?? 'unspecified',
          tournaments: 1,
          matches: new Set(tournamentEvents.map((event) => event.matchId)).size,
          goals: this.sumEvents(tournamentEvents, 'goal'),
          assists: this.sumEvents(tournamentEvents, 'assist'),
        };
      })
      .sort((first, second) => first.season.localeCompare(second.season));
    const school = schools.find((candidate) => candidate.id === athlete.schoolId);

    return {
      athleteId: athlete.id,
      athleteName: athlete.fullName,
      schoolId: athlete.schoolId,
      schoolName: school?.name ?? 'Unknown school',
      athletiqId: athlete.athletiqId ?? null,
      verifiedMatches: matchIds.size,
      totalGoals: goals,
      totalAssists: assists,
      disciplineEvents: cards,
      seasons,
      trend: goals + assists > 0 ? 'rising' : 'needs_more_data',
    };
  }

  async getRankings(query: { scope?: string; sport?: string; metric?: string; limit?: string }) {
    const metric = this.parseRankingMetric(query.metric);
    const limit = this.parseLimit(query.limit, 25);
    const [athletes, schools, tournaments] = await Promise.all([
      this.analytics.listAthletes(),
      this.analytics.listSchools(),
      this.analytics.listTournaments(),
    ]);
    const sport = query.sport?.trim();
    const tournamentIds = new Set(
      tournaments
        .filter((tournament) => (sport ? tournament.sport === sport : true))
        .map((tournament) => tournament.id),
    );
    const matches = (await this.analytics.listMatches()).filter((match) =>
      tournamentIds.has(match.tournamentId),
    );
    const events = (
      await Promise.all(matches.map((match) => this.analytics.listMatchEvents(match.id)))
    ).flat();

    const rows = athletes
      .map((athlete) => {
        const athleteEvents = events.filter((event) => event.athleteId === athlete.id);
        const matchesPlayed = new Set(athleteEvents.map((event) => event.matchId)).size;
        const value =
          metric === 'matchesPlayed'
            ? matchesPlayed
            : this.sumEvents(athleteEvents, metric === 'goals' ? 'goal' : 'assist');
        const school = schools.find((candidate) => candidate.id === athlete.schoolId);
        return {
          athleteId: athlete.id,
          athleteName: athlete.fullName,
          schoolId: athlete.schoolId,
          schoolName: school?.name ?? 'Unknown school',
          metric,
          value,
        };
      })
      .filter((row) => row.value > 0)
      .sort((first, second) => second.value - first.value)
      .slice(0, limit)
      .map((row, index) => ({ rank: index + 1, ...row }));

    return {
      scope: query.scope ?? 'federation',
      sport: sport ?? 'all',
      metric,
      generatedAt: new Date().toISOString(),
      entries: rows,
    };
  }

  async getDataQualityDashboard() {
    const [schools, tournaments, athletes, matches] = await Promise.all([
      this.analytics.listSchools(),
      this.analytics.listTournaments(),
      this.analytics.listAthletes(),
      this.analytics.listMatches(),
    ]);
    const verifiedAthletes = athletes.filter(
      (athlete) => athlete.status === 'identity_approved',
    ).length;
    const approvedSchools = schools.filter((school) => school.status === 'approved').length;
    const verifiedMatches = matches.filter((match) => match.status === 'verified').length;
    const activeTournaments = tournaments.filter(
      (tournament) => tournament.status !== 'draft',
    ).length;
    const checks = [
      this.qualityCheck('identityVerification', verifiedAthletes, athletes.length),
      this.qualityCheck('schoolApproval', approvedSchools, schools.length),
      this.qualityCheck('matchVerification', verifiedMatches, matches.length),
      this.qualityCheck('tournamentActivation', activeTournaments, tournaments.length),
    ];
    const score =
      checks.length === 0
        ? 100
        : Math.round(checks.reduce((total, check) => total + check.score, 0) / checks.length);

    return {
      score,
      checks,
      generatedAt: new Date().toISOString(),
      nextActions: checks
        .filter((check) => check.score < 90)
        .map((check) => `Improve ${check.label.toLowerCase()}`),
    };
  }

  getDataProductExports() {
    return {
      exports: [
        {
          key: 'athlete-development-json',
          label: 'Athlete Development History',
          format: 'json',
          endpoint: '/api/analytics/athletes/:athleteId/development',
          audience: 'federations',
        },
        {
          key: 'rankings-csv',
          label: 'Federation Rankings',
          format: 'csv',
          endpoint: '/api/analytics/rankings',
          audience: 'scouts',
        },
        {
          key: 'data-quality-json',
          label: 'Data Quality Dashboard',
          format: 'json',
          endpoint: '/api/analytics/data-quality',
          audience: 'operators',
        },
      ],
    };
  }

  async createReportDraft(
    actor: AuthenticatedUser,
    payload: { reportType?: string; scope?: string; locale?: string },
  ) {
    const reportType = this.parseReportType(payload.reportType);
    const locale = this.parseLocale(payload.locale);
    const scope = payload.scope?.trim() || 'federation';
    const [overview, participation, quality] = await Promise.all([
      this.getFederationOverview(),
      this.getParticipationReport(),
      this.getDataQualityDashboard(),
    ]);

    return this.analytics.createReportDraft({
      actor,
      reportType,
      scope,
      locale,
      sections: [
        {
          title: locale === 'ne' ? 'सहभागिता सारांश' : 'Participation Summary',
          body:
            locale === 'ne'
              ? 'AI draft: grassroots participation and verification status for human review.'
              : 'AI draft: grassroots participation and verification status for human review.',
          metrics: {
            schools: overview.schools,
            tournaments: overview.tournaments,
            athletes: overview.athletes,
            participatingSchools: participation.schoolsParticipating,
          },
        },
        {
          title: locale === 'ne' ? 'डाटा गुणस्तर' : 'Data Quality',
          body:
            locale === 'ne'
              ? 'AI draft requires approval before publication.'
              : 'AI draft requires approval before publication.',
          metrics: {
            score: quality.score,
            checks: quality.checks.length,
          },
        },
      ],
    });
  }

  approveReportDraft(actor: AuthenticatedUser, draftId: string, payload: { note?: string }) {
    return this.analytics.approveReportDraft(actor, draftId, payload.note?.trim() || undefined);
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

  private sumEvents(events: MatchEventRecord[], type: MatchEventRecord['type']) {
    return events
      .filter((event) => event.status === 'active' && event.type === type)
      .reduce((total, event) => total + event.quantity, 0);
  }

  private parseRankingMetric(metric?: string): RankingMetric {
    if (!metric) {
      return 'goals';
    }
    if (metric === 'goals' || metric === 'assists' || metric === 'matchesPlayed') {
      return metric;
    }
    throw new BadRequestException('Unsupported ranking metric');
  }

  private parseLimit(limit: string | undefined, fallback: number) {
    if (!limit) {
      return fallback;
    }
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 250) {
      throw new BadRequestException('limit must be an integer between 1 and 250');
    }
    return parsed;
  }

  private parseReportType(reportType?: string): ReportType {
    if (
      reportType === 'federation_summary' ||
      reportType === 'school_development' ||
      reportType === 'data_quality'
    ) {
      return reportType;
    }
    throw new BadRequestException('Unsupported report type');
  }

  private parseLocale(locale?: string): ReportLocale {
    if (!locale || locale === 'en') {
      return 'en';
    }
    if (locale === 'ne') {
      return 'ne';
    }
    throw new BadRequestException('Unsupported report locale');
  }

  private qualityCheck(key: string, passed: number, total: number) {
    const score = total === 0 ? 100 : Math.round((passed / total) * 100);
    return {
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (first) => first.toUpperCase()),
      passed,
      total,
      score,
      status: score >= 90 ? 'healthy' : score >= 70 ? 'watch' : 'action_required',
    };
  }
}
