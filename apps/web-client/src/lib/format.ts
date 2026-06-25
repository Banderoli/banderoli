export function formatGel(value: number): string {
  return `${Math.round(value)} GEL`;
}

export function formatUsd(value: number | null): string {
  return value === null ? '—' : `$${Math.round(value)}`;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
