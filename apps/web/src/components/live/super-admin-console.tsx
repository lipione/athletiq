'use client';

import {
  Activity,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarCheck,
  CircleAlert,
  ClipboardList,
  Flag,
  LogIn,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  jsonBody,
  liveApiBaseUrl,
  liveApiRequest,
  type LiveApiSession,
} from '../../lib/live-api.js';
import { StatusBadge } from '../phase14/status-badge.js';
import { BracketConsole } from './bracket-console.js';

type HealthStatus = {
  status: string;
  service: string;
};

type ReadinessStatus = {
  status: string;
  dependencies?: Record<string, { status: string; detail?: string }>;
  release?: Record<string, string>;
};

type School = {
  id: string;
  name: string;
  location?: string;
  status: string;
  adminUserIds?: string[];
};

type Tournament = {
  id: string;
  name: string;
  sport: string;
  format: string;
  status: string;
  registeredSchoolIds?: string[];
};

type Match = {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  submittedAt?: string;
  verifiedAt?: string;
};

type AuditLog = {
  id: string;
  actorUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  createdAt: string;
};

type UserSummary = {
  id: string;
  email: string;
  roles: string[];
  schoolIds: string[];
  createdAt: string;
};

type RegisterResponse = {
  user: LiveApiSession['user'];
};

type LoginResponse = {
  user: NonNullable<LiveApiSession['user']>;
  accessToken: string;
};

type ProvisionUserResponse = {
  user: UserSummary;
  temporaryPassword?: string;
};

type LoadState = {
  health?: HealthStatus;
  readiness?: ReadinessStatus;
  users: UserSummary[];
  schools: School[];
  tournaments: Tournament[];
  matches: Match[];
  audit: AuditLog[];
};

const devSuperAdmin = { id: 'usr_super_admin', role: 'super_admin' };
const sessionKey = 'athletiq.live.console.session';

const emptyState: LoadState = {
  users: [],
  schools: [],
  tournaments: [],
  matches: [],
  audit: [],
};

const inputClassName = 'live-input';

