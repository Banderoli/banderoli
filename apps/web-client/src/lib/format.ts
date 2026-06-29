export function formatGel(value: number): string {
  return `${Math.round(value)} GEL`;
}

export function formatUsd(value: number | null): string {
  return value === null ? '—' : `$${Math.round(value)}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  TRY: '₺',
  CNY: '¥',
  GEL: '₾',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

// Сумма в валюте посылки: $/€/₺/¥ — префиксом, GEL — как «N GEL».
export function formatMoney(value: number | null, currency: string): string {
  if (value === null) {
    return '—';
  }
  const rounded = Math.round(value);
  if (currency === 'GEL') {
    return `${rounded} GEL`;
  }
  const symbol = CURRENCY_SYMBOLS[currency] ?? '';
  return `${symbol}${rounded}`;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
