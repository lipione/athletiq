import { ArrowRight, Languages, MessageSquareText, ShieldCheck } from 'lucide-react';
import type {
  CommunicationTemplate,
  DeliveryQueueItem,
  FamilyCommunicationsSurface,
  ModeratedThread,
} from '../../lib/phase16-data.js';
import { DataTable, type DataTableColumn } from '../phase14/data-table.js';
import { MetricStrip } from '../phase14/metric-strip.js';
import { StatusBadge } from '../phase14/status-badge.js';

const deliveryColumns: DataTableColumn<DeliveryQueueItem>[] = [
  { header: 'Group', cell: (row) => row.recipientGroup },
  { header: 'Template', cell: (row) => row.template },
  { header: 'Channel', cell: (row) => row.channel },
  { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  { header: 'Next action', cell: (row) => row.nextAction },
];

function TemplateCard({ template }: { template: CommunicationTemplate }) {
  return (
    <article className="ops-panel">
      <div className="section-heading">
        <div>
          <h2>{template.title}</h2>
          <p>
            {template.audience} - {template.channel}
          </p>
        </div>
        <StatusBadge status={template.status} />
      </div>
      <ul className="signal-list signal-list--success">
        <li>
          <Languages aria-hidden="true" size={18} />
          <span>{template.english}</span>
        </li>
        <li>
          <Languages aria-hidden="true" size={18} />
          <span>{template.nepali}</span>
        </li>
      </ul>
    </article>
  );
}

function ThreadCard({ thread }: { thread: ModeratedThread }) {
  return (
    <article className="ops-panel">
      <div className="section-heading">
        <div>
          <h2>{thread.subject}</h2>
          <p>
            {thread.school} - {thread.team}
          </p>
        </div>
        <StatusBadge status={thread.state} />
      </div>
      <ul className="signal-list">
        <li>
          <MessageSquareText aria-hidden="true" size={18} />
          <span>{thread.latestNote}</span>
        </li>
        <li>
          <ShieldCheck aria-hidden="true" size={18} />
          <span>{thread.visibility}</span>
        </li>
      </ul>
    </article>
  );
}

export function FamilyCommunications({ surface }: { surface: FamilyCommunicationsSurface }) {
  return (
    <div className="stack">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">{surface.eyebrow}</p>
          <h2>{surface.title}</h2>
          <p>{surface.subtitle}</p>
        </div>
        <a className="primary-action" href="#delivery-queue">
          {surface.primaryAction}
          <ArrowRight aria-hidden="true" size={18} />
        </a>
      </section>

      <MetricStrip metrics={surface.metrics} />

      <section className="ops-panel">
        <div className="section-heading">
          <div>
            <h2>Family inbox health</h2>
            <p>School-approved communication signals for guardian-facing operations.</p>
          </div>
        </div>
        <ul className="signal-list signal-list--success">
          {surface.alerts.map((alert) => (
            <li key={alert}>
              <ShieldCheck aria-hidden="true" size={18} />
              <span>{alert}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="two-column" aria-label="Bilingual templates">
        {surface.templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </section>

      <section className="two-column" aria-label="Moderated threads">
        {surface.threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </section>

      <div id="delivery-queue">
        <DataTable
          caption="Delivery queue"
          columns={deliveryColumns}
          description="Outbound family messages awaiting approval, copy review, or delivery."
          rowKey={(row) => row.id}
          rows={surface.deliveryQueue}
        />
      </div>
    </div>
  );
}
