import type { ExposureLevel } from '@banderoli/contracts';

const TONE: Record<ExposureLevel, { color: string; label: string }> = {
  LOW: { color: 'var(--color-low)', label: 'Низкая' },
  MEDIUM: { color: 'var(--color-medium)', label: 'Средняя' },
  HIGH: { color: 'var(--color-high)', label: 'Высокая' },
};

const ARC_LENGTH = 220;

export function ExposureGauge({ score, level }: { score: number; level: ExposureLevel }) {
  const tone = TONE[level];
  const offset = ARC_LENGTH * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 170 100" className="w-44" role="img" aria-label={`Экспозиция: ${tone.label}`}>
        <path
          d="M15 88 A70 70 0 0 1 155 88"
          fill="none"
          stroke="var(--color-hairline)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M15 88 A70 70 0 0 1 155 88"
          fill="none"
          stroke={tone.color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={offset}
        />
        <text x="85" y="76" textAnchor="middle" className="fill-ink" fontSize="22" fontWeight="500">
          {score}
        </text>
        <text x="85" y="92" textAnchor="middle" fill={tone.color} fontSize="12" fontWeight="500">
          {tone.label}
        </text>
      </svg>
    </div>
  );
}
