export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kathmandu',
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kathmandu',
  }).format(new Date(value));
}

export function formatScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return 'Scheduled';
  }

  return `${homeScore}-${awayScore}`;
}

export function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function routeForWorkspace(roleSlug: string) {
  return `/workspaces/${roleSlug}`;
}

export function routeForSchoolManagement(schoolId: string) {
  return `/schools/${schoolId}/management`;
}

export function routeForPublicTournament(slug: string) {
  return `/public/tournaments/${slug}`;
}

export function routeForAthletePassport(athleteId: string) {
  return `/athletes/${athleteId}/passport`;
}
