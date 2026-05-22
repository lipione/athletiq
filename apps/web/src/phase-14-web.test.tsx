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
    expect(markup).toContain('School Onboarding');
    expect(markup).toContain('Tournament Setup');
  });

  it('renders the live school admin console entry points', async () => {
    const { SchoolAdminConsole } = await import('./components/live/school-admin-console.js');

    const markup = renderToStaticMarkup(<SchoolAdminConsole />);

    expect(markup).toContain('Live school workspace');
    expect(markup).toContain('Register School Admin');
    expect(markup).toContain('Create athlete draft');
    expect(markup).toContain('Tournament Registration');
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
    expect(federationMarkup).toContain('Federation Rankings');
    expect(federationMarkup).toContain('Draft report');
    expect(governmentMarkup).toContain('Live government intelligence workspace');
    expect(governmentMarkup).toContain('Aggregate Participation');
    expect(governmentMarkup).toContain('Data Quality');
  });
});
