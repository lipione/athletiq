'use client';

import {
  Activity,
  BadgeCheck,
  BookOpen,
  Building2,
  CircleAlert,
  ClipboardCheck,
  IdCard,
  LogIn,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trophy,
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
import { DocumentReviewConsole } from './document-review-console.js';

type HealthStatus = {
  status: string;
  service: string;
};

type School = {
  id: string;
  name: string;
  location?: string;
  status: string;
  adminUserIds?: string[];
};

type Athlete = {
  id: string;
  schoolId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  status: string;
  athletiqId?: string;
  publicProfileStatus?: string;
};

type Tournament = {
  id: string;
  name: string;
  sport: string;
  format: string;
  status: string;
  schoolIds?: string[];
  maxTeams?: number;
};

type RegisterResponse = {
  user: LiveApiSession['user'];
};

type LoginResponse = {
  user: NonNullable<LiveApiSession['user']>;
  accessToken: string;
};

type LoadState = {
  health?: HealthStatus;
  schools: School[];
  tournaments: Tournament[];
  athletes: Athlete[];
};

const devSuperAdmin = { id: 'usr_super_admin', role: 'super_admin' };
const sessionKey = 'athletiq.school.console.session';
const inputClassName = 'live-input';

const emptyState: LoadState = {
  schools: [],
  tournaments: [],
  athletes: [],
};

export function SchoolAdminConsole() {
  const [session, setSession] = useState<LiveApiSession>({});
  const [data, setData] = useState<LoadState>(emptyState);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Log in as a school admin to run live school operations.');
  const [error, setError] = useState('');
  const [authForm, setAuthForm] = useState({
    email: `school_admin_${Date.now()}@athletiq.local`,
    password: 'password123',
  });
  const [schoolForm, setSchoolForm] = useState({
    name: 'Live School Academy',
    location: 'Kathmandu',
  });
  const [athleteForm, setAthleteForm] = useState({
    schoolId: '',
    fullName: 'Aarav Rai',
    dateOfBirth: '2012-04-15',
    gender: 'male',
  });
  const [registrationForm, setRegistrationForm] = useState({
    schoolId: '',
    tournamentId: '',
  });

  const requestOptions = useMemo(
    () => ({
      session,
      ...(session.accessToken ? {} : { devActor: devSuperAdmin }),
    }),
    [session],
  );

  const activeActor = session.user?.email ?? 'Preview mode with dev helper headers';
  const ownedSchoolIds = useMemo(() => new Set(session.user?.schoolIds ?? []), [session.user]);
  const ownedSchools = data.schools.filter(
    (school) =>
      ownedSchoolIds.has(school.id) || school.adminUserIds?.includes(session.user?.id ?? ''),
  );
  const approvedOwnedSchools = ownedSchools.filter((school) => school.status === 'approved');
  const approvedTournaments = data.tournaments.filter(
    (tournament) => tournament.status === 'approved' || tournament.status === 'active',
  );
  const selectedSchoolId =
    athleteForm.schoolId || approvedOwnedSchools[0]?.id || ownedSchools[0]?.id || '';
  const selectedTournamentId = registrationForm.tournamentId || approvedTournaments[0]?.id || '';
  const selectedRegistrationSchoolId =
    registrationForm.schoolId || approvedOwnedSchools[0]?.id || selectedSchoolId;
  const verifiedAthletes = data.athletes.filter(
    (athlete) => athlete.status === 'identity_approved',
  ).length;

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
    if (selectedSchoolId && athleteForm.schoolId !== selectedSchoolId) {
      setAthleteForm((current) => ({ ...current, schoolId: selectedSchoolId }));
    }
  }, [athleteForm.schoolId, selectedSchoolId]);

  useEffect(() => {
    if (
      selectedRegistrationSchoolId &&
      registrationForm.schoolId !== selectedRegistrationSchoolId
    ) {
      setRegistrationForm((current) => ({
        ...current,
        schoolId: selectedRegistrationSchoolId,
      }));
    }
  }, [registrationForm.schoolId, selectedRegistrationSchoolId]);

  useEffect(() => {
    if (selectedTournamentId && registrationForm.tournamentId !== selectedTournamentId) {
      setRegistrationForm((current) => ({
        ...current,
        tournamentId: selectedTournamentId,
      }));
    }
  }, [registrationForm.tournamentId, selectedTournamentId]);

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
    await runAction('School workspace data refreshed.', async () => {
      const [health, schools, tournaments] = await Promise.all([
        liveApiRequest<HealthStatus>('/health', {}, requestOptions),
        liveApiRequest<School[]>('/schools', {}, requestOptions),
        liveApiRequest<Tournament[]>('/tournaments', {}, requestOptions),
      ]);
      setData((current) => ({ ...current, health, schools, tournaments }));
    });
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('School admin registered. Log in to receive a bearer token.', async () => {
      await liveApiRequest<RegisterResponse>(
        '/auth/register',
        jsonBody({
          email: authForm.email,
          password: authForm.password,
          role: 'school_admin',
        }),
      );
    });
  };

  const login = async () => {
    await runAction('Logged in as school admin.', async () => {
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
    setData((current) => ({ ...current, athletes: [] }));
    setNotice('Session cleared. Log in again to operate a school.');
  };

  const createSchool = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.accessToken) {
      setError('Log in as a school admin before creating a school.');
      return;
    }

    await runAction(
      'School created. Use the approval helper before registering athletes.',
      async () => {
        const school = await liveApiRequest<School>('/schools', jsonBody(schoolForm), {
          session,
        });
        setSchoolForm((current) => ({ ...current, name: `${current.name} Branch` }));
        setAthleteForm((current) => ({ ...current, schoolId: school.id }));
        setRegistrationForm((current) => ({ ...current, schoolId: school.id }));
        await refreshData();
      },
    );
  };

  const approveSchool = async (schoolId: string) => {
    await runAction('School approved by dev super admin helper.', async () => {
      await liveApiRequest<School>(
        `/schools/${schoolId}/approve`,
        { method: 'POST' },
        { devActor: devSuperAdmin },
      );
      await refreshData();
    });
  };

  const createAthleteDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.accessToken) {
      setError('Log in as a school admin before creating athlete drafts.');
      return;
    }

    await runAction('Athlete draft created from the live API.', async () => {
      const athlete = await liveApiRequest<Athlete>(
        '/athletes/drafts',
        jsonBody({
          schoolId: athleteForm.schoolId,
          fullName: athleteForm.fullName,
          dateOfBirth: athleteForm.dateOfBirth,
          gender: athleteForm.gender,
        }),
        { session },
      );
      setData((current) => ({
        ...current,
        athletes: [athlete, ...current.athletes.filter((item) => item.id !== athlete.id)],
      }));
    });
  };

  const approveAthlete = async (athleteId: string) => {
    await runAction('Athlete identity approved by dev super admin helper.', async () => {
      const athlete = await liveApiRequest<Athlete>(
        `/athletes/${athleteId}/identity/approve`,
        { method: 'POST' },
        { devActor: devSuperAdmin },
      );
      setData((current) => ({
        ...current,
        athletes: current.athletes.map((item) => (item.id === athlete.id ? athlete : item)),
      }));
    });
  };

  const registerSchoolForTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.accessToken) {
      setError('Log in as a school admin before registering for tournaments.');
      return;
    }

    await runAction('School registered into the selected tournament.', async () => {
      await liveApiRequest<Tournament>(
        `/tournaments/${registrationForm.tournamentId}/register-school`,
        jsonBody({ schoolId: registrationForm.schoolId }),
        { session },
      );
      await refreshData();
    });
  };

  return (
    <div className="stack">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">Live school workspace</p>
          <h2>Run school onboarding, roster, and tournament enrollment</h2>
          <p>
            This school-admin console is connected to {liveApiBaseUrl()}. It uses real auth, school
            membership checks, athlete identity workflow, and tournament registration.
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
            <span>My Schools</span>
            <Building2 aria-hidden="true" size={18} />
          </div>
          <strong>{ownedSchools.length}</strong>
          <p>{approvedOwnedSchools.length} approved for athlete registration</p>
        </article>
        <article className="metric-tile">
          <div className="metric-tile__header">
            <span>Athletes</span>
            <Users aria-hidden="true" size={18} />
          </div>
          <strong>{data.athletes.length}</strong>
          <p>{verifiedAthletes} identity approved this session</p>
        </article>
        <article className="metric-tile">
          <div className="metric-tile__header">
            <span>Tournaments</span>
            <Trophy aria-hidden="true" size={18} />
          </div>
          <strong>{approvedTournaments.length}</strong>
          <p>Approved events open for school enrollment</p>
        </article>
      </section>

      <section className="two-column">
        <form className="ops-panel live-form" onSubmit={register}>
          <div className="section-heading">
            <div>
              <h2>Register School Admin</h2>
              <p>Create a real account, then log in with the issued bearer token.</p>
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
              <h2>School Setup</h2>
              <p>Create your school tenant and attach it to the logged-in admin.</p>
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
            <Building2 aria-hidden="true" size={18} />
            Create school
          </button>
        </form>
      </section>

      <section className="two-column">
        <form className="ops-panel live-form" onSubmit={createAthleteDraft}>
          <div className="section-heading">
            <div>
              <h2>Create athlete draft</h2>
              <p>Register athletes only after the school has been approved.</p>
            </div>
          </div>
          <label>
            School
            <select
              className={inputClassName}
              onChange={(event) => setAthleteForm({ ...athleteForm, schoolId: event.target.value })}
              value={athleteForm.schoolId}
            >
              <option value="">Select school</option>
              {ownedSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.status})
                </option>
              ))}
            </select>
          </label>
          <label>
            Full name
            <input
              className={inputClassName}
              onChange={(event) => setAthleteForm({ ...athleteForm, fullName: event.target.value })}
              value={athleteForm.fullName}
            />
          </label>
          <label>
            Date of birth
            <input
              className={inputClassName}
              onChange={(event) =>
                setAthleteForm({ ...athleteForm, dateOfBirth: event.target.value })
              }
              type="date"
              value={athleteForm.dateOfBirth}
            />
          </label>
          <label>
            Gender
            <select
              className={inputClassName}
              onChange={(event) => setAthleteForm({ ...athleteForm, gender: event.target.value })}
              value={athleteForm.gender}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
            </select>
          </label>
          <button className="primary-action" disabled={busy} type="submit">
            <IdCard aria-hidden="true" size={18} />
            Create draft
          </button>
        </form>

        <form className="ops-panel live-form" onSubmit={registerSchoolForTournament}>
          <div className="section-heading">
            <div>
              <h2>Tournament Registration</h2>
              <p>Enroll an approved school into an approved tournament.</p>
            </div>
          </div>
          <label>
            School
            <select
              className={inputClassName}
              onChange={(event) =>
                setRegistrationForm({ ...registrationForm, schoolId: event.target.value })
              }
              value={registrationForm.schoolId}
            >
              <option value="">Select approved school</option>
              {approvedOwnedSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tournament
            <select
              className={inputClassName}
              onChange={(event) =>
                setRegistrationForm({ ...registrationForm, tournamentId: event.target.value })
              }
              value={registrationForm.tournamentId}
            >
              <option value="">Select tournament</option>
              {approvedTournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} ({tournament.sport})
                </option>
              ))}
            </select>
          </label>
          <button className="primary-action" disabled={busy} type="submit">
            <ClipboardCheck aria-hidden="true" size={18} />
            Register school
          </button>
        </form>
      </section>

      <section className="two-column">
        <LiveList
          empty="Create a school after logging in."
          items={ownedSchools}
          title="My Schools"
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
                    Approve helper
                  </button>
                ) : null}
              </span>
            </>
          )}
        />
        <LiveList
          empty="No athlete drafts have been created in this browser session."
          items={data.athletes}
          title="Athlete Drafts"
          render={(athlete) => (
            <>
              <span>
                <strong>{athlete.fullName}</strong>
                <small>
                  {athlete.athletiqId ?? athlete.id} · {athlete.dateOfBirth ?? 'DOB pending'}
                </small>
              </span>
              <span className="live-row__actions">
                <StatusBadge status={athlete.status} />
                {athlete.status !== 'identity_approved' ? (
                  <button
                    className="icon-button"
                    disabled={busy}
                    onClick={() => void approveAthlete(athlete.id)}
                    type="button"
                  >
                    Verify helper
                  </button>
                ) : null}
              </span>
            </>
          )}
        />
      </section>

      <DocumentReviewConsole requestOptions={requestOptions} />

      <LiveList
        empty="No approved tournaments are available yet. Create and approve one from Super Admin."
        items={approvedTournaments}
        title="Open Tournaments"
        render={(tournament) => (
          <>
            <span>
              <strong>{tournament.name}</strong>
              <small>
                {tournament.sport} · {tournament.format} · {tournament.schoolIds?.length ?? 0}/
                {tournament.maxTeams ?? 'open'} schools
              </small>
            </span>
            <span className="live-row__actions">
              <StatusBadge
                status={
                  tournament.schoolIds?.includes(selectedRegistrationSchoolId)
                    ? 'registered'
                    : tournament.status
                }
              />
            </span>
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
