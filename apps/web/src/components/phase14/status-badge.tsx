type StatusBadgeProps = {
  status: string;
};

const toneByStatus: Record<string, string> = {
  active: 'success',
  approved: 'success',
  assigned: 'info',
  clear: 'success',
  completed: 'success',
  documents: 'warning',
  high: 'danger',
  live: 'info',
  published: 'success',
  ready: 'success',
  review: 'warning',
  scheduled: 'neutral',
  updated: 'info',
  verified: 'success',
  waivers: 'warning',
  watch: 'warning',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const tone = toneByStatus[normalized] ?? 'neutral';

  return (
    <span className={`status-badge status-badge--${tone}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
