'use client';

import {
  Activity,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CircleAlert,
  ClipboardList,
  Database,
  FileText,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { jsonBody, liveApiBaseUrl, liveApiRequest } from '../../lib/live-api.js';
import { StatusBadge } from '../phase14/status-badge.js';

type AnalyticsMode = 'federation' | 'government';

type Overview = {
  schools: number;
  tournaments: number;
  athletes: number;
  verifiedAthletes: number;
};

type Participation = {
  tournamentId: string | null;
  totalAthletes: number;
  schoolsParticipating: number;
  schoolStats: Array<{
    schoolId: string;
    schoolName: string;
    totalAthletes: number;
    verifiedAthletes: number;
  }>;
};

type Ranking = {
  rank: number;
  athleteId: string;
  athleteName: string;
  schoolName: string;
  metric: string;
  value: number;
};

type Rankings = {
  scope: string;
  sport: string;
  metric: string;
  entries: Ranking[];
};

type Quality = {
  score: number;
  checks: Array<{
    key: string;
    label: string;
    passed: number;
    total: number;
    score: number;
    status: string;
  }>;
  nextActions: string[];
};

type Readiness = {
  status: string;
  service: string;
  checkedAt: string;
  checks?: Record<string, { status: string; detail?: string }>;
  dependencies?: Record<string, { status: string; detail?: string }>;
};

type Tournament = {
  id: string;
  name: string;
  sport: string;
  status: string;
};

type DataProducts = {
  exports: Array<{
    key: string;
    label: string;
    format: string;
    endpoint: string;
    audience: string;
  }>;
};

type TournamentExport = {
  tournamentId: string;
  tournamentName: string;
  exportedAt: string;
  totalTeams: number;
  leaderboard: unknown[];
};

type ReportDraft = {
  id: string;
  reportType: string;
  status: string;
  sections?: Array<{ title: string }>;
};

type AnalyticsState = {
  overview?: Overview;
  participation?: Participation;
  rankings?: Rankings;
  quality?: Quality;
  readiness?: Readiness;
  tournaments: Tournament[];
  dataProducts?: DataProducts;
  tournamentExport?: TournamentExport;
  reportDraft?: ReportDraft;
};

const devSuperAdmin = { id: 'usr_super_admin', role: 'super_admin' };

const emptyState: AnalyticsState = {
  tournaments: [],
};

export function AnalyticsConsole({ mode }: { mode: AnalyticsMode }) {
  const [data, setData] = useState<AnalyticsState>(emptyState);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Ready to load live analytics.');
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('goals');

  const requestOptions = useMemo(() => ({ devActor: devSuperAdmin }), []);
  const isGovernment = mode === 'government';
  const title = isGovernment
    ? 'Live government intelligence workspace'
    : 'Live federation workspace';
  const summary = isGovernment
    ? 'Province-scale participation, readiness, and data quality without operational write controls.'
    : 'Federation oversight for participation, rankings, exports, and AI report draft review.';

  useEffect(() => {
    void refreshData();
  }, [metric]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setNotice(label);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const refreshData = async () => {
    await runAction('Live analytics refreshed.', async () => {
      const [overview, participation, rankings, quality, readiness, tournaments, dataProducts] =
        await Promise.all([
          liveApiRequest<Overview>('/analytics/federation/overview', {}, requestOptions),
          liveApiRequest<Participation>('/analytics/federation/participation', {}, requestOptions),
          liveApiRequest<Rankings>(
            `/analytics/rankings?metric=${encodeURIComponent(metric)}&limit=10`,
            {},
            requestOptions,
          ),
          liveApiRequest<Quality>('/analytics/data-quality', {}, requestOptions),
          liveApiRequest<Readiness>('/health/readiness', {}, requestOptions),
          liveApiRequest<Tournament[]>('/tournaments', {}, requestOptions),
          liveApiRequest<DataProducts>('/analytics/data-products/exports', {}, requestOptions),
        ]);
      setData((current) => ({
        ...current,
        overview,
        participation,
        rankings,
        quality,
        readiness,
        tournaments,
        dataProducts,
      }));
    });
  };

  const exportTournament = async () => {
    const tournament = data.tournaments.find((item) => item.status !== 'draft');
    if (!tournament) {
      setError('Create and approve a tournament before exporting federation data.');
      return;
    }

    await runAction('Tournament export generated.', async () => {
      const tournamentExport = await liveApiRequest<TournamentExport>(
        `/analytics/tournaments/${tournament.id}/export`,
        {},
        requestOptions,
      );
      setData((current) => ({ ...current, tournamentExport }));
    });
  };

  const createReportDraft = async () => {
    await runAction('AI analytics report draft created for review.', async () => {
      const reportDraft = await liveApiRequest<ReportDraft>(
        '/analytics/reports/drafts',
        jsonBody({
          reportType: 'federation_summary',
          scope: mode,
          locale: 'en',
        }),
        requestOptions,
      );
      setData((current) => ({ ...current, reportDraft }));
    });
  };

  return (
    <div className="stack">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{summary}</h2>
          <p>
            This workspace reads live records from {liveApiBaseUrl()} through the current analytics,
            readiness, tournaments, and data product APIs.
          </p>
        </div>
        <div className="live-action-group">
          <a className="secondary-action" href={`${liveApiBaseUrl()}/docs`} target="_blank">
            <BookOpen aria-hidden="true" size={18} />
            API docs
          </a>
          {!isGovernment ? (
            <>
              <button
                className="secondary-action"
                disabled={busy}
                onClick={() => void exportTournament()}
              >
                <Database aria-hidden="true" size={18} />
                Export
              </button>
              <button
                className="secondary-action"
                disabled={busy}
                onClick={() => void createReportDraft()}
              >
                <FileText aria-hidden="true" size={18} />
                Draft report
              </button>
            </>
          ) : null}
          <button className="primary-action" disabled={busy} onClick={() => void refreshData()}>
            <RefreshCw aria-hidden="true" size={18} />
            Refresh
          </button>
        </div>
      </section>

      <section className="live-status-bar" aria-live="polite">
        <div>
          <ShieldCheck aria-hidden="true" size={18} />
          <span>Dev analytics actor</span>
        </div>
        <div>
          <Activity aria-hidden="true" size={18} />
          <span>{data.readiness?.status ?? 'checking'}</span>
        </div>
        {error ? (
          <div className="live-status-bar__error">
            <CircleAlert aria-hidden="true" size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <div>
            <BadgeCheck aria-hidden="true" size={18} />
            <span>{notice}</span>
          </div>
        )}
      </section>

      <section className="metric-strip">
        <Metric title="Schools" value={data.overview?.schools ?? 0} icon={<Users size={18} />} />
        <Metric
          title="Athletes"
          value={data.overview?.athletes ?? 0}
          detail={`${data.overview?.verifiedAthletes ?? 0} verified`}
          icon={<BadgeCheck size={18} />}
        />
        <Metric
          title="Tournaments"
          value={data.overview?.tournaments ?? 0}
          detail={`${data.participation?.schoolsParticipating ?? 0} schools participating`}
          icon={<Trophy size={18} />}
        />
        <Metric
          title="Quality"
          value={`${data.quality?.score ?? 100}%`}
          detail={data.quality?.nextActions[0] ?? 'No urgent actions'}
          icon={<BarChart3 size={18} />}
        />
      </section>

      <section className="two-column">
        <div className="ops-panel live-form">
          <div className="section-heading">
            <div>
              <h2>{isGovernment ? 'Aggregate Participation' : 'Participation Intelligence'}</h2>
              <p>{data.participation?.totalAthletes ?? 0} athletes represented in live records.</p>
            </div>
          </div>
          <LiveList
            empty="No school participation data yet."
            items={(data.participation?.schoolStats ?? []).slice(0, 8)}
            render={(school) => (
              <>
                <span>
                  <strong>{school.schoolName}</strong>
                  <small>{school.totalAthletes} athletes</small>
                </span>
                <span className="live-row__actions">
                  <StatusBadge status={`${school.verifiedAthletes} verified`} />
                </span>
              </>
            )}
            title="Schools"
          />
        </div>

        <div className="ops-panel live-form">
          <div className="section-heading">
            <div>
              <h2>{isGovernment ? 'Data Quality' : 'Federation Rankings'}</h2>
              <p>
                {isGovernment
                  ? 'Operational quality checks for policy and planning.'
                  : 'Verified match-event leaderboards.'}
              </p>
            </div>
          </div>
          {!isGovernment ? (
            <label>
              Metric
              <select
                className="live-input"
                onChange={(event) => setMetric(event.target.value)}
                value={metric}
              >
                <option value="goals">Goals</option>
                <option value="assists">Assists</option>
                <option value="matchesPlayed">Matches played</option>
              </select>
            </label>
          ) : null}
          {isGovernment ? (
            <ul className="signal-list signal-list--success">
              {(data.quality?.checks ?? []).map((check) => (
                <li key={check.key}>
                  <ClipboardList aria-hidden="true" size={18} />
                  <span>
                    <strong>{check.label}</strong>: {check.score}% ({check.passed}/{check.total})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <LiveList
              empty="No ranking entries yet. Submit and verify match events first."
              items={data.rankings?.entries ?? []}
              render={(entry) => (
                <>
                  <span>
                    <strong>
                      #{entry.rank} {entry.athleteName}
                    </strong>
                    <small>{entry.schoolName}</small>
                  </span>
                  <span className="live-row__actions">
                    <StatusBadge status={`${entry.value} ${entry.metric}`} />
                  </span>
                </>
              )}
              title="Leaderboard"
            />
          )}
        </div>
      </section>

      <section className="two-column">
        <LiveList
          empty="No approved tournaments are available yet."
          items={data.tournaments.filter((tournament) => tournament.status !== 'draft').slice(0, 8)}
          render={(tournament) => (
            <>
              <span>
                <strong>{tournament.name}</strong>
                <small>{tournament.sport}</small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={tournament.status} />
              </span>
            </>
          )}
          title="Governed Tournaments"
        />
        <LiveList
          empty="No data products are configured."
          items={data.dataProducts?.exports ?? []}
          render={(product) => (
            <>
              <span>
                <strong>{product.label}</strong>
                <small>{product.endpoint}</small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={product.format} />
              </span>
            </>
          )}
          title={isGovernment ? 'Available Public Data Products' : 'Federation Data Products'}
        />
      </section>

      {!isGovernment ? (
        <section className="two-column">
          <LiveList
            empty="Generate a tournament export to inspect the bundle summary."
            items={data.tournamentExport ? [data.tournamentExport] : []}
            render={(item) => (
              <>
                <span>
                  <strong>{item.tournamentName}</strong>
                  <small>{item.exportedAt}</small>
                </span>
                <span className="live-row__actions">
                  <StatusBadge status={`${item.totalTeams} teams`} />
                </span>
              </>
            )}
            title="Latest Export"
          />
          <LiveList
            empty="Create a report draft to inspect the AI review artifact."
            items={data.reportDraft ? [data.reportDraft] : []}
            render={(draft) => (
              <>
                <span>
                  <strong>{draft.reportType}</strong>
                  <small>{draft.sections?.length ?? 0} sections</small>
                </span>
                <span className="live-row__actions">
                  <StatusBadge status={draft.status} />
                </span>
              </>
            )}
            title="AI Report Draft"
          />
        </section>
      ) : null}
    </div>
  );
}

function Metric({
  detail,
  icon,
  title,
  value,
}: {
  detail?: string;
  icon: ReactNode;
  title: string;
  value: number | string;
}) {
  return (
    <article className="metric-tile">
      <div className="metric-tile__header">
        <span>{title}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{detail ?? 'Live backend value'}</p>
    </article>
  );
}

function LiveList<T>({
  empty,
  items,
  render,
  title,
}: {
  empty: string;
  items: T[];
  render: (item: T) => ReactNode;
  title: string;
}) {
  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{items.length} live records</p>
        </div>
      </div>
      {items.length ? (
        <ul className="live-record-list">
          {items.map((item, index) => (
            <li key={index}>{render(item)}</li>
          ))}
        </ul>
      ) : (
        <p className="live-row__meta">{empty}</p>
      )}
    </div>
  );
}
