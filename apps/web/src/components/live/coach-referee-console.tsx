'use client';

import {
  Activity,
  BadgeCheck,
  BookOpen,
  CalendarClock,
  CircleAlert,
  ClipboardCheck,
  Flag,
  Goal,
  IdCard,
  LogIn,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  jsonBody,
  liveApiBaseUrl,
  liveApiRequest,
  type LiveApiSession,
} from '../../lib/live-api.js';
import { StatusBadge } from '../phase14/status-badge.js';

type HealthStatus = {
  status: string;
  service: string;
};

type LoginResponse = {
  user: NonNullable<LiveApiSession['user']>;
  accessToken: string;
};

type School = {
  id: string;
  name: string;
  status: string;
};

type Athlete = {
  id: string;
  schoolId: string;
  fullName: string;
  status: string;
  athletiqId?: string;
};

type Tournament = {
  id: string;
  name: string;
  sport: string;
  format: string;
  status: string;
  schoolIds?: string[];
  teamIds?: string[];
  matchIds?: string[];
};

type Team = {
  id: string;
  tournamentId: string;
  schoolId: string;
  name: string;
  athleteIds: string[];
  status: string;
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
  stats?: MatchStats;
};

type MatchEventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'foul' | 'own_goal';

type MatchEvent = {
  id: string;
  matchId: string;
  athleteId: string;
  teamId: string;
  type: MatchEventType;
  minute?: number;
  quantity: number;
  status: string;
};

type MatchStats = {
  matchId: string;
  totals: {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    fouls: number;
    ownGoals: number;
  };
  athleteStats: Array<{
    athleteId: string;
    teamId: string;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    fouls: number;
    ownGoals: number;
  }>;
  teamStats: Array<{
    teamId: string;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    fouls: number;
    ownGoals: number;
  }>;
};

type FixtureState = {
  tournament?: Tournament;
  schools: School[];
  athletes: Athlete[];
  teams: Team[];
  match?: Match;
  events: MatchEvent[];
  stats?: MatchStats;
};

const devSuperAdmin = { id: 'usr_super_admin', role: 'super_admin' };
const sessionKey = 'athletiq.official.console.session';
const inputClassName = 'live-input';

const emptyFixture: FixtureState = {
  schools: [],
  athletes: [],
  teams: [],
  events: [],
};

