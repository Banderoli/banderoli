import type { AnalyticsBucket } from '@/lib/analytics';

export function BarList({ title, buckets }: { title: string; buckets: AnalyticsBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.valueUsd));

  return (
    <div className="rounded-xl border border-hairline bg-surface shadow-card p-4">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      {buckets.length === 0 ? (
        <p className="text-sm text-muted">Нет данных</p>
      ) : (
        buckets.map((bucket) => (
          <div key={bucket.label} className="mb-2.5 last:mb-0">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{bucket.label}</span>
              <span className="shrink-0 font-medium">
                ${bucket.valueUsd}
                <span className="ml-1.5 text-xs text-muted">· {bucket.count}</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.round((bucket.valueUsd / max) * 100)}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
