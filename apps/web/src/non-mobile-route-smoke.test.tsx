import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('non-mobile web route smoke', () => {
  it('renders every primary non-mobile workspace route', async () => {
    const { default: HomePage } = await import('../app/page.js');
    const { default: WorkspacePage } = await import('../app/workspaces/[role]/page.js');
    const { default: FamilyCommunicationsPage } =
      await import('../app/family/communications/page.js');
    const { default: SchoolManagementPage } =
      await import('../app/schools/[schoolId]/management/page.js');

    const homeMarkup = renderToStaticMarkup(<HomePage />);
    expect(homeMarkup).toContain('ATHLETIQ');

    const routes = [
      ['super-admin', 'Live backend console'],
      ['school-admin', 'Live school workspace'],
      ['coach-referee', 'Live coach and referee workspace'],
      ['federation', 'Live federation workspace'],
      ['government', 'Live government intelligence workspace'],
    ] as const;

    for (const [role, expectedText] of routes) {
      const markup = renderToStaticMarkup(
        await WorkspacePage({ params: Promise.resolve({ role }) }),
      );
      expect(markup).toContain(expectedText);
      expect(markup).not.toContain('Workspace not found');
    }

    const familyMarkup = renderToStaticMarkup(<FamilyCommunicationsPage />);
    expect(familyMarkup).toContain('Family Communications');
    expect(familyMarkup).toContain('Guardian');

    const schoolMarkup = renderToStaticMarkup(
      await SchoolManagementPage({
        params: Promise.resolve({ schoolId: 'school-kantipur' }),
        searchParams: Promise.resolve({ role: 'school-admin', schoolId: 'school-kantipur' }),
      }),
    );
    expect(schoolMarkup).toContain('School Management');
    expect(schoolMarkup).toContain('Kantipur International School');
    expect(schoolMarkup).not.toContain('Access denied');
  });

  it('renders public tournament and athlete passport routes without private data leaks', async () => {
    const { default: PublicTournamentPage } =
      await import('../app/public/tournaments/[slug]/page.js');
    const { default: AthletePassportPage } =
      await import('../app/athletes/[athleteId]/passport/page.js');

    const tournamentMarkup = renderToStaticMarkup(
      await PublicTournamentPage({
        params: Promise.resolve({ slug: 'kathmandu-school-cup-2026' }),
      }),
    );
    expect(tournamentMarkup).toContain('Tournament Center');
    expect(tournamentMarkup).toContain('Interactive bracket');
    expect(tournamentMarkup).not.toContain('dateOfBirth');
    expect(tournamentMarkup).not.toContain('guardian');

    const passportMarkup = renderToStaticMarkup(
      await AthletePassportPage({ params: Promise.resolve({ athleteId: 'ath-nima-rai' }) }),
    );
    expect(passportMarkup).toContain('Athlete Passport');
    expect(passportMarkup).toContain('Nima Rai');
    expect(passportMarkup).toContain('ATH-NP-2026-000184');
  });
});
