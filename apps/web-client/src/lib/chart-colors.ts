// Палитра для инфографики аналитики — фирменный фиолетовый первым, далее
// контрастные, но не кричащие оттенки, читаемые на светлом фоне.
export const CHART_PALETTE = [
  '#7c3aed',
  '#2563eb',
  '#0d9488',
  '#d97706',
  '#db2777',
  '#65a30d',
  '#0891b2',
  '#9333ea',
  '#e11d48',
  '#475569',
] as const;

export function chartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length] ?? CHART_PALETTE[0];
}
