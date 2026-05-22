import { AppShell } from '../../../../src/components/phase14/app-shell.js';
import { SchoolManagementPanel } from '../../../../src/components/phase14/dashboard-workspace.js';
import {
  getDefaultActorForQuery,
  getSchoolManagementView,
} from '../../../../src/lib/phase14-data.js';

type SchoolManagementPageProps = {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ role?: string; schoolId?: string }>;
};

export default async function SchoolManagementPage({
  params,
  searchParams,
}: SchoolManagementPageProps) {
  const [{ schoolId }, query] = await Promise.all([params, searchParams]);
  const actor = getDefaultActorForQuery(query.role, query.schoolId);
  const view = getSchoolManagementView(actor, schoolId);

  return (
    <AppShell activeRole={actor.role} eyebrow="School operations" title="School Management">
      <SchoolManagementPanel view={view} />
    </AppShell>
  );
}
