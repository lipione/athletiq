import type { MatchPublic, PublicTournament, StandingRow } from '../../lib/phase14-data.js';
import { formatDate, formatDateTime, formatScore } from '../../lib/phase14-format.js';
import { BracketExplorer } from './bracket-explorer.js';
import { DataTable, type DataTableColumn } from './data-table.js';
import { StatusBadge } from './status-badge.js';

function teamName(teamId: string, tournament: PublicTournament) {
  return tournament.teams.find((team) => team.id === teamId)?.name ?? 'TBD';
}

function fixtureColumns(tournament: PublicTournament): DataTableColumn<MatchPublic>[] {
  return [
    {
      header: 'Fixture',
      cell: (match) => (
        <span className="fixture-cell">
          {teamName(match.homeTeamId, tournament)} <span>vs</span>{' '}
          {teamName(match.awayTeamId, tournament)}
        </span>
      ),
    },
    { header: 'Round', cell: (match) => match.round },
    { header: 'Time', cell: (match) => formatDateTime(match.startsAt) },
    { header: 'Venue', cell: (match) => match.venue },
    { header: 'Score', cell: (match) => formatScore(match.homeScore, match.awayScore) },
    { header: 'Status', cell: (match) => <StatusBadge status={match.status} /> },
  ];
}

function standingColumns(tournament: PublicTournament): DataTableColumn<StandingRow>[] {
  return [
    { header: 'Rank', cell: (row) => row.rank },
    { header: 'Team', cell: (row) => teamName(row.teamId, tournament) },
    { header: 'Played', cell: (row) => row.played },
    { header: 'Wins', cell: (row) => row.wins },
    { header: 'Draws', cell: (row) => row.draws },
    { header: 'Losses', cell: (row) => row.losses },
    { header: 'Points', cell: (row) => row.points },
  ];
}

export function PublicTournamentView({ tournament }: { tournament: PublicTournament }) {
  return (
    <div className="stack">
      <section className="public-header">
        <div>
          <p className="eyebrow">
            {tournament.sport} · {tournament.ageGroup}
          </p>
          <h2>{tournament.name}</h2>
          <p>
            {tournament.location} · {formatDate(tournament.startsAt)} to{' '}
            {formatDate(tournament.endsAt)}
          </p>
        </div>
        <div className="public-header__status">
          <StatusBadge status={tournament.status} />
          <StatusBadge status={`schedule ${tournament.scheduleStatus}`} />
        </div>
      </section>

      <section className="team-strip" aria-label="Tournament teams">
        {tournament.teams.map((team) => (
          <article key={team.id}>
            <span>Seed {team.seed}</span>
            <strong>{team.name}</strong>
            <small>{team.schoolName}</small>
          </article>
        ))}
      </section>

      <DataTable
        caption="Fixtures And Results"
        columns={fixtureColumns(tournament)}
        description="Public match information; rosters and private athlete identifiers are not exposed."
        rowKey={(match) => match.id}
        rows={tournament.matches}
      />

      <BracketExplorer
        matches={tournament.matches}
        nodes={tournament.bracketNodes}
        teams={tournament.teams}
      />

      <DataTable
        caption="Standings"
        columns={standingColumns(tournament)}
        description="Verified public standings generated from official match results."
        rowKey={(row) => row.teamId}
        rows={tournament.standings}
      />
    </div>
  );
}
