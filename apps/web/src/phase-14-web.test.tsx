import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  assertSchoolAccess,
  getPublicTournamentPayload,
  getSchoolManagementView,
  getWorkspaceForRole,
} from './lib/phase14-data.js';

describe('phase 14 enterprise web product', () => {
  it('routes each role to the correct workspace model', () => {
    const schoolWorkspace = getWorkspaceForRole('school-admin');
    const governmentWorkspace = getWorkspaceForRole('government');

    expect(schoolWorkspace.label).toBe('School Admin');
    expect(schoolWorkspace.primaryAction).toContain('school management');
    expect(governmentWorkspace.title).toContain('Read-only');
  });

  it('blocks school admins from another school management screen', () => {
    const access = assertSchoolAccess(
      { role: 'school-admin', schoolId: 'school-kantipur' },
      'school-riverside',
    );
    const view = getSchoolManagementView(
      { role: 'school-admin', schoolId: 'school-kantipur' },
      'school-riverside',
    );

    expect(access.allowed).toBe(false);
    expect(view.allowed).toBe(false);
    expect(view.athletes).toHaveLength(0);
    expect(JSON.stringify(view)).not.toContain('Aarav Kc');
  });

  it('keeps public tournament payload free of private athlete and guardian fields', () => {
    const publicTournament = getPublicTournamentPayload('kathmandu-school-cup-2026');

    expect(publicTournament).toBeDefined();
    expect(JSON.stringify(publicTournament)).not.toContain('athleteIds');
    expect(JSON.stringify(publicTournament)).not.toContain('dateOfBirth');
    expect(JSON.stringify(publicTournament)).not.toContain('guardian');
    expect(JSON.stringify(publicTournament)).not.toContain('documentBucket');
  });

  it('renders public tournament markup with mobile table labels and bracket details', async () => {
    const { PublicTournamentView } = await import('./components/phase14/public-tournament.js');
    const publicTournament = getPublicTournamentPayload('kathmandu-school-cup-2026');

    if (!publicTournament) {
      throw new Error('Expected public tournament fixture');
    }

    const markup = renderToStaticMarkup(<PublicTournamentView tournament={publicTournament} />);

    expect(markup).toContain('data-label="Fixture"');
    expect(markup).toContain('data-label="Score"');
    expect(markup).toContain('Interactive bracket');
    expect(markup).toContain('<details');
    expect(markup).not.toContain('athleteIds');
    expect(markup).not.toContain('dateOfBirth');
  });

  it('renders an access denied school page without private roster details', async () => {
    const { SchoolManagementPanel } = await import('./components/phase14/dashboard-workspace.js');
    const deniedView = getSchoolManagementView(
      { role: 'school-admin', schoolId: 'school-kantipur' },
      'school-riverside',
    );

    const markup = renderToStaticMarkup(<SchoolManagementPanel view={deniedView} />);

    expect(markup).toContain('Access denied');
    expect(markup).not.toContain('ATH-NP-2026-000510');
  });

  it('renders the live super admin console entry points', async () => {
    const { SuperAdminConsole } = await import('./components/live/super-admin-console.js');

    const markup = renderToStaticMarkup(<SuperAdminConsole />);

    expect(markup).toContain('Live backend console');
    expect(markup).toContain('API docs');
    expect(markup).toContain('Platform Users');
    expect(markup).toContain('Provision user');
    expect(markup).toContain('School Onboarding');
    expect(markup).toContain('Tournament Setup');
    expect(markup).toContain('Tournament Operations Command Center');
    expect(markup).toContain('Pending Verification');
    expect(markup).toContain('Bracket Operations');
  });

  it('renders the live bracket operations console from an API-shaped bracket view', async () => {
    const { BracketConsole } = await import('./components/live/bracket-console.js');

    const markup = renderToStaticMarkup(
      <BracketConsole
        initialTournaments={[
          {
            id: 'tournament-1',
            name: 'Bracket Cup',
            sport: 'football',
            format: 'knockout',
            status: 'approved',
          },
        ]}
        initialView={{
          bracket: {
            id: 'bracket-1',
            tournamentId: 'tournament-1',
            format: 'single_elimination',
            status: 'draft',
            activeVersionId: 'version-1',
            createdBy: 'usr_super_admin',
            createdAt: '2026-05-22T08:00:00.000Z',
            updatedAt: '2026-05-22T08:00:00.000Z',
          },
          version: {
            id: 'version-1',
            bracketId: 'bracket-1',
            versionNumber: 1,
            status: 'draft',
            generationPolicy: 'initial',
            createdBy: 'usr_super_admin',
            createdAt: '2026-05-22T08:00:00.000Z',
          },
          seeds: [
            {
              id: 'seed-1',
              bracketId: 'bracket-1',
              versionId: 'version-1',
              teamId: 'team-1',
              seedNumber: 1,
              groupKey: 'A',
              locked: true,
              withdrawn: false,
              createdAt: '2026-05-22T08:00:00.000Z',
              updatedAt: '2026-05-22T08:00:00.000Z',
            },
          ],
          nodes: [
            {
              id: 'node-1',
              bracketId: 'bracket-1',
              versionId: 'version-1',
              matchId: 'match-1',
              groupKey: 'A',
              round: 1,
              position: 1,
              bracketSide: 'main',
              homeTeamId: 'team-1',
              awayTeamId: 'team-2',
              homeSeedNumber: 1,
              awaySeedNumber: 2,
              sourceNodeIds: [],
              status: 'scheduled',
              createdAt: '2026-05-22T08:00:00.000Z',
              updatedAt: '2026-05-22T08:00:00.000Z',
            },
          ],
          standings: [
            {
              id: 'standing-1',
              bracketId: 'bracket-1',
              versionId: 'version-1',
              groupKey: 'A',
              teamId: 'team-1',
              played: 1,
              wins: 1,
              draws: 0,
              losses: 0,
              points: 3,
              goalsFor: 2,
              goalsAgainst: 0,
              goalDifference: 2,
              disciplinaryPoints: 0,
              headToHeadPoints: 3,
              rank: 1,
              updatedAt: '2026-05-22T08:00:00.000Z',
            },
          ],
          teams: [{ id: 'team-1', name: 'Team One', schoolId: 'school-1' }],
        }}
      />,
    );

    expect(markup).toContain('Bracket Operations');
    expect(markup).toContain('Create / Generate');
    expect(markup).toContain('Update seeds');
    expect(markup).toContain('Publish');
    expect(markup).toContain('Regenerate');
    expect(markup).toContain('Fetch view');
    expect(markup).toContain('Team One');
    expect(markup).toContain('Round 1');
    expect(markup).toContain('Standings');
  });

  it('renders the live school admin console entry points', async () => {
    const { SchoolAdminConsole } = await import('./components/live/school-admin-console.js');

    const markup = renderToStaticMarkup(<SchoolAdminConsole />);

    expect(markup).toContain('Live school workspace');
    expect(markup).toContain('Register School Admin');
    expect(markup).toContain('Create athlete draft');
    expect(markup).toContain('Tournament Registration');
    expect(markup).toContain('Document Verification');
  });

  it('renders the OCR document review workspace controls without a live backend', async () => {
    const { DocumentReviewConsole } = await import('./components/live/document-review-console.js');

    const markup = renderToStaticMarkup(<DocumentReviewConsole requestOptions={{}} />);

    expect(markup).toContain('Document Verification');
    expect(markup).toContain('Athlete ID');
    expect(markup).toContain('OCR Preview');
    expect(markup).toContain('Upload and extract');
    expect(markup).toContain('Review Queue');
    expect(markup).toContain('Expiring Documents');
    expect(markup).toContain('Approve');
    expect(markup).toContain('Request correction');
    expect(markup).toContain('Reject');
  });

  it('renders the live coach and referee console entry points', async () => {
    const { CoachRefereeConsole } = await import('./components/live/coach-referee-console.js');

    const markup = renderToStaticMarkup(<CoachRefereeConsole />);

    expect(markup).toContain('Live coach and referee workspace');
    expect(markup).toContain('Official Auth');
    expect(markup).toContain('Submit result');
    expect(markup).toContain('Capture event');
  });

  it('renders the live federation and government analytics consoles', async () => {
    const { AnalyticsConsole } = await import('./components/live/analytics-console.js');

    const federationMarkup = renderToStaticMarkup(<AnalyticsConsole mode="federation" />);
    const governmentMarkup = renderToStaticMarkup(<AnalyticsConsole mode="government" />);

    expect(federationMarkup).toContain('Live federation workspace');
    expect(federationMarkup).toContain('Analytics Login');
    expect(federationMarkup).toContain('Federation Rankings');
    expect(federationMarkup).toContain('Draft report');
    expect(governmentMarkup).toContain('Live government intelligence workspace');
    expect(governmentMarkup).toContain('Aggregate Participation');
    expect(governmentMarkup).toContain('Data Quality');
  });
});
