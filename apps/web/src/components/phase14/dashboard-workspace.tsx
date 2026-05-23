import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import type {
  DashboardRow,
  DashboardSnapshot,
  SchoolAthlete,
  SchoolManagementView,
} from '../../lib/phase14-data.js';
import { DataTable, type DataTableColumn } from './data-table.js';
import { MetricStrip } from './metric-strip.js';
import { EmptyState, ErrorState } from './state.js';
import { StatusBadge } from './status-badge.js';
import { routeForWorkspace } from '../../lib/phase14-format.js';

const dashboardColumns: DataTableColumn<DashboardRow>[] = [
  { header: 'Item', cell: (row) => row.label },
  { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  { header: 'Owner', cell: (row) => row.owner },
  { header: 'Next action', cell: (row) => row.nextAction },
];

const rosterColumns: DataTableColumn<SchoolAthlete>[] = [
  { header: 'Athlete', cell: (row) => row.name },
  { header: 'ATHLETIQ ID', cell: (row) => row.athletiqId },
  { header: 'Team', cell: (row) => row.team },
  { header: 'Verification', cell: (row) => <StatusBadge status={row.verification} /> },
  { header: 'Eligibility', cell: (row) => row.eligibility },
];

export function DashboardWorkspace({ dashboard }: { dashboard: DashboardSnapshot }) {
  const primaryHref = dashboard.quickLinks[0]?.href ?? routeForWorkspace(dashboard.role);

  return (
    <div className="stack">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">{dashboard.eyebrow}</p>
          <h2>{dashboard.title}</h2>
          <p>{dashboard.subtitle}</p>
        </div>
        <a className="primary-action" href={primaryHref}>
          {dashboard.primaryAction}
          <ArrowRight aria-hidden="true" size={18} />
        </a>
      </section>

      <MetricStrip metrics={dashboard.metrics} />

      <section className="two-column">
        <div className="ops-panel">
          <div className="section-heading">
            <div>
              <h2>Priority Alerts</h2>
              <p>Live operating signals from verified platform workflows.</p>
            </div>
          </div>
          <ul className="signal-list">
            {dashboard.alerts.map((alert) => (
              <li key={alert}>
                <ShieldAlert aria-hidden="true" size={18} />
                <span>{alert}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ops-panel">
          <div className="section-heading">
            <div>
              <h2>Next Actions</h2>
              <p>Role-specific work that keeps the system current.</p>
            </div>
          </div>
          <ul className="signal-list signal-list--success">
            {dashboard.tasks.map((task) => (
              <li key={task}>
                <CheckCircle2 aria-hidden="true" size={18} />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <DataTable
        caption={dashboard.tableTitle}
        columns={dashboardColumns}
        description={dashboard.tableDescription}
        rowKey={(row) => row.label}
        rows={dashboard.rows}
      />

      <section className="quick-links" aria-label="Quick links">
        {dashboard.quickLinks.map((link) => (
          <a href={link.href} key={link.href}>
            <span>{link.label}</span>
            <ArrowRight aria-hidden="true" size={16} />
          </a>
        ))}
      </section>
    </div>
  );
}

export function SchoolManagementPanel({ view }: { view: SchoolManagementView }) {
  if (!view.allowed) {
    return (
      <ErrorState
        message={`${view.reason} Private roster, document, billing, and eligibility data is hidden.`}
        title="Access denied"
      />
    );
  }

  return (
    <div className="stack">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">
            {view.school.district}, {view.school.province}
          </p>
          <h2>{view.school.name}</h2>
          <p>
            Manage roster eligibility, verification status, waivers, billing readiness, and
            tournament participation for this school.
          </p>
        </div>
        <StatusBadge status={view.school.status} />
      </section>

      <MetricStrip metrics={view.readiness} />

      {view.athletes.length > 0 ? (
        <DataTable
          caption="Roster Management"
          columns={rosterColumns}
          description="Private athlete records scoped to authorized school operators."
          rowKey={(row) => row.id}
          rows={view.athletes}
        />
      ) : (
        <EmptyState
          message="No athlete records are available for this school scope."
          title="No roster records"
        />
      )}

      <section className="ops-panel">
        <div className="section-heading">
          <div>
            <h2>Private Operations Notes</h2>
            <p>Visible only to authorized school operators and super admins.</p>
          </div>
        </div>
        <ul className="signal-list">
          {view.privateNotes.map((note) => (
            <li key={note}>
              <ShieldAlert aria-hidden="true" size={18} />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