export function CoachRefereeConsole() {
  const [session, setSession] = useState<LiveApiSession>({});
  const [health, setHealth] = useState<HealthStatus>();
  const [fixture, setFixture] = useState<FixtureState>(emptyFixture);
  const [matches, setMatches] = useState<Match[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Seed a live match, then run score and stat operations.');
  const [error, setError] = useState('');
  const [authForm, setAuthForm] = useState({
    email: `referee_${Date.now()}@athletiq.local`,
    password: 'password123',
    role: 'referee',
  });
  const [resultForm, setResultForm] = useState({
    homeScore: 2,
    awayScore: 1,
    notes: 'Live console score submitted by official.',
  });
  const [eventForm, setEventForm] = useState({
    athleteId: '',
    teamId: '',
    type: 'goal' as MatchEventType,
    minute: 12,
    quantity: 1,
  });

  const requestOptions = useMemo(
    () => ({
      session,
      ...(session.accessToken ? {} : { devActor: devSuperAdmin }),
    }),
    [session],
  );

  const activeActor = session.user?.email ?? 'Preview mode with dev helper headers';
  const currentMatch = fixture.match;
  const homeTeam = fixture.teams.find((team) => team.id === currentMatch?.homeTeamId);
  const awayTeam = fixture.teams.find((team) => team.id === currentMatch?.awayTeamId);
  const selectedAthlete = fixture.athletes.find((athlete) => athlete.id === eventForm.athleteId);
  const selectedTeam = fixture.teams.find((team) => team.id === eventForm.teamId);

  useEffect(() => {
    const saved = window.localStorage.getItem(sessionKey);
    if (saved) {
      setSession(JSON.parse(saved) as LiveApiSession);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [session.accessToken]);

  useEffect(() => {
    const athlete = fixture.athletes[0];
    const team = fixture.teams[0];
    if (athlete && !eventForm.athleteId) {
      setEventForm((current) => ({ ...current, athleteId: athlete.id }));
    }
    if (team && !eventForm.teamId) {
      setEventForm((current) => ({ ...current, teamId: team.id }));
    }
  }, [eventForm.athleteId, eventForm.teamId, fixture.athletes, fixture.teams]);

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
    await runAction('Official workspace data refreshed.', async () => {
      const [nextHealth, nextMatches] = await Promise.all([
        liveApiRequest<HealthStatus>('/health', {}, requestOptions),
        liveApiRequest<Match[]>('/matches', {}, requestOptions),
      ]);
      setHealth(nextHealth);
      setMatches(nextMatches);
      if (fixture.match) {
        await refreshMatchArtifacts(fixture.match.id);
      }
    });
  };

  const registerAndLogin = async (
    email: string,
    password: string,
    role: string,
  ): Promise<LiveApiSession> => {
    await liveApiRequest('/auth/register', jsonBody({ email, password, role }));
    const login = await liveApiRequest<LoginResponse>('/auth/login', jsonBody({ email, password }));
    return { user: login.user, accessToken: login.accessToken };
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      'Official account registered. Use Login to receive a bearer token.',
      async () => {
        await liveApiRequest('/auth/register', jsonBody(authForm));
      },
    );
  };

  const login = async () => {
    await runAction('Logged in as live official.', async () => {
      const nextSession = await registerAndLoginIfNeeded();
      window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
    });
  };

  const registerAndLoginIfNeeded = async () => {
    try {
      return await registerAndLogin(authForm.email, authForm.password, authForm.role);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      if (!message.includes('Email already exists')) {
        throw caught;
      }
      const loginResult = await liveApiRequest<LoginResponse>(
        '/auth/login',
        jsonBody({ email: authForm.email, password: authForm.password }),
      );
      return { user: loginResult.user, accessToken: loginResult.accessToken };
    }
  };

  const clearSession = () => {
    window.localStorage.removeItem(sessionKey);
    setSession({});
    setNotice('Session cleared. The console can still preview with dev helper headers.');
  };

  const seedMatchFixture = async () => {
    await runAction('Live match fixture seeded.', async () => {
      const suffix = Date.now();
      const password = 'password123';
      const schoolAdminA = await registerAndLogin(
        `fixture_school_a_${suffix}@athletiq.local`,
        password,
        'school_admin',
      );
      const schoolAdminB = await registerAndLogin(
        `fixture_school_b_${suffix}@athletiq.local`,
        password,
        'school_admin',
      );

      const [schoolA, schoolB] = await Promise.all([
        liveApiRequest<School>(
          '/schools',
          jsonBody({ name: `Official Demo North ${suffix}`, location: 'Kathmandu' }),
          { session: schoolAdminA },
        ),
        liveApiRequest<School>(
          '/schools',
          jsonBody({ name: `Official Demo South ${suffix}`, location: 'Lalitpur' }),
          { session: schoolAdminB },
        ),
      ]);

      await Promise.all([
        liveApiRequest<School>(
          `/schools/${schoolA.id}/approve`,
          { method: 'POST' },
          { devActor: devSuperAdmin },
        ),
        liveApiRequest<School>(
          `/schools/${schoolB.id}/approve`,
          { method: 'POST' },
          { devActor: devSuperAdmin },
        ),
      ]);

      const tournament = await liveApiRequest<Tournament>(
        '/tournaments',
        jsonBody({
          name: `Official Live Cup ${suffix}`,
          sport: 'football',
          format: 'league',
          maxTeams: 8,
        }),
        { devActor: devSuperAdmin },
      );
      const approvedTournament = await liveApiRequest<Tournament>(
        `/tournaments/${tournament.id}/approve`,
        { method: 'POST' },
        { devActor: devSuperAdmin },
      );

      await Promise.all([
        liveApiRequest<Tournament>(
          `/tournaments/${tournament.id}/register-school`,
          jsonBody({ schoolId: schoolA.id }),
          { session: schoolAdminA },
        ),
        liveApiRequest<Tournament>(
          `/tournaments/${tournament.id}/register-school`,
          jsonBody({ schoolId: schoolB.id }),
          { session: schoolAdminB },
        ),
      ]);

      const [athleteDraftA, athleteDraftB] = await Promise.all([
        liveApiRequest<Athlete>(
          '/athletes/drafts',
          jsonBody({
            schoolId: schoolA.id,
            fullName: 'Nima Rai',
            dateOfBirth: '2011-03-10',
            gender: 'female',
          }),
          { session: schoolAdminA },
        ),
        liveApiRequest<Athlete>(
          '/athletes/drafts',
          jsonBody({
            schoolId: schoolB.id,
            fullName: 'Rajan Thapa',
            dateOfBirth: '2010-08-20',
            gender: 'male',
          }),
          { session: schoolAdminB },
        ),
      ]);

      const [athleteA, athleteB] = await Promise.all([
        liveApiRequest<Athlete>(
          `/athletes/${athleteDraftA.id}/identity/approve`,
          { method: 'POST' },
          { devActor: devSuperAdmin },
        ),
        liveApiRequest<Athlete>(
          `/athletes/${athleteDraftB.id}/identity/approve`,
          { method: 'POST' },
          { devActor: devSuperAdmin },
        ),
      ]);

      const [teamA, teamB] = await Promise.all([
        liveApiRequest<Team>(
          '/teams',
          jsonBody({
            tournamentId: tournament.id,
            schoolId: schoolA.id,
            name: 'North XI',
            athleteIds: [athleteA.id],
          }),
          { session: schoolAdminA },
        ),
        liveApiRequest<Team>(
          '/teams',
          jsonBody({
            tournamentId: tournament.id,
            schoolId: schoolB.id,
            name: 'South XI',
            athleteIds: [athleteB.id],
          }),
          { session: schoolAdminB },
        ),
      ]);

      const match = await liveApiRequest<Match>(
        '/matches',
        jsonBody({
          tournamentId: tournament.id,
          homeTeamId: teamA.id,
          awayTeamId: teamB.id,
          scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
        { devActor: devSuperAdmin },
      );

      setFixture({
        tournament: approvedTournament,
        schools: [schoolA, schoolB],
        athletes: [athleteA, athleteB],
        teams: [teamA, teamB],
        match,
        events: [],
      });
      setEventForm((current) => ({
        ...current,
        athleteId: athleteA.id,
        teamId: teamA.id,
      }));
      setMatches((current) => [match, ...current.filter((item) => item.id !== match.id)]);
    });
  };

  const refreshMatchArtifacts = async (matchId: string) => {
    const [match, events, stats] = await Promise.all([
      liveApiRequest<Match>(`/matches/${matchId}`, {}, requestOptions),
      liveApiRequest<MatchEvent[]>(`/matches/${matchId}/events`, {}, requestOptions),
      liveApiRequest<MatchStats | undefined>(`/matches/${matchId}/stats`, {}, requestOptions),
    ]);
    setFixture((current) => ({
      ...current,
      match,
      events,
      ...(stats ? { stats } : {}),
    }));
  };

  const submitEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentMatch) {
      setError('Seed a match fixture before submitting events.');
      return;
    }

    await runAction('Match event submitted and stats recalculated.', async () => {
      await liveApiRequest<MatchEvent>(
        `/matches/${currentMatch.id}/events`,
        jsonBody({
          athleteId: eventForm.athleteId,
          teamId: eventForm.teamId,
          type: eventForm.type,
          minute: Number(eventForm.minute),
          quantity: Number(eventForm.quantity),
        }),
        requestOptions,
      );
      await refreshMatchArtifacts(currentMatch.id);
    });
  };

  const submitResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentMatch) {
      setError('Seed a match fixture before submitting a result.');
      return;
    }

    await runAction('Match result submitted.', async () => {
      await liveApiRequest<Match>(
        `/matches/${currentMatch.id}/submit-result`,
        jsonBody({
          homeScore: Number(resultForm.homeScore),
          awayScore: Number(resultForm.awayScore),
          notes: resultForm.notes,
          sportStats: {
            source: 'coach_referee_live_console',
          },
        }),
        requestOptions,
      );
      await refreshMatchArtifacts(currentMatch.id);
    });
  };

  const verifyMatch = async () => {
    if (!currentMatch) {
      setError('Seed a match fixture before verification.');
      return;
    }

    await runAction('Match verified by dev super admin helper.', async () => {
      await liveApiRequest<Match>(
        `/matches/${currentMatch.id}/verify`,
        { method: 'POST' },
        { devActor: devSuperAdmin },
      );
      await refreshMatchArtifacts(currentMatch.id);
    });
  };

  return (
    <div className="stack">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Live coach and referee workspace</p>
          <h2>Operate match sheets, score submission, stat capture, and verification</h2>
          <p>
            This console is wired to {liveApiBaseUrl()}. It creates a valid live fixture through
            school, athlete, team, tournament, and match APIs before officials submit results.
          </p>
        </div>
        <div className="live-action-group">
          <a className="secondary-action" href={`${liveApiBaseUrl()}/docs`} target="_blank">
            <BookOpen aria-hidden="true" size={18} />
            API docs
          </a>
          <button
            className="secondary-action"
            disabled={busy}
            onClick={() => void seedMatchFixture()}
          >
            <Plus aria-hidden="true" size={18} />
            Seed match
          </button>
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
          <span>{health?.status ?? 'checking'}</span>
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
            <span>Current Match</span>
            <CalendarClock aria-hidden="true" size={18} />
          </div>
          <strong>{currentMatch ? currentMatch.id : 'Not seeded'}</strong>
          <p>
            {currentMatch
              ? `${homeTeam?.name ?? 'Home'} vs ${awayTeam?.name ?? 'Away'}`
              : 'Create a fixture'}
          </p>
        </article>
        <article className="metric-tile">
          <div className="metric-tile__header">
            <span>Status</span>
            <Flag aria-hidden="true" size={18} />
          </div>
          <strong>{currentMatch?.status ?? 'idle'}</strong>
          <p>
            {currentMatch?.homeScore ?? '-'} - {currentMatch?.awayScore ?? '-'}
          </p>
        </article>
        <article className="metric-tile">
          <div className="metric-tile__header">
            <span>Events</span>
            <Goal aria-hidden="true" size={18} />
          </div>
          <strong>{fixture.events.length}</strong>
          <p>{fixture.stats?.totals.goals ?? 0} goals in derived stats</p>
        </article>
      </section>

      <section className="two-column">
        <form className="ops-panel live-form" onSubmit={register}>
          <div className="section-heading">
            <div>
              <h2>Official Auth</h2>
              <p>Register and log in as a coach or referee bearer-token user.</p>
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
              <option value="referee">Referee</option>
              <option value="coach">Coach</option>
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

        <form className="ops-panel live-form" onSubmit={submitResult}>
          <div className="section-heading">
            <div>
              <h2>Submit result</h2>
              <p>Send the official match score for review and verification.</p>
            </div>
          </div>
          <label>
            Home score
            <input
              className={inputClassName}
              min="0"
              onChange={(event) =>
                setResultForm({ ...resultForm, homeScore: Number(event.target.value) })
              }
              type="number"
              value={resultForm.homeScore}
            />
          </label>
          <label>
            Away score
            <input
              className={inputClassName}
              min="0"
              onChange={(event) =>
                setResultForm({ ...resultForm, awayScore: Number(event.target.value) })
              }
              type="number"
              value={resultForm.awayScore}
            />
          </label>
          <label>
            Notes
            <input
              className={inputClassName}
              onChange={(event) => setResultForm({ ...resultForm, notes: event.target.value })}
              value={resultForm.notes}
            />
          </label>
          <div className="live-action-group">
            <button className="primary-action" disabled={busy} type="submit">
              <ClipboardCheck aria-hidden="true" size={18} />
              Submit result
            </button>
            <button
              className="secondary-action"
              disabled={busy}
              onClick={() => void verifyMatch()}
              type="button"
            >
              <ShieldCheck aria-hidden="true" size={18} />
              Verify helper
            </button>
          </div>
        </form>
      </section>

      <section className="two-column">
        <form className="ops-panel live-form" onSubmit={submitEvent}>
          <div className="section-heading">
            <div>
              <h2>Capture event</h2>
              <p>Submit verified stat events against athletes and teams in this match.</p>
            </div>
          </div>
          <label>
            Athlete
            <select
              className={inputClassName}
              onChange={(event) => {
                const athleteId = event.target.value;
                const athlete = fixture.athletes.find((item) => item.id === athleteId);
                const team = fixture.teams.find((item) => item.schoolId === athlete?.schoolId);
                setEventForm({
                  ...eventForm,
                  athleteId,
                  ...(team ? { teamId: team.id } : {}),
                });
              }}
              value={eventForm.athleteId}
            >
              <option value="">Select athlete</option>
              {fixture.athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Team
            <select
              className={inputClassName}
              onChange={(event) => setEventForm({ ...eventForm, teamId: event.target.value })}
              value={eventForm.teamId}
            >
              <option value="">Select team</option>
              {fixture.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Event type
            <select
              className={inputClassName}
              onChange={(event) =>
                setEventForm({ ...eventForm, type: event.target.value as MatchEventType })
              }
              value={eventForm.type}
            >
              <option value="goal">Goal</option>
              <option value="assist">Assist</option>
              <option value="yellow_card">Yellow card</option>
              <option value="red_card">Red card</option>
              <option value="foul">Foul</option>
              <option value="own_goal">Own goal</option>
            </select>
          </label>
          <label>
            Minute
            <input
              className={inputClassName}
              min="0"
              onChange={(event) =>
                setEventForm({ ...eventForm, minute: Number(event.target.value) })
              }
              type="number"
              value={eventForm.minute}
            />
          </label>
          <button className="primary-action" disabled={busy} type="submit">
            <Goal aria-hidden="true" size={18} />
            Submit event
          </button>
        </form>

        <div className="ops-panel">
          <div className="section-heading">
            <div>
              <h2>Derived stats</h2>
              <p>Live aggregation from official match events.</p>
            </div>
          </div>
          <ul className="signal-list signal-list--success">
            <li>
              <Goal aria-hidden="true" size={18} />
              <span>Goals: {fixture.stats?.totals.goals ?? 0}</span>
            </li>
            <li>
              <Users aria-hidden="true" size={18} />
              <span>Assists: {fixture.stats?.totals.assists ?? 0}</span>
            </li>
            <li>
              <IdCard aria-hidden="true" size={18} />
              <span>
                Cards:{' '}
                {(fixture.stats?.totals.yellowCards ?? 0) + (fixture.stats?.totals.redCards ?? 0)}
              </span>
            </li>
          </ul>
          <p className="live-row__meta">
            Selected: {selectedAthlete?.fullName ?? 'No athlete'} ·{' '}
            {selectedTeam?.name ?? 'No team'}
          </p>
        </div>
      </section>

      <section className="two-column">
        <LiveList
          empty="Seed a fixture to see the active match."
          items={currentMatch ? [currentMatch] : []}
          title="Active Match Sheet"
          render={(match) => (
            <>
              <span>
                <strong>
                  {homeTeam?.name ?? match.homeTeamId} vs {awayTeam?.name ?? match.awayTeamId}
                </strong>
                <small>{new Date(match.scheduledAt).toLocaleString()}</small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={match.status} />
                <span className="live-row__meta">
                  {match.homeScore ?? '-'} - {match.awayScore ?? '-'}
                </span>
              </span>
            </>
          )}
        />
        <LiveList
          empty="No events have been submitted yet."
          items={fixture.events}
          title="Event Log"
          render={(matchEvent) => (
            <>
              <span>
                <strong>{labelForEvent(matchEvent.type)}</strong>
                <small>
                  {athleteName(matchEvent.athleteId, fixture.athletes)} · minute{' '}
                  {matchEvent.minute ?? '-'}
                </small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={matchEvent.status} />
              </span>
            </>
          )}
        />
      </section>

      <LiveList
        empty="No matches exist in this dev API session yet."
        items={matches}
        title="All Matches"
        render={(match) => (
          <>
            <span>
              <strong>{match.id}</strong>
              <small>{match.tournamentId}</small>
            </span>
            <span className="live-row__actions">
              <StatusBadge status={match.status} />
            </span>
          </>
        )}
      />
    </div>
  );
}

function labelForEvent(type: MatchEventType) {
  return type
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function athleteName(athleteId: string, athletes: Athlete[]) {
  return athletes.find((athlete) => athlete.id === athleteId)?.fullName ?? athleteId;
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
    <div className="ops-panel">
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
