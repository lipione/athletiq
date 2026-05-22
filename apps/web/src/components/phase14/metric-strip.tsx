import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { DashboardMetric } from '../../lib/phase14-data.js';

const trendIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const;

export function MetricStrip({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section className="metric-strip" aria-label="Key metrics">
      {metrics.map((metric) => {
        const TrendIcon = trendIcon[metric.trend];

        return (
          <article className="metric-tile" key={metric.label}>
            <div className="metric-tile__header">
              <span>{metric.label}</span>
              <TrendIcon aria-hidden="true" size={16} />
            </div>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        );
      })}
    </section>
  );
}
