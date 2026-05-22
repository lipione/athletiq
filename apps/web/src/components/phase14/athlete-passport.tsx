import { BadgeCheck, CalendarDays, QrCode } from 'lucide-react';
import type { AthletePassport, AthleteTimelineItem } from '../../lib/phase14-data.js';
import { formatDate } from '../../lib/phase14-format.js';
import { StatusBadge } from './status-badge.js';

const timelineLabel: Record<AthleteTimelineItem['type'], string> = {
  award: 'Award',
  development: 'Development',
  document: 'Document',
  identity: 'Identity',
  tournament: 'Tournament',
};

export function AthletePassportView({ athlete }: { athlete: AthletePassport }) {
  return (
    <div className="stack">
      <section className="passport-header">
        <div>
          <p className="eyebrow">Verified athlete passport</p>
          <h2>{athlete.fullName}</h2>
          <p>
            {athlete.schoolName} · {athlete.province} · {athlete.ageGroup}
          </p>
        </div>
        <StatusBadge status={athlete.verificationStatus} />
      </section>

      <section className="passport-grid">
        <div className="passport-card passport-card--identity">
          <BadgeCheck aria-hidden="true" size={22} />
          <span>ATHLETIQ ID</span>
          <strong>{athlete.athletiqId}</strong>
          <p>{athlete.sports.join(' · ')}</p>
        </div>
        <div className="passport-card passport-card--qr">
          <QrCode aria-hidden="true" size={42} />
          <strong>{athlete.qrCodeLabel}</strong>
          <p>Scan to verify identity and public eligibility status.</p>
        </div>
        {athlete.stats.map((stat) => (
          <div className="passport-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
          </div>
        ))}
      </section>

      <section className="timeline-panel">
        <div className="section-heading">
          <div>
            <h2>Development Timeline</h2>
            <p>
              Longitudinal milestones from verified identity, documents, tournaments, and awards.
            </p>
          </div>
        </div>
        <ol className="timeline">
          {athlete.timeline.map((item) => (
            <li key={`${item.date}-${item.title}`}>
              <CalendarDays aria-hidden="true" size={18} />
              <div>
                <span>{timelineLabel[item.type]}</span>
                <h3>{item.title}</h3>
                <time dateTime={item.date}>{formatDate(item.date)}</time>
                <p>{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="print-passport" aria-label="Printable passport">
        <div>
          <span>ATHLETIQ VERIFIED PASSPORT</span>
          <strong>{athlete.fullName}</strong>
          <p>{athlete.athletiqId}</p>
        </div>
        <div className="print-passport__qr">
          <QrCode aria-hidden="true" size={58} />
          <span>{athlete.verificationStatus}</span>
        </div>
      </section>
    </div>
  );
}
