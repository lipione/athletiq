import { jsonBody, liveApiRequest, type LiveApiOptions } from './live-api.js';

export type BracketFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'league'
  | 'group_stage_knockout';

export type BracketSeedInput = {
  teamId: string;
  seedNumber: number;
  groupKey?: string;
  locked?: boolean;
  withdrawn?: boolean;
};

export type BracketRecord = {
  id: string;
  tournamentId: string;
  format: BracketFormat;
  status: string;
  activeVersionId: string;
  publishedVersionId?: string;
  publicSlug?: string;
  createdBy: string;
  publishedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BracketVersionRecord = {
  id: string;
  bracketId: string;
  versionNumber: number;
  status: string;
  generationPolicy: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
};

export type BracketSeedRecord = BracketSeedInput & {
  id: string;
  bracketId: string;
  versionId: string;
  locked: boolean;
  withdrawn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BracketNodeRecord = {
  id: string;
  bracketId: string;
  versionId: string;
  matchId?: string;
  groupKey?: string;
  round: number;
  position: number;
  bracketSide: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeSeedNumber?: number;
  awaySeedNumber?: number;
  winnerTeamId?: string;
  loserTeamId?: string;
  sourceNodeIds: string[];
  nextNodeId?: string;
  loserNextNodeId?: string;
  isIfNecessary?: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type StandingRowRecord = {
  id: string;
  bracketId: string;
  versionId: string;
  groupKey: string;
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  disciplinaryPoints: number;
  headToHeadPoints: number;
  rank: number;
  updatedAt: string;
};

export type BracketTeamSummary = {
  id: string;
  name: string;
  schoolId: string;
};

export type BracketView = {
  bracket: BracketRecord;
  version: BracketVersionRecord;
  seeds: BracketSeedRecord[];
  nodes: BracketNodeRecord[];
  standings: StandingRowRecord[];
  teams: BracketTeamSummary[];
};

export type CreateBracketInput = {
  format: BracketFormat;
  seeds: BracketSeedInput[];
};

export type RegenerateBracketInput = {
  createNewVersion?: boolean;
  seeds?: BracketSeedInput[];
  notes?: string;
};

export const createBracket = (
  tournamentId: string,
  input: CreateBracketInput,
  options: LiveApiOptions = {},
) =>
  liveApiRequest<BracketView>(
    `/tournaments/${encodeURIComponent(tournamentId)}/brackets`,
    jsonBody(input),
    options,
  );

export const updateBracketSeeds = (
  bracketId: string,
  seeds: BracketSeedInput[],
  options: LiveApiOptions = {},
) =>
  liveApiRequest<BracketView>(
    `/brackets/${encodeURIComponent(bracketId)}/seeds`,
    jsonBody({ seeds }),
    options,
  );

export const publishBracket = (bracketId: string, options: LiveApiOptions = {}) =>
  liveApiRequest<BracketView>(
    `/brackets/${encodeURIComponent(bracketId)}/publish`,
    { method: 'POST' },
    options,
  );

export const regenerateBracket = (
  bracketId: string,
  input: RegenerateBracketInput,
  options: LiveApiOptions = {},
) =>
  liveApiRequest<BracketView>(
    `/brackets/${encodeURIComponent(bracketId)}/regenerate`,
    jsonBody(input),
    options,
  );

export const getBracketView = (
  bracketId: string,
  versionId?: string,
  options: LiveApiOptions = {},
) => {
  const query = versionId ? `?versionId=${encodeURIComponent(versionId)}` : '';

  return liveApiRequest<BracketView>(
    `/brackets/${encodeURIComponent(bracketId)}${query}`,
    {},
    options,
  );
};
