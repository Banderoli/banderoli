import type { AnalyticsBucket } from '@/lib/analytics';
import { chartColor } from '@/lib/chart-colors';

// Донат с цветными секторами: доля каждого получателя по сумме расходов.
export function DonutChart({ title, buckets }: { title: string; buckets: AnalyticsBucket[] }) {
  const total = buckets.reduce((sum, b) => sum + b.valueUsd, 0);

  let cumulative = 0;
  const slices = buckets.map((bucket, index) => {
    const pct = total > 0 ? (bucket.valueUsd / total) * 100 : 0;
    const slice = {
      label: bucket.label,
      valueUsd: bucket.valueUsd,
      count: bucket.count,
      color: chartColor(index),
      pct,
      offset: 25 - cumulative, // старт сектора с 12 часов
    };
    cumulative += pct;
    return slice;
  });

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>

      {total === 0 ? (
        <p className="text-sm text-muted">Нет данных</p>
      ) : (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 36 36" className="h-28 w-28 shrink-0" role="img" aria-label={title}>
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--color-hairline)" strokeWidth="3.5" />
            {slices.map((slice) => (
              <circle
                key={slice.label}
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke={slice.color}
                strokeWidth="3.5"
                strokeDasharray={`${slice.pct} ${100 - slice.pct}`}
                strokeDashoffset={slice.offset}
                strokeLinecap="butt"
              />
            ))}
            <text x="18" y="17.5" textAnchor="middle" className="fill-ink text-[5px] font-semibold">
              ${total}
            </text>
            <text x="18" y="22" textAnchor="middle" className="fill-muted text-[2.6px]">
              всего
            </text>
          </svg>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {slices.map((slice) => (
              <li key={slice.label} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                <span className="shrink-0 text-xs text-muted">{Math.round(slice.pct)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
