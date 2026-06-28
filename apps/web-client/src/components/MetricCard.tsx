export function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'medium' | 'high';
}) {
  const valueColor =
    accent === 'high'
      ? 'text-high'
      : accent === 'medium'
        ? 'text-medium'
        : 'text-ink';

  return (
    <div className="rounded-lg border border-hairline bg-surface shadow-card px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="mb-1.5 text-xs text-muted">{label}</div>
      <div className={`text-2xl font-medium ${valueColor}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}
