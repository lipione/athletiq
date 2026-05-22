import {
  routeForAthletePassport,
  routeForPublicTournament,
  routeForSchoolManagement,
  routeForWorkspace,
} from './phase14-format.js';

export type RoleSlug =
  | 'super-admin'
  | 'school-admin'
  | 'coach-referee'
  | 'federation'
  | 'government';

export type ActorRole = RoleSlug;

export type ActorContext = {
  role: ActorRole;
  schoolId?: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  trend: 'up' | 'down' | 'flat';
};

export type DashboardRow = {
  label: string;
  status: string;
  owner: string;
  nextAction: string;
};

export type DashboardSnapshot = {
  role: RoleSlug;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryAction: string;
  metrics: DashboardMetric[];
  alerts: string[];
  tasks: string[];
  tableTitle: string;
  tableDescription: string;
  rows: DashboardRow[];
  quickLinks: { label: string; href: string }[];
};

export type SchoolRecord = {
  id: string;
  name: string;
  district: string;
  province: string;
  status: 'approved' | 'review' | 'restricted';
};

export type SchoolAthlete = {
  id: string;
  name: string;
  athletiqId: string;
  team: string;
  verification: 'verified' | 'review' | 'missing-documents';
  eligibility: string;
};

export type SchoolManagementView =
  | {
      allowed: true;
      school: SchoolRecord;
      athletes: SchoolAthlete[];
      readiness: DashboardMetric[];
      privateNotes: string[];
    }
  | {
      allowed: false;
      school?: SchoolRecord;
      reason: string;
      athletes: [];
      privateNotes: [];
    };

export type TeamPublic = {
  id: string;
  name: string;
  schoolName: string;
  seed: number;
};

type TeamInternal = TeamPublic & {
  athleteIds: string[];
};

export type MatchPublic = {
  id: string;
  round: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  startsAt: string;
  venue: string;
  status: 'scheduled' | 'live' | 'verified';
};

export type BracketNodePublic = {
  id: string;
  round: number;
  bracketSide: 'main' | 'winners' | 'losers' | 'finals';
  matchId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  winnerTeamId: string | null;
  label: string;
  isIfNecessary: boolean;
};

