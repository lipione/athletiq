import { AppShell } from '../../../../src/components/phase14/app-shell.js';
import { PublicTournamentView } from '../../../../src/components/phase14/public-tournament.js';
import { ErrorState } from '../../../../src/components/phase14/state.js';
import { getPublicTournamentPayload } from '../../../../src/lib/phase14-data.js';

type PublicTournamentPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicTournamentPage({ params }: PublicTournamentPageProps) {
  const { slug } = await params;
  const tournament = getPublicTournamentPayload(slug);

  if (!tournament) {
    return (
      <AppShell eyebrow="Public tournament" title="Tournament Center">
        <ErrorState
          message="This tournament is not published or the public slug is invalid."
          title="Tournament not found"
        />
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="Public tournament" title="Tournament Center">
      <PublicTournamentView tournament={tournament} />
    </AppShell>
  );
}
