import type { BracketNodePublic, MatchPublic, TeamPublic } from '../../lib/phase14-data.js';
import { formatDateTime, formatScore } from '../../lib/phase14-format.js';
import { StatusBadge } from './status-badge.js';

type BracketExplorerProps = {
  nodes: BracketNodePublic[];
  matches: MatchPublic[];
  teams: TeamPublic[];
};

function teamName(teamId: string | null, teams: TeamPublic[]) {
  if (!teamId) {
    return 'TBD';
  }

  return teams.find((team) => team.id === teamId)?.name ?? 'TBD';
}

function matchForNode(node: BracketNodePublic, matches: MatchPublic[]) {
  return matches.find((match) => match.id === node.matchId);
}

export function BracketExplorer({ nodes, matches, teams }: BracketExplorerProps) {
  const rounds = [...new Set(nodes.map((node) => node.round))].sort(
    (first, second) => first - second,
  );

  return (
    <section className="bracket-panel" aria-labelledby="interactive-bracket-title">
      <div className="section-heading">
        <div>
          <h2 id="interactive-bracket-title">Interactive bracket</h2>
          <p>Open each match to inspect source, status, score, venue, and advancement.</p>
        </div>
        <div className="segmented-control" aria-label="Bracket filters">
          <a href="#round-1">Round 1</a>
          <a href="#round-2">Final</a>
        </div>
      </div>

      <div className="bracket-grid">
        {rounds.map((round) => (
          <section className="bracket-round" id={`round-${round}`} key={round}>
            <h3>{round === 1 ? 'Semifinals' : 'Finals'}</h3>
            <div className="bracket-round__nodes">
              {nodes
                .filter((node) => node.round === round)
                .map((node) => {
                  const match = matchForNode(node, matches);

                  return (
                    <details className="bracket-node" key={node.id}>
                      <summary>
                        <span>
                          <strong>{node.label}</strong>
                          <small>{node.bracketSide}</small>
                        </span>
                        <span className="bracket-score">
                          {match ? formatScore(match.homeScore, match.awayScore) : 'Pending'}
                        </span>
                      </summary>
                      <div className="bracket-node__body">
                        <div className="match-teams">
                          <span>{teamName(node.homeTeamId, teams)}</span>
                          <span>{teamName(node.awayTeamId, teams)}</span>
                        </div>
                        <dl className="detail-list">
                          <div>
                            <dt>Status</dt>
                            <dd>{match ? <StatusBadge status={match.status} /> : 'Pending'}</dd>
                          </div>
                          <div>
                            <dt>Kickoff</dt>
                            <dd>{match ? formatDateTime(match.startsAt) : 'TBD'}</dd>
                          </div>
                          <div>
                            <dt>Venue</dt>
                            <dd>{match?.venue ?? 'TBD'}</dd>
                          </div>
                          <div>
                            <dt>Winner</dt>
                            <dd>{teamName(node.winnerTeamId, teams)}</dd>
                          </div>
                        </dl>
                        <button className="secondary-action" type="button">
                          View match details
                        </button>
                      </div>
                    </details>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
