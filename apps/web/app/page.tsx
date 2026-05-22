import { AppShell } from '../src/components/phase14/app-shell.js';
import { DashboardWorkspace } from '../src/components/phase14/dashboard-workspace.js';
import { getDashboardSnapshot } from '../src/lib/phase14-data.js';

export default function HomePage() {
  const dashboard = getDashboardSnapshot('super-admin');

  return (
    <AppShell activeRole="super-admin" eyebrow="Track the Rise. Train the Future." title="ATHLETIQ">
      <DashboardWorkspace dashboard={dashboard} />
    </AppShell>
  );
}