export function SuperAdminConsole() {
  const [session, setSession] = useState<LiveApiSession>({});
  const [data, setData] = useState<LoadState>(emptyState);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Ready to connect to the live ATHLETIQ API.');
  const [error, setError] = useState('');
  const [schoolForm, setSchoolForm] = useState({
    name: 'Live Demo School',
    location: 'Kathmandu',
  });
  const [tournamentForm, setTournamentForm] = useState({
    name: 'Live Demo Cup',
    sport: 'football',
    format: 'single_elimination',
    season: '2026',
  });
  const [authForm, setAuthForm] = useState({
    email: `operator_${Date.now()}@athletiq.local`,
    password: 'password123',
    role: 'school_admin',
  });
  const [provisionForm, setProvisionForm] = useState({
    email: `federation_${Date.now()}@athletiq.local`,
    password: '',
    role: 'federation_admin',
    schoolIds: '',
  });
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const requestOptions = useMemo(
    () => ({
      session,
      ...(session.accessToken ? {} : { devActor: devSuperAdmin }),
    }),
    [session],
  );

  const activeActor = session.user?.email ?? 'Dev super admin headers';

  useEffect(() => {
    const saved = window.localStorage.getItem(sessionKey);
    if (saved) {
      setSession(JSON.parse(saved) as LiveApiSession);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [session.accessToken]);

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
    await runAction('Live API data refreshed.', async () => {
      const [health, readiness, schools, tournaments, matches, audit] = await Promise.all([
        liveApiRequest<HealthStatus>('/health', {}, requestOptions),
        liveApiRequest<ReadinessStatus>('/health/readiness', {}, requestOptions),
        liveApiRequest<School[]>('/schools', {}, requestOptions),
        liveApiRequest<Tournament[]>('/tournaments', {}, requestOptions),
        liveApiRequest<Match[]>('/matches', {}, requestOptions),
        liveApiRequest<AuditLog[]>('/audit', {}, requestOptions),
      ]);
      const users = await liveApiRequest<UserSummary[]>('/auth/users', {}, requestOptions);
      setData({ health, readiness, users, schools, tournaments, matches, audit });
    });
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('User registered. You can log in with the same credentials.', async () => {
      await liveApiRequest<RegisterResponse>(
        '/auth/register',
        jsonBody({
          email: authForm.email,
          password: authForm.password,
          role: authForm.role,
        }),
      );
    });
  };

  const login = async () => {
    await runAction('Logged in with bearer token.', async () => {
      const result = await liveApiRequest<LoginResponse>(
        '/auth/login',
        jsonBody({ email: authForm.email, password: authForm.password }),
      );
      const nextSession = { user: result.user, accessToken: result.accessToken };
      window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
    });
  };

  const clearSession = () => {
    window.localStorage.removeItem(sessionKey);
    setSession({});
    setNotice('Session cleared. Using dev super admin headers again.');
  };

  const provisionUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('Platform role user provisioned.', async () => {
      const result = await liveApiRequest<ProvisionUserResponse>(
        '/auth/users',
        jsonBody({
          email: provisionForm.email,
          ...(provisionForm.password ? { password: provisionForm.password } : {}),
          roles: [provisionForm.role],
          schoolIds: provisionForm.schoolIds
            .split(',')
            .map((schoolId) => schoolId.trim())
            .filter(Boolean),
        }),
        requestOptions,
      );
      setTemporaryPassword(result.temporaryPassword ?? provisionForm.password);
      setProvisionForm({
        ...provisionForm,
        email: `${provisionForm.role}_${Date.now()}@athletiq.local`,
        password: '',
      });
      await refreshData();
    });
  };

  const createSchool = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('School created from the live API.', async () => {
      await liveApiRequest<School>('/schools', jsonBody(schoolForm), requestOptions);
      await refreshData();
    });
  };

  const approveSchool = async (schoolId: string) => {
    await runAction('School approved.', async () => {
      await liveApiRequest<School>(
        `/schools/${schoolId}/approve`,
        { method: 'POST' },
        { devActor: devSuperAdmin },
      );
      await refreshData();
    });
  };

  const createTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('Tournament created from the live API.', async () => {
      await liveApiRequest<Tournament>(
        '/tournaments',
        jsonBody({
          ...tournamentForm,
          maxTeams: 8,
        }),
        { devActor: devSuperAdmin },
      );
      await refreshData();
    });
  };

  const approveTournament = async (tournamentId: string) => {
    await runAction('Tournament approved.', async () => {
      await liveApiRequest<Tournament>(
        `/tournaments/${tournamentId}/approve`,
        { method: 'POST' },
        { devActor: devSuperAdmin },
      );
      await refreshData();
    });
  };

  const verifyMatch = async (matchId: string) => {
    await runAction('Match verified and downstream bracket state updated.', async () => {
      await liveApiRequest<Match>(`/matches/${matchId}/verify`, { method: 'POST' }, requestOptions);
      await refreshData();
    });
  };

  const approvedSchools = data.schools.filter((school) => school.status === 'approved').length;
  const approvedTournaments = data.tournaments.filter(
    (tournament) => tournament.status === 'approved',
  ).length;
  const pendingVerification = data.matches.filter((match) => match.status === 'played');
  const scheduledMatches = data.matches.filter((match) => match.status === 'scheduled').length;
  const verifiedMatches = data.matches.filter((match) => match.status === 'verified').length;

  return (
    <div className="stack">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Live backend console</p>
          <h2>Operate the running ATHLETIQ API from the browser</h2>
          <p>
            This workspace is wired to {liveApiBaseUrl()}. Create schools, approve records, create
            tournaments, inspect health, and verify audit logs against the local backend.
          </p>
        </div>
        <div className="live-action-group">
          <a className="secondary-action" href={`${liveApiBaseUrl()}/docs`} target="_blank">
            <BookOpen aria-hidden="true" size={18} />
            API docs
          </a>
          <button className="primary-action" disabled={busy} onClick={() => void refreshData()}>
            <RefreshCw aria-hidden="true" size={18} />
            Refresh
          </button>
        </div>
      </section>

      <section className="live-status-bar" aria-live="polite">
        <div>
          <ShieldCheck aria-hidden="true" size={18} />
          <span>{activeActor}</span>
        </div>
        <div>
          <Activity aria-hidden="true" size={18} />
          <span>{data.health?.status ?? 'checking'}</span>
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
        <article className="metric-tile">
          <div className="metric-tile__header">
            <span>API</span>
            <StatusBadge status={data.health?.status === 'ok' ? 'ready' : 'review'} />
          </div>
          <strong>{data.health?.service ?? 'athletiq-api'}</strong>
          <p>{data.readiness?.status ?? 'Readiness loading'}</p>
        </article>
        <article className="metric-tile">
          <div className="metric-tile__header">
            <span>Schools</span>
            <Building2 aria-hidden="true" size={18} />
          </div>
          <strong>{data.schools.length}</strong>
          <p>{approvedSchools} approved in this dev session</p>
        </article>
        <article className="metric-tile">
          <div className="metric-tile__header">
            <span>Tournaments</span>
            <Trophy aria-hidden="true" size={18} />
          </div>
          <strong>{data.tournaments.length}</strong>
          <p>{approvedTournaments} approved</p>
        </article>
        <article className="metric-tile">
          <div className="metric-tile__header">
            <span>Audit Events</span>
            <ClipboardList aria-hidden="true" size={18} />
          </div>
          <strong>{data.audit.length}</strong>
          <p>Newest platform actions</p>
        </article>
      </section>

      <section className="two-column">
        <form className="ops-panel live-form" onSubmit={provisionUser}>
          <div className="section-heading">
            <div>
              <h2>Platform Users</h2>
              <p>Provision federation, government, and operations accounts.</p>
            </div>
          </div>
          <label>
            Email
            <input
              className={inputClassName}
              onChange={(event) =>
                setProvisionForm({ ...provisionForm, email: event.target.value })
              }
              type="email"
              value={provisionForm.email}
            />
          </label>
          <label>
            Role
            <select
              className={inputClassName}
              onChange={(event) => setProvisionForm({ ...provisionForm, role: event.target.value })}
              value={provisionForm.role}
            >
              <option value="federation_admin">Federation admin</option>
              <option value="government_viewer">Government viewer</option>
              <option value="super_admin">Super admin</option>
              <option value="school_admin">School admin</option>
              <option value="coach">Coach</option>
              <option value="referee">Referee</option>
            </select>
          </label>
          <label>
            Temporary password
            <input
              className={inputClassName}
              onChange={(event) =>
                setProvisionForm({ ...provisionForm, password: event.target.value })
              }
              placeholder="Generated if blank"
              type="password"
              value={provisionForm.password}
            />
          </label>
          <label>
            School IDs
            <input
              className={inputClassName}
              onChange={(event) =>
                setProvisionForm({ ...provisionForm, schoolIds: event.target.value })
              }
              placeholder="Optional comma-separated IDs"
              value={provisionForm.schoolIds}
            />
          </label>
          <button className="primary-action" disabled={busy} type="submit">
            <ShieldCheck aria-hidden="true" size={18} />
            Provision user
          </button>
          {temporaryPassword ? (
            <p className="live-help-text">One-time password: {temporaryPassword}</p>
          ) : null}
        </form>

        <LiveList
          empty="No platform users have been provisioned yet."
          items={data.users}
          title="Role Users"
          render={(user) => (
            <>
              <span>
                <strong>{user.email}</strong>
                <small>{user.roles.join(', ')}</small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={user.roles.includes('super_admin') ? 'ready' : 'review'} />
                <small>{user.schoolIds.length} schools</small>
              </span>
            </>
          )}
        />
      </section>

      <section className="two-column">
        <form className="ops-panel live-form" onSubmit={register}>
          <div className="section-heading">
            <div>
              <h2>Auth</h2>
              <p>Register and log in with a real bearer token.</p>
            </div>
          </div>
          <label>
            Email
            <input
              className={inputClassName}
              onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
              type="email"
              value={authForm.email}
            />
          </label>
          <label>
            Password
            <input
              className={inputClassName}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              type="password"
              value={authForm.password}
            />
          </label>
          <label>
            Role
            <select
              className={inputClassName}
              onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}
              value={authForm.role}
            >
              <option value="school_admin">School admin</option>
              <option value="coach">Coach</option>
              <option value="referee">Referee</option>
              <option value="guardian">Guardian</option>
            </select>
          </label>
          <div className="live-action-group">
            <button className="secondary-action" disabled={busy} type="submit">
              <Plus aria-hidden="true" size={18} />
              Register
            </button>
            <button
              className="primary-action"
              disabled={busy}
              onClick={() => void login()}
              type="button"
            >
              <LogIn aria-hidden="true" size={18} />
              Login
            </button>
            <button className="icon-button" onClick={clearSession} type="button">
              Clear
            </button>
          </div>
        </form>

        <form className="ops-panel live-form" onSubmit={createSchool}>
          <div className="section-heading">
            <div>
              <h2>School Onboarding</h2>
              <p>Create a school, then approve it as super admin.</p>
            </div>
          </div>
          <label>
            School name
            <input
              className={inputClassName}
              onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })}
              value={schoolForm.name}
            />
          </label>
          <label>
            Location
            <input
              className={inputClassName}
              onChange={(event) => setSchoolForm({ ...schoolForm, location: event.target.value })}
              value={schoolForm.location}
            />
          </label>
          <button className="primary-action" disabled={busy} type="submit">
            <Plus aria-hidden="true" size={18} />
            Create school
          </button>
        </form>
      </section>

      <section className="two-column">
        <form className="ops-panel live-form" onSubmit={createTournament}>
          <div className="section-heading">
            <div>
              <h2>Tournament Setup</h2>
              <p>Create an approved tournament shell for brackets and scheduling.</p>
            </div>
          </div>
          <label>
            Name
            <input
              className={inputClassName}
              onChange={(event) =>
                setTournamentForm({ ...tournamentForm, name: event.target.value })
              }
              value={tournamentForm.name}
            />
          </label>
          <label>
            Format
            <select
              className={inputClassName}
              onChange={(event) =>
                setTournamentForm({ ...tournamentForm, format: event.target.value })
              }
              value={tournamentForm.format}
            >
              <option value="single_elimination">Single elimination</option>
              <option value="double_elimination">Double elimination</option>
              <option value="league">League</option>
              <option value="group_stage">Group stage</option>
            </select>
          </label>
          <button className="primary-action" disabled={busy} type="submit">
            <Plus aria-hidden="true" size={18} />
            Create tournament
          </button>
        </form>

        <div className="ops-panel">
          <div className="section-heading">
            <div>
              <h2>Readiness</h2>
              <p>Dependency state from the running API.</p>
            </div>
          </div>
          <ul className="signal-list signal-list--success">
            {Object.entries(data.readiness?.dependencies ?? {}).map(([key, dependency]) => (
              <li key={key}>
                <ShieldCheck aria-hidden="true" size={18} />
                <span>
                  <strong>{key}</strong>: {dependency.status}
                  {dependency.detail ? `, ${dependency.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="two-column">
        <div className="ops-panel">
          <div className="section-heading">
            <div>
              <h2>Tournament Operations Command Center</h2>
              <p>Match control, verification pressure, and scheduling state across tournaments.</p>
            </div>
          </div>
          <ul className="signal-list signal-list--success">
            <li>
              <CalendarCheck aria-hidden="true" size={18} />
              <span>{scheduledMatches} scheduled matches waiting for kickoff</span>
            </li>
            <li>
              <Flag aria-hidden="true" size={18} />
              <span>{pendingVerification.length} pending verification after score submission</span>
            </li>
            <li>
              <BadgeCheck aria-hidden="true" size={18} />
              <span>{verifiedMatches} verified matches feeding rankings and brackets</span>
            </li>
          </ul>
        </div>

        <LiveList
          empty="No match sheets are pending super-admin verification."
          items={pendingVerification.slice(0, 8)}
          title="Pending Verification"
          render={(match) => (
            <>
              <span>
                <strong>
                  {match.homeTeamId} vs {match.awayTeamId}
                </strong>
                <small>
                  {match.tournamentId} · {match.homeScore ?? '-'} - {match.awayScore ?? '-'}
                </small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={match.status} />
                <button
                  className="icon-button"
                  disabled={busy}
                  onClick={() => void verifyMatch(match.id)}
                  type="button"
                >
                  Verify
                </button>
              </span>
            </>
          )}
        />
      </section>

      <BracketConsole initialTournaments={data.tournaments} requestOptions={requestOptions} />

      <section className="two-column">
        <LiveList
          empty="No schools have been created yet."
          items={data.schools}
          title="Schools"
          render={(school) => (
            <>
              <span>
                <strong>{school.name}</strong>
                <small>{school.location ?? school.id}</small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={school.status} />
                {school.status !== 'approved' ? (
                  <button
                    className="icon-button"
                    disabled={busy}
                    onClick={() => void approveSchool(school.id)}
                    type="button"
                  >
                    Approve
                  </button>
                ) : null}
              </span>
            </>
          )}
        />
        <LiveList
          empty="No tournaments have been created yet."
          items={data.tournaments}
          title="Tournaments"
          render={(tournament) => (
            <>
              <span>
                <strong>{tournament.name}</strong>
                <small>
                  {tournament.sport} · {tournament.format}
                </small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={tournament.status} />
                {tournament.status !== 'approved' ? (
                  <button
                    className="icon-button"
                    disabled={busy}
                    onClick={() => void approveTournament(tournament.id)}
                    type="button"
                  >
                    Approve
                  </button>
                ) : null}
              </span>
            </>
          )}
        />
      </section>

      <LiveList
        empty="No audit events yet."
        items={data.audit.slice(0, 8)}
        title="Audit Trail"
        render={(entry) => (
          <>
            <span>
              <strong>{entry.action}</strong>
              <small>
                {entry.resource} · {entry.resourceId}
              </small>
            </span>
            <span className="live-row__meta">{new Date(entry.createdAt).toLocaleString()}</span>
          </>
        )}
      />
    </div>
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
    <section className="ops-panel">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{items.length > 0 ? `${items.length} live records` : empty}</p>
        </div>
      </div>
      <ul className="live-record-list">
        {items.map((item, index) => (
          <li key={index}>{render(item)}</li>
        ))}
      </ul>
    </section>
  );
}
