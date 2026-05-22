import { AppShell } from '../../../src/components/phase14/app-shell.js';
import { FamilyCommunications } from '../../../src/components/phase16/family-communications.js';
import { getFamilyCommunicationsSurface } from '../../../src/lib/phase16-data.js';

export default function FamilyCommunicationsPage() {
  const surface = getFamilyCommunicationsSurface();

  return (
    <AppShell eyebrow={surface.eyebrow} title="Family Communications">
      <FamilyCommunications surface={surface} />
    </AppShell>
  );
}