export type StandingRow = {
  rank: number;
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

export type PublicTournament = {
  slug: string;
  name: string;
  sport: string;
  ageGroup: string;
  location: string;
  status: 'published' | 'live' | 'completed';
  scheduleStatus: 'published' | 'updated' | 'unpublished';
  startsAt: string;
  endsAt: string;
  teams: TeamPublic[];
  matches: MatchPublic[];
  bracketNodes: BracketNodePublic[];
  standings: StandingRow[];
};

type TournamentInternal = Omit<PublicTournament, 'teams'> & {
  teams: TeamInternal[];
  guardianContact: string;
  documentBucket: string;
  dateOfBirth: string;
};

export type AthleteTimelineItem = {
  date: string;
  title: string;
  detail: string;
  type: 'identity' | 'tournament' | 'document' | 'award' | 'development';
};

export type AthletePassport = {
  id: string;
  fullName: string;
  athletiqId: string;
  schoolName: string;
  province: string;
  ageGroup: string;
  sports: string[];
  verificationStatus: 'verified' | 'review';
  qrCodeLabel: string;
  stats: { label: string; value: string; detail: string }[];
  timeline: AthleteTimelineItem[];
};

export const workspaceRoles: DashboardSnapshot[] = [
  {
    role: 'super-admin',
    label: 'Super Admin',
    eyebrow: 'National control tower',
    title: 'Operational command for verified youth sports infrastructure',
    subtitle:
      'Monitor identity verification, school onboarding, tournament integrity, billing, disputes, and schedule health across the platform.',
    primaryAction: 'Review verification queue',
    metrics: [
      { label: 'Athletes tracked', value: '128,420', detail: '+8.6% this quarter', trend: 'up' },
      { label: 'Schools active', value: '1,842', detail: '91 awaiting review', trend: 'up' },
      { label: 'Data disputes', value: '27', detail: '11 high priority', trend: 'down' },
      { label: 'Schedule conflicts', value: '4', detail: '2 official overlaps', trend: 'flat' },
    ],
    alerts: [
      'Kathmandu School Cup has a bracket reseed request after play started.',
      'Seven document review links expire within 24 hours.',
      'Province 3 participation data is ready for federation export.',
    ],
    tasks: ['Approve pending schools', 'Audit duplicate identities', 'Release federation reports'],
    tableTitle: 'Platform Risk Queue',
    tableDescription: 'High-signal operating items requiring admin review.',
    rows: [
      {
        label: 'Age verification dispute',
        status: 'review',
        owner: 'Identity desk',
        nextAction: 'Compare OCR evidence',
      },
      {
        label: 'Tournament schedule override',
        status: 'published',
        owner: 'Scheduling lead',
        nextAction: 'Notify schools',
      },
      {
        label: 'Federation export request',
        status: 'ready',
        owner: 'Analytics',
        nextAction: 'Approve CSV package',
      },
    ],
    quickLinks: [
      { label: 'School management', href: routeForSchoolManagement('school-kantipur') },
      { label: 'Public tournament', href: routeForPublicTournament('kathmandu-school-cup-2026') },
      { label: 'Athlete passport', href: routeForAthletePassport('ath-nima-rai') },
    ],
  },
  {
    role: 'school-admin',
    label: 'School Admin',
    eyebrow: 'Kantipur International School',
    title: 'Roster readiness, documents, waivers, and tournament participation',
    subtitle:
      'Keep athletes eligible, teams complete, invoices current, and coaches aligned before match day.',
    primaryAction: 'Open school management',
    metrics: [
      { label: 'Verified athletes', value: '284', detail: '18 need document review', trend: 'up' },
      { label: 'Tournament teams', value: '14', detail: '4 pending approval', trend: 'flat' },
      { label: 'Waiver completion', value: '92%', detail: '7 signatures missing', trend: 'up' },
      { label: 'Membership status', value: 'Active', detail: 'Renews in 46 days', trend: 'flat' },
    ],
    alerts: [
      'Basketball U16 roster is missing two guardian waivers.',
      'Football team has a fixture moved to 14:30 at Dasharath Field B.',
      'Three athlete documents were flagged as duplicates.',
    ],
    tasks: ['Upload missing IDs', 'Confirm team travel', 'Share schedule update with coaches'],
    tableTitle: 'Team Readiness',
    tableDescription: 'Eligibility and operations status by school team.',
    rows: [
      { label: 'U16 Football', status: 'ready', owner: 'Coach Lama', nextAction: 'Confirm lineup' },
      {
        label: 'U14 Basketball',
        status: 'waivers',
        owner: 'Coach Shrestha',
        nextAction: 'Collect signatures',
      },
      {
        label: 'Athletics Squad',
        status: 'documents',
        owner: 'Sports office',
        nextAction: 'Upload birth certificates',
      },
    ],
    quickLinks: [
      { label: 'Manage roster', href: routeForSchoolManagement('school-kantipur') },
      { label: 'Public tournament', href: routeForPublicTournament('kathmandu-school-cup-2026') },
    ],
  },
  {
    role: 'coach-referee',
    label: 'Coach & Referee',
    eyebrow: 'Match-day workspace',
    title: 'Assigned fixtures, match sheets, verification, and incident reports',
    subtitle:
      'A focused workspace for officials and coaches to manage lineups, check-ins, scoring, and result verification.',
    primaryAction: 'Open next match sheet',
    metrics: [
      {
        label: 'Assignments today',
        value: '6',
        detail: '2 accepted, 1 needs response',
        trend: 'flat',
      },
      { label: 'Match sheets', value: '11', detail: '3 awaiting verification', trend: 'down' },
      { label: 'Check-ins', value: '96%', detail: 'One team late', trend: 'up' },
      { label: 'Reports due', value: '2', detail: 'Before 19:00', trend: 'flat' },
    ],
    alerts: [
      'Referee assignment for Match 18 needs acceptance.',
      'U16 final has a venue change and updated kickoff.',
      'One correction request is waiting for official review.',
    ],
    tasks: ['Accept assignment', 'Verify semifinal result', 'Submit incident report'],
    tableTitle: 'Match-Day Queue',
    tableDescription: 'Fixtures and verification actions for coaches and officials.',
    rows: [
      { label: 'Match 18', status: 'assigned', owner: 'Referee Tamang', nextAction: 'Accept' },
      { label: 'U16 Semifinal', status: 'review', owner: 'Coach Lama', nextAction: 'Verify score' },
      {
        label: 'Girls 400m',
        status: 'ready',
        owner: 'Starter desk',
        nextAction: 'Open heat sheet',
      },
    ],
    quickLinks: [
      { label: 'Tournament bracket', href: routeForPublicTournament('kathmandu-school-cup-2026') },
    ],
  },
  {
    role: 'federation',
    label: 'Federation',
    eyebrow: 'Football Association',
    title: 'Grassroots intelligence, rankings, disputes, and verified exports',
    subtitle:
      'Track verified participation, federation rankings, tournament compliance, and national development signals.',
    primaryAction: 'Export verified analytics',
    metrics: [
      {
        label: 'Registered footballers',
        value: '42,810',
        detail: '+12 districts live',
        trend: 'up',
      },
      { label: 'Verified tournaments', value: '64', detail: '9 active this week', trend: 'up' },
      { label: 'Ranking exceptions', value: '13', detail: '3 manual overrides', trend: 'down' },
      { label: 'Scout watchlist', value: '184', detail: '26 new this month', trend: 'up' },
    ],
    alerts: [
      'Province 4 U16 leaderboard is ready for review.',
      'Two tournament exports contain corrected match events.',
      'Age-band participation gap detected in Far West districts.',
    ],
    tasks: ['Review ranking overrides', 'Publish monthly report', 'Escalate data anomalies'],
    tableTitle: 'Federation Intelligence',
    tableDescription: 'Verified sport-level signals across schools and tournaments.',
    rows: [
      { label: 'U16 National Ranking', status: 'ready', owner: 'Analytics', nextAction: 'Publish' },
      {
        label: 'Data quality override',
        status: 'review',
        owner: 'Federation admin',
        nextAction: 'Approve',
      },
      {
        label: 'Talent watchlist',
        status: 'updated',
        owner: 'Scouting',
        nextAction: 'Share shortlist',
      },
    ],
    quickLinks: [
      { label: 'Public tournament', href: routeForPublicTournament('kathmandu-school-cup-2026') },
    ],
  },
  {
    role: 'government',
    label: 'Government',
    eyebrow: 'National Sports Council',
    title: 'Read-only participation analytics for policy and infrastructure planning',
    subtitle:
      'Measure school sport participation, geographic coverage, facility pressure, and equity indicators without exposing private athlete data.',
    primaryAction: 'View province report',
    metrics: [
      { label: 'Province coverage', value: '7/7', detail: 'All active', trend: 'up' },
      { label: 'Girls participation', value: '41%', detail: '+4.2 pts YoY', trend: 'up' },
      { label: 'Facility pressure', value: '78%', detail: 'Kathmandu peak load', trend: 'flat' },
      { label: 'Schools reporting', value: '1,284', detail: '94% on time', trend: 'up' },
    ],
    alerts: [
      'Kathmandu fields exceed 80% weekend utilization.',
      'Province 6 needs more girls basketball events.',
      'Three districts have no verified athletics data this quarter.',
    ],
    tasks: ['Review province coverage', 'Download infrastructure brief', 'Share policy dashboard'],
    tableTitle: 'Policy Signals',
    tableDescription: 'Aggregated and privacy-safe planning indicators.',
    rows: [
      {
        label: 'Kathmandu facility load',
        status: 'high',
        owner: 'Infrastructure',
        nextAction: 'Plan slots',
      },
      {
        label: 'Province 6 gender gap',
        status: 'watch',
        owner: 'Participation',
        nextAction: 'Fund programs',
      },
      {
        label: 'District data coverage',
        status: 'review',
        owner: 'Data office',
        nextAction: 'Request reporting',
      },
    ],
    quickLinks: [
      { label: 'Public tournament', href: routeForPublicTournament('kathmandu-school-cup-2026') },
    ],
  },
];

const schools: SchoolRecord[] = [
  {
    id: 'school-kantipur',
    name: 'Kantipur International School',
    district: 'Kathmandu',
    province: 'Bagmati',
    status: 'approved',
  },
  {
    id: 'school-riverside',
    name: 'Riverside Academy',
    district: 'Lalitpur',
    province: 'Bagmati',
    status: 'approved',
  },
];

const schoolAthletes: Record<string, SchoolAthlete[]> = {
  'school-kantipur': [
    {
      id: 'ath-nima-rai',
      name: 'Nima Rai',
      athletiqId: 'ATH-NP-2026-000184',
      team: 'U16 Football',
      verification: 'verified',
      eligibility: 'Cleared for Kathmandu School Cup',
    },
    {
      id: 'ath-maya-shrestha',
      name: 'Maya Shrestha',
      athletiqId: 'ATH-NP-2026-000211',
      team: 'U14 Basketball',
      verification: 'review',
      eligibility: 'Guardian waiver pending',
    },
    {
      id: 'ath-pemba-lama',
      name: 'Pemba Lama',
      athletiqId: 'ATH-NP-2026-000304',
      team: 'Athletics',
      verification: 'missing-documents',
      eligibility: 'Birth certificate required',
    },
  ],
  'school-riverside': [
    {
      id: 'ath-riverside-1',
      name: 'Aarav Kc',
      athletiqId: 'ATH-NP-2026-000510',
      team: 'U16 Football',
      verification: 'verified',
      eligibility: 'Cleared',
    },
  ],
};

const tournament: TournamentInternal = {
  slug: 'kathmandu-school-cup-2026',
  name: 'Kathmandu School Cup 2026',
  sport: 'Football',
  ageGroup: 'U16',
  location: 'Dasharath Stadium Complex',
  status: 'live',
  scheduleStatus: 'updated',
  startsAt: '2026-06-02T03:30:00.000Z',
  endsAt: '2026-06-07T12:30:00.000Z',
  guardianContact: '+977-9800000000',
  documentBucket: 'private://athletiq/docs/kathmandu-cup',
  dateOfBirth: '2010-01-12',
  teams: [
    {
      id: 'team-kantipur-u16',
      name: 'Kantipur Falcons',
      schoolName: 'Kantipur International School',
      seed: 1,
      athleteIds: ['ath-nima-rai', 'ath-maya-shrestha'],
    },
    {
      id: 'team-riverside-u16',
      name: 'Riverside Rangers',
      schoolName: 'Riverside Academy',
      seed: 2,
      athleteIds: ['ath-riverside-1'],
    },
    {
      id: 'team-himalaya-u16',
      name: 'Himalaya United',
      schoolName: 'Himalaya Public School',
      seed: 3,
      athleteIds: ['ath-private-3'],
    },
    {
      id: 'team-valley-u16',
      name: 'Valley Strikers',
      schoolName: 'Valley Secondary School',
      seed: 4,
      athleteIds: ['ath-private-4'],
    },
  ],
  matches: [
    {
      id: 'match-ksc-01',
      round: 'Semifinal',
      homeTeamId: 'team-kantipur-u16',
      awayTeamId: 'team-valley-u16',
      homeScore: 3,
      awayScore: 1,
      startsAt: '2026-06-02T04:15:00.000Z',
      venue: 'Field A',
      status: 'verified',
    },
    {
      id: 'match-ksc-02',
      round: 'Semifinal',
      homeTeamId: 'team-riverside-u16',
      awayTeamId: 'team-himalaya-u16',
      homeScore: 2,
      awayScore: 2,
      startsAt: '2026-06-02T06:30:00.000Z',
      venue: 'Field B',
      status: 'live',
    },
    {
      id: 'match-ksc-03',
      round: 'Final',
      homeTeamId: 'team-kantipur-u16',
      awayTeamId: 'team-riverside-u16',
      homeScore: null,
      awayScore: null,
      startsAt: '2026-06-07T09:45:00.000Z',
      venue: 'Main Pitch',
      status: 'scheduled',
    },
  ],
  bracketNodes: [
    {
      id: 'node-1',
      round: 1,
      bracketSide: 'main',
      matchId: 'match-ksc-01',
      homeTeamId: 'team-kantipur-u16',
      awayTeamId: 'team-valley-u16',
      winnerTeamId: 'team-kantipur-u16',
      label: 'Semifinal A',
      isIfNecessary: false,
    },
    {
      id: 'node-2',
      round: 1,
      bracketSide: 'main',
      matchId: 'match-ksc-02',
      homeTeamId: 'team-riverside-u16',
      awayTeamId: 'team-himalaya-u16',
      winnerTeamId: null,
      label: 'Semifinal B',
      isIfNecessary: false,
    },
    {
      id: 'node-3',
      round: 2,
      bracketSide: 'finals',
      matchId: 'match-ksc-03',
      homeTeamId: 'team-kantipur-u16',
      awayTeamId: 'team-riverside-u16',
      winnerTeamId: null,
      label: 'Championship Final',
      isIfNecessary: false,
    },
  ],
  standings: [
    { rank: 1, teamId: 'team-kantipur-u16', played: 2, wins: 2, draws: 0, losses: 0, points: 6 },
    { rank: 2, teamId: 'team-riverside-u16', played: 2, wins: 1, draws: 1, losses: 0, points: 4 },
    { rank: 3, teamId: 'team-himalaya-u16', played: 2, wins: 0, draws: 1, losses: 1, points: 1 },
    { rank: 4, teamId: 'team-valley-u16', played: 2, wins: 0, draws: 0, losses: 2, points: 0 },
  ],
};

const athletePassports: AthletePassport[] = [
  {
    id: 'ath-nima-rai',
    fullName: 'Nima Rai',
    athletiqId: 'ATH-NP-2026-000184',
    schoolName: 'Kantipur International School',
    province: 'Bagmati',
    ageGroup: 'U16',
    sports: ['Football', 'Athletics'],
    verificationStatus: 'verified',
    qrCodeLabel: 'QR ATH-NP-2026-000184',
    stats: [
      { label: 'Verified tournaments', value: '8', detail: 'Since 2022' },
      { label: 'Goals', value: '24', detail: 'School competitions' },
      { label: 'Assists', value: '13', detail: 'Verified match events' },
      { label: 'Sprint PB', value: '12.42s', detail: '100m school athletics' },
    ],
    timeline: [
      {
        date: '2022-05-18T00:00:00.000Z',
        title: 'ATHLETIQ identity created',
        detail: 'School registration and first verified sports profile.',
        type: 'identity',
      },
      {
        date: '2024-08-04T00:00:00.000Z',
        title: 'District football finalist',
        detail: 'Scored two goals in verified knockout play.',
        type: 'tournament',
      },
      {
        date: '2025-02-12T00:00:00.000Z',
        title: 'Birth certificate verified',
        detail: 'OCR extraction reviewed by school and platform verifier.',
        type: 'document',
      },
      {
        date: '2026-06-02T00:00:00.000Z',
        title: 'Kathmandu School Cup semifinal MVP',
        detail: 'One goal, one assist, and verified match rating.',
        type: 'award',
      },
    ],
  },
];

export function getWorkspaceForRole(roleSlug: RoleSlug) {
  const role = workspaceRoles.find((workspaceRole) => workspaceRole.role === roleSlug);
  if (!role) {
    throw new Error(`Unknown workspace role: ${roleSlug}`);
  }

  return role;
}

export function getDashboardSnapshot(roleSlug: RoleSlug) {
  return getWorkspaceForRole(roleSlug);
}

export function getAllDashboards() {
  return workspaceRoles;
}

export function assertSchoolAccess(actor: ActorContext, schoolId: string) {
  if (actor.role === 'super-admin') {
    return { allowed: true as const };
  }

  if (actor.role !== 'school-admin') {
    return {
      allowed: false as const,
      reason: 'Only school administrators can manage school records.',
    };
  }

  if (actor.schoolId !== schoolId) {
    return {
      allowed: false as const,
      reason: 'School administrators can only access their own school.',
    };
  }

  return { allowed: true as const };
}

export function getSchoolById(schoolId: string) {
  return schools.find((school) => school.id === schoolId);
}

export function getSchoolManagementView(
  actor: ActorContext,
  schoolId: string,
): SchoolManagementView {
  const school = getSchoolById(schoolId);
  const access = assertSchoolAccess(actor, schoolId);

  if (!access.allowed) {
    const deniedView: SchoolManagementView = {
      allowed: false,
      reason: access.reason,
      athletes: [],
      privateNotes: [],
    };

    if (school) {
      deniedView.school = school;
    }

    return deniedView;
  }

  if (!school) {
    return {
      allowed: false,
      reason: 'School was not found.',
      athletes: [],
      privateNotes: [],
    };
  }

  return {
    allowed: true,
    school,
    athletes: schoolAthletes[schoolId] ?? [],
    readiness: [
      { label: 'Roster verified', value: '91%', detail: '3 records need action', trend: 'up' },
      {
        label: 'Documents current',
        value: '86%',
        detail: 'Birth certificates pending',
        trend: 'flat',
      },
      { label: 'Waivers signed', value: '92%', detail: 'Guardian follow-up needed', trend: 'up' },
      { label: 'Invoices', value: 'Clear', detail: 'No balance due', trend: 'flat' },
    ],
    privateNotes: [
      'Maya Shrestha requires guardian waiver review before U14 registration.',
      'Pemba Lama needs OCR retry because document contrast was low.',
    ],
  };
}

export function getTeamName(teamId: string) {
  return tournament.teams.find((team) => team.id === teamId)?.name ?? 'TBD';
}

export function getPublicTournament(slug: string): PublicTournament | undefined {
  if (slug !== tournament.slug) {
    return undefined;
  }

  return getPublicTournamentPayload(slug);
}

export function getPublicTournamentPayload(slug: string): PublicTournament | undefined {
  if (slug !== tournament.slug) {
    return undefined;
  }

  return {
    slug: tournament.slug,
    name: tournament.name,
    sport: tournament.sport,
    ageGroup: tournament.ageGroup,
    location: tournament.location,
    status: tournament.status,
    scheduleStatus: tournament.scheduleStatus,
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    teams: tournament.teams.map((team) => ({
      id: team.id,
      name: team.name,
      schoolName: team.schoolName,
      seed: team.seed,
    })),
    matches: [...tournament.matches],
    bracketNodes: [...tournament.bracketNodes],
    standings: [...tournament.standings],
  };
}

export function getAthletePassport(athleteId: string) {
  return athletePassports.find((athlete) => athlete.id === athleteId);
}

export function getDefaultActorForQuery(
  role: string | undefined,
  schoolId: string | undefined,
): ActorContext {
  if (role === 'super-admin') {
    return { role: 'super-admin' };
  }

  if (role === 'school-admin') {
    return { role: 'school-admin', schoolId: schoolId ?? 'school-kantipur' };
  }

  return { role: 'school-admin', schoolId: 'school-kantipur' };
}

export function getWorkspaceLinks() {
  return workspaceRoles.map((role) => ({
    label: role.label,
    href: routeForWorkspace(role.role),
  }));
}
