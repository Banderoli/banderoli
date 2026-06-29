import type { AnalyticsBucket } from '@/lib/analytics';
import { chartColor } from '@/lib/chart-colors';

// Вертикальные цветные столбцы: расходы по перевозчикам.
export function ColumnChart({ title, buckets }: { title: string; buckets: AnalyticsBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.valueGel));
  const columns = buckets.slice(0, 6);

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>

      {columns.length === 0 ? (
        <p className="text-sm text-muted">Нет данных</p>
      ) : (
        <div className="flex h-44 items-end justify-around gap-2">
          {columns.map((bucket, index) => (
            <div key={bucket.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-xs font-medium">{bucket.valueGel}</span>
              <div
                className="w-full max-w-[3rem] rounded-t-md transition-all"
                style={{
                  height: `${Math.max(4, Math.round((bucket.valueGel / max) * 100))}%`,
                  backgroundColor: chartColor(index),
                }}
                aria-hidden
              />
              <span className="w-full truncate text-center text-[11px] text-muted" title={bucket.label}>
                {bucket.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
