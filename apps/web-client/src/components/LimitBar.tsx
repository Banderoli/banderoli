import type { ReactNode } from 'react';

function toneColor(ratio: number): string {
  if (ratio >= 0.85) {
    return 'var(--color-high)';
  }
  if (ratio >= 0.6) {
    return 'var(--color-medium)';
  }
  return 'var(--color-brand)';
}

export function LimitBar({
  icon,
  label,
  used,
  total,
  valueText,
}: {
  icon: ReactNode;
  label: string;
  used: number;
  total: number;
  valueText: string;
}) {
  const ratio = total > 0 ? Math.min(1, used / total) : 0;
  const color = toneColor(ratio);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-muted">
          {icon}
          {label}
        </span>
        <span className="text-sm font-medium">{valueText}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
