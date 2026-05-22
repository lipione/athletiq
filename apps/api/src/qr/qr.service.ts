import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import { PrivacyService } from '../privacy/privacy.service.js';
import {
  MATCH_REPOSITORY,
  QR_REPOSITORY,
  TEAM_REPOSITORY,
  type MatchRepository,
  type QrRepository,
  type TeamRepository,
} from '../repositories/repository.types.js';

@Injectable()
export class QrService {
  constructor(
    @Inject(QR_REPOSITORY) private readonly qr: QrRepository,
    @Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository,
    @Inject(TEAM_REPOSITORY) private readonly teams: TeamRepository,
    @Inject(PrivacyService) private readonly privacy: PrivacyService,
  ) {}

  generateAthleteCode(actor: AuthenticatedUser, athleteId: string) {
    return this.qr.createCode(actor, 'athlete', athleteId);
  }

  generateMatchCode(actor: AuthenticatedUser, matchId: string) {
    return this.qr.createCode(actor, 'match', matchId);
  }

  generateTeamCode(actor: AuthenticatedUser, teamId: string) {
    return this.qr.createCode(actor, 'team', teamId);
  }

  async resolveAthletePublic(code: string) {
    const qr = await this.qr.findPublicResource('athlete', code);
    if (!qr) {
      throw new NotFoundException('QR code not found');
    }

    return {
      ...(await this.privacy.getPublicAthleteProfileById(qr.resourceId)),
    };
  }

  async resolveMatchPublic(code: string) {
    const qr = await this.qr.findPublicResource('match', code);
    if (!qr) {
      throw new NotFoundException('QR code not found');
    }

    const match = await this.matches.findById(qr.resourceId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return {
      type: 'match',
      matchId: match.id,
      tournamentId: match.tournamentId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      status: match.status,
      homeScore: match.homeScore ?? null,
      awayScore: match.awayScore ?? null,
    };
  }

  async resolveTeamPublic(code: string) {
    const qr = await this.qr.findPublicResource('team', code);
    if (!qr) {
      throw new NotFoundException('QR code not found');
    }

    const team = await this.teams.findById(qr.resourceId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return {
      type: 'team',
      teamId: team.id,
      name: team.name,
      schoolId: team.schoolId,
    };
  }

  scan(actor: AuthenticatedUser, code: string) {
    return this.qr.recordScan(actor, code);
  }
}
