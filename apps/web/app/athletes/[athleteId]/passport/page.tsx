import { AppShell } from '../../../../src/components/phase14/app-shell.js';
import { AthletePassportView } from '../../../../src/components/phase14/athlete-passport.js';
import { ErrorState } from '../../../../src/components/phase14/state.js';
import { getAthletePassport } from '../../../../src/lib/phase14-data.js';

type AthletePassportPageProps = {
  params: Promise<{ athleteId: string }>;
};

export default async function AthletePassportPage({ params }: AthletePassportPageProps) {
  const { athleteId } = await params;
  const athlete = getAthletePassport(athleteId);

  if (!athlete) {
    return (
      <AppShell activeRole="school-admin" eyebrow="Athlete identity" title="Athlete Passport">
        <ErrorState
          message="This athlete passport is unavailable or not visible to this workspace."
          title="Athlete not found"
        />
      </AppShell>
    );
  }

  return (
    <AppShell activeRole="school-admin" eyebrow="Athlete identity" title="Athlete Passport">
      <AthletePassportView athlete={athlete} />
    </AppShell>
  );
}
