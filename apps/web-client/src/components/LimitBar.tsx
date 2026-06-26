import type { ReactNode } from 'react';

// Плавный переход от фиолетового (мало) к красному (у лимита).
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function toneColor(ratio: number): string {
  const t = Math.min(1, Math.max(0, ratio));
  const r = lerp(124, 220, t);
  const g = lerp(58, 38, t);
  const b = lerp(237, 38, t);
  return `rgb(${r}, ${g}, ${b})`;
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
