import { canonicalizeNepaliDate } from '@athletiq/shared';

export function formatDate(value: string) {
  return formatBsDateFromAd(value);
}

export function formatDateTime(value: string) {
  const time = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kathmandu',
  }).format(new Date(value));

  return `${formatBsDateFromAd(value)} · ${time} NPT`;
}

function formatBsDateFromAd(value: string) {
  try {
    return canonicalizeNepaliDate(toAdDateOnly(value), 'AD').display.en;
  } catch {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Kathmandu',
    }).format(new Date(value));
  }
}

function toAdDateOnly(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
  }).formatToParts(new Date(value));
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${valueFor('year')}-${valueFor('month')}-${valueFor('day')}`;
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
  const safeAthleteId = athleteId.trim();
  if (!safeAthleteId) {
    return '/athletes/athlete-not-found/passport';
  }

  return `/athletes/${encodeURIComponent(safeAthleteId)}/passport`;
}
