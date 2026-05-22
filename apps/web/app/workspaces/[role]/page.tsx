import { AppShell } from '../../../src/components/phase14/app-shell.js';
import { DashboardWorkspace } from '../../../src/components/phase14/dashboard-workspace.js';
import { ErrorState } from '../../../src/components/phase14/state.js';
import { SuperAdminConsole } from '../../../src/components/live/super-admin-console.js';
import {
  getDashboardSnapshot,
  type RoleSlug,
  workspaceRoles,
} from '../../../src/lib/phase14-data.js';

type WorkspacePageProps = {
  params: Promise<{ role: string }>;
};

export function generateStaticParams() {
  return workspaceRoles.map((workspace) => ({ role: workspace.role }));
}

function isRoleSlug(value: string): value is RoleSlug {
  return workspaceRoles.some((workspace) => workspace.role === value);
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { role } = await params;

  if (!isRoleSlug(role)) {
    return (
      <AppShell eyebrow="Workspace" title="Unknown Role">
        <ErrorState
          message="This workspace is not configured for ATHLETIQ operations."
          title="Workspace not found"
        />
      </AppShell>
    );
  }

  const roleSlug: RoleSlug = role;
  const dashboard = getDashboardSnapshot(roleSlug);

  return (
    <AppShell activeRole={roleSlug} eyebrow={dashboard.eyebrow} title={dashboard.label}>
      {roleSlug === 'super-admin' ? (
        <SuperAdminConsole />
      ) : (
        <DashboardWorkspace dashboard={dashboard} />
      )}
    </AppShell>
  );
}
