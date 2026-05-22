'use client';

import { GitBranch, ListChecks, Plus, RefreshCw, Send, ShieldCheck, Shuffle } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import {
  createBracket,
  getBracketView,
  publishBracket,
  regenerateBracket,
  updateBracketSeeds,
  type BracketFormat,
  type BracketSeedInput,
  type BracketView,
} from '../../lib/brackets-api.js';
import type { LiveApiOptions } from '../../lib/live-api.js';
import { StatusBadge } from '../phase14/status-badge.js';

type TournamentOption = {
  id: string;
  name: string;
  sport: string;
  format: string;
  status: string;
};

type SeedDraft = {
  teamId: string;
  seedNumber: string;
  groupKey: string;
  locked: boolean;
  withdrawn: boolean;
};

type BracketConsoleProps = {
  requestOptions?: LiveApiOptions;
  initialTournaments?: TournamentOption[];
  initialView?: BracketView;
};

const bracketFormats: Array<{ label: string; value: BracketFormat }> = [
  { label: 'Single elimination', value: 'single_elimination' },
  { label: 'Double elimination', value: 'double_elimination' },
  { label: 'Round robin', value: 'round_robin' },
  { label: 'League', value: 'league' },
  { label: 'Group + knockout', value: 'group_stage_knockout' },
];

const emptySeed = (index: number): SeedDraft => ({
  teamId: '',
  seedNumber: String(index + 1),
  groupKey: '',
  locked: false,
  withdrawn: false,
});

const seedDraftFromRecord = (seed: BracketView['seeds'][number]): SeedDraft => ({
  teamId: seed.teamId,
  seedNumber: String(seed.seedNumber),
  groupKey: seed.groupKey ?? '',
  locked: seed.locked,
  withdrawn: seed.withdrawn,
});

const toSeedInputs = (seeds: SeedDraft[]): BracketSeedInput[] =>
  seeds
    .filter((seed) => seed.teamId.trim() && seed.seedNumber.trim())
    .map((seed) => ({
      teamId: seed.teamId.trim(),
      seedNumber: Number(seed.seedNumber),
      ...(seed.groupKey.trim() ? { groupKey: seed.groupKey.trim() } : {}),
      locked: seed.locked,
      withdrawn: seed.withdrawn,
    }));

const teamName = (view: BracketView | undefined, teamId: string | undefined) => {
  if (!teamId) {
    return 'TBD';
  }

  return view?.teams.find((team) => team.id === teamId)?.name ?? teamId;
};

const inputClassName = 'live-input';

export function BracketConsole({
  requestOptions = {},
  initialTournaments = [],
  initialView,
}: BracketConsoleProps) {
  const [view, setView] = useState<BracketView | undefined>(initialView);
  const [tournamentId, setTournamentId] = useState(
    initialView?.bracket.tournamentId ?? initialTournaments[0]?.id ?? '',
  );
  const [bracketId, setBracketId] = useState(initialView?.bracket.id ?? '');
  const [versionId, setVersionId] = useState('');
  const [format, setFormat] = useState<BracketFormat>(
    initialView?.bracket.format ?? 'single_elimination',
  );
  const [seeds, setSeeds] = useState<SeedDraft[]>(
    initialView?.seeds.length
      ? initialView.seeds.map(seedDraftFromRecord)
      : [0, 1, 2, 3].map(emptySeed),
  );
  const [regenerateNewVersion, setRegenerateNewVersion] = useState(true);
  const [notes, setNotes] = useState('Operations reseed');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    initialView ? `Loaded ${initialView.bracket.id}` : 'Ready for bracket operations.',
  );
  const [error, setError] = useState('');

  const selectedTournament = useMemo(
    () => initialTournaments.find((tournament) => tournament.id === tournamentId),
    [initialTournaments, tournamentId],
  );

  const seedInputs = useMemo(() => toSeedInputs(seeds), [seeds]);

  const runAction = async (label: string, action: () => Promise<BracketView>) => {
    setBusy(true);
    setError('');
    try {
      const nextView = await action();
      setView(nextView);
      setBracketId(nextView.bracket.id);
      setTournamentId(nextView.bracket.tournamentId);
      setFormat(nextView.bracket.format);
      setSeeds(nextView.seeds.map(seedDraftFromRecord));
      setNotice(label);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Bracket request failed');
    } finally {
      setBusy(false);
    }
  };

  const createOrGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('Bracket generated.', () =>
      createBracket(tournamentId, { format, seeds: seedInputs }, requestOptions),
    );
  };

  const updateSeeds = async () => {
    await runAction('Seeds updated and draft nodes regenerated.', () =>
      updateBracketSeeds(bracketId, seedInputs, requestOptions),
    );
  };

  const publish = async () => {
    await runAction('Bracket published.', () => publishBracket(bracketId, requestOptions));
  };

  const regenerate = async () => {
    await runAction('Bracket regenerated.', () =>
      regenerateBracket(
        bracketId,
        { createNewVersion: regenerateNewVersion, notes, seeds: seedInputs },
        requestOptions,
      ),
    );
  };

  const fetchView = async () => {
    await runAction('Bracket view fetched.', () =>
      getBracketView(bracketId, versionId.trim() || undefined, requestOptions),
    );
  };

  const addSeed = () => {
    setSeeds([...seeds, emptySeed(seeds.length)]);
  };

  const updateSeed = (index: number, nextSeed: SeedDraft) => {
    setSeeds(seeds.map((seed, seedIndex) => (seedIndex === index ? nextSeed : seed)));
  };

  const removeSeed = (index: number) => {
    setSeeds(seeds.filter((_, seedIndex) => seedIndex !== index));
  };

  return (
    <section className="ops-panel bracket-console" aria-labelledby="bracket-console-title">
      <div className="section-heading">
        <div>
          <h2 id="bracket-console-title">Bracket Operations</h2>
          <p>
            {view
              ? `${view.bracket.id} · version ${view.version.versionNumber}`
              : 'Create, seed, publish, regenerate, and inspect live bracket views.'}
          </p>
        </div>
        <div className="live-action-group">
          {view ? <StatusBadge status={view.bracket.status} /> : null}
          <button
            className="icon-button"
            disabled={busy || !bracketId}
            onClick={() => void fetchView()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={16} />
            Fetch view
          </button>
        </div>
      </div>

      <section className="live-status-bar bracket-console__status" aria-live="polite">
        <div>
          <GitBranch aria-hidden="true" size={18} />
          <span>{selectedTournament?.name ?? (tournamentId || 'No tournament selected')}</span>
        </div>
        {error ? (
          <div className="live-status-bar__error">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <div>
            <ListChecks aria-hidden="true" size={18} />
            <span>{notice}</span>
          </div>
        )}
      </section>

      <div className="bracket-console__grid">
        <form className="live-form bracket-console__controls" onSubmit={createOrGenerate}>
          <div className="section-heading">
            <div>
              <h2>Create / Generate</h2>
              <p>{seedInputs.length} prepared seed rows</p>
            </div>
          </div>
          <label>
            Tournament
            <select
              className={inputClassName}
              onChange={(event) => setTournamentId(event.target.value)}
              value={tournamentId}
            >
              {initialTournaments.length ? null : (
                <option value="">Enter tournament id below</option>
              )}
              {initialTournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tournament ID
            <input
              className={inputClassName}
              onChange={(event) => setTournamentId(event.target.value)}
              placeholder="tournament id"
              value={tournamentId}
            />
          </label>
          <label>
            Format
            <select
              className={inputClassName}
              onChange={(event) => setFormat(event.target.value as BracketFormat)}
              value={format}
            >
              {bracketFormats.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary-action"
            disabled={busy || !tournamentId || seedInputs.length === 0}
            type="submit"
          >
            <Plus aria-hidden="true" size={18} />
            Generate bracket
          </button>
        </form>

        <div className="live-form bracket-console__controls">
          <div className="section-heading">
            <div>
              <h2>Publish / Regenerate</h2>
              <p>{bracketId || 'Select or create a bracket first'}</p>
            </div>
          </div>
          <label>
            Bracket ID
            <input
              className={inputClassName}
              onChange={(event) => setBracketId(event.target.value)}
              placeholder="bracket id"
              value={bracketId}
            />
          </label>
          <label>
            Version ID
            <input
              className={inputClassName}
              onChange={(event) => setVersionId(event.target.value)}
              placeholder="optional version id"
              value={versionId}
            />
          </label>
          <label>
            Notes
            <input
              className={inputClassName}
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
          <label className="bracket-console__check">
            <input
              checked={regenerateNewVersion}
              onChange={(event) => setRegenerateNewVersion(event.target.checked)}
              type="checkbox"
            />
            Create new version on regenerate
          </label>
          <div className="live-action-group">
            <button
              className="secondary-action"
              disabled={busy || !bracketId}
              onClick={() => void updateSeeds()}
              type="button"
            >
              <ListChecks aria-hidden="true" size={18} />
              Update seeds
            </button>
            <button
              className="secondary-action"
              disabled={busy || !bracketId}
              onClick={() => void regenerate()}
              type="button"
            >
              <Shuffle aria-hidden="true" size={18} />
              Regenerate
            </button>
            <button
              className="primary-action"
              disabled={busy || !bracketId}
              onClick={() => void publish()}
              type="button"
            >
              <Send aria-hidden="true" size={18} />
              Publish
            </button>
          </div>
        </div>
      </div>

      <section className="bracket-console__table-block">
        <div className="section-heading">
          <div>
            <h2>Seed Rows</h2>
            <p>Team IDs, seed numbers, group keys, locks, and withdrawals.</p>
          </div>
          <button className="icon-button" onClick={addSeed} type="button">
            <Plus aria-hidden="true" size={16} />
            Row
          </button>
        </div>
        <div className="table-scroll">
          <table className="bracket-console__table">
            <thead>
              <tr>
                <th>Team ID</th>
                <th>Seed</th>
                <th>Group</th>
                <th>Locked</th>
                <th>Withdrawn</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {seeds.map((seed, index) => (
                <tr key={index}>
                  <td>
                    <input
                      className={inputClassName}
                      onChange={(event) =>
                        updateSeed(index, { ...seed, teamId: event.target.value })
                      }
                      value={seed.teamId}
                    />
                  </td>
                  <td>
                    <input
                      className={inputClassName}
                      min="1"
                      onChange={(event) =>
                        updateSeed(index, { ...seed, seedNumber: event.target.value })
                      }
                      type="number"
                      value={seed.seedNumber}
                    />
                  </td>
                  <td>
                    <input
                      className={inputClassName}
                      onChange={(event) =>
                        updateSeed(index, { ...seed, groupKey: event.target.value })
                      }
                      value={seed.groupKey}
                    />
                  </td>
                  <td>
                    <input
                      checked={seed.locked}
                      onChange={(event) =>
                        updateSeed(index, { ...seed, locked: event.target.checked })
                      }
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <input
                      checked={seed.withdrawn}
                      onChange={(event) =>
                        updateSeed(index, { ...seed, withdrawn: event.target.checked })
                      }
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <button className="icon-button" onClick={() => removeSeed(index)} type="button">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="bracket-console__view">
        <section className="bracket-console__table-block">
          <div className="section-heading">
            <div>
              <h2>Nodes</h2>
              <p>{view?.nodes.length ?? 0} generated bracket nodes</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="bracket-console__table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Slot</th>
                  <th>Home</th>
                  <th>Away</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(view?.nodes ?? []).map((node) => (
                  <tr key={node.id}>
                    <td>Round {node.round}</td>
                    <td>
                      {node.bracketSide} · {node.position}
                    </td>
                    <td>{teamName(view, node.homeTeamId)}</td>
                    <td>{teamName(view, node.awayTeamId)}</td>
                    <td>
                      <StatusBadge status={node.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bracket-console__table-block">
          <div className="section-heading">
            <div>
              <h2>Standings</h2>
              <p>{view?.standings.length ?? 0} ranked rows</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="bracket-console__table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Group</th>
                  <th>Pts</th>
                  <th>GD</th>
                  <th>Discipline</th>
                </tr>
              </thead>
              <tbody>
                {(view?.standings ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.rank}</td>
                    <td>{teamName(view, row.teamId)}</td>
                    <td>{row.groupKey}</td>
                    <td>{row.points}</td>
                    <td>{row.goalDifference}</td>
                    <td>{row.disciplinaryPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bracket-console__table-block">
          <div className="section-heading">
            <div>
              <h2>Teams</h2>
              <p>{view?.teams.length ?? 0} teams in view</p>
            </div>
          </div>
          <ul className="live-record-list bracket-console__team-list">
            {(view?.teams ?? []).map((team) => (
              <li key={team.id}>
                <span>
                  <strong>{team.name}</strong>
                  <small>{team.id}</small>
                </span>
                <span className="live-row__meta">{team.schoolId}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
