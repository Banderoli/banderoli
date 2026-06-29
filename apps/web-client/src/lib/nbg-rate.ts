import 'server-only';
import { PARCEL_CURRENCIES, USD_TO_GEL_RATE, type ParcelCurrency } from '@banderoli/contracts';

const NBG_URL = 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/';

// Коды, которые тянем из НБГ (GEL не котируется — это базовая валюта, курс 1).
const NBG_CODES: Exclude<ParcelCurrency, 'GEL'>[] = ['USD', 'EUR', 'TRY', 'CNY'];

export type GelRates = Record<ParcelCurrency, number>;

// Фолбэк-курсы (1 единица валюты → GEL), если НБГ недоступен.
const FALLBACK_RATES: GelRates = {
  USD: USD_TO_GEL_RATE,
  EUR: 3.0,
  TRY: 0.057,
  CNY: 0.38,
  GEL: 1,
};

interface NbgCurrency {
  code?: string;
  quantity?: number;
  rate?: number;
}

interface NbgEntry {
  currencies?: NbgCurrency[];
}

// Актуальные курсы валют → GEL по официальным данным Нацбанка Грузии (nbg.gov.ge).
// Кэш 1 ч. Важно: rate указан за `quantity` единиц (напр. CNY — за 10), нормируем к 1.
export async function getGelRates(): Promise<GelRates> {
  try {
    const response = await fetch(NBG_URL, { next: { revalidate: 3600 } });
    if (!response.ok) {
      return FALLBACK_RATES;
    }
    const json = (await response.json()) as NbgEntry[];
    const list = json?.[0]?.currencies ?? [];
    const rates: GelRates = { ...FALLBACK_RATES };
    for (const code of NBG_CODES) {
      const found = list.find((c) => c.code === code);
      const rate = found?.rate;
      const quantity = found?.quantity ?? 1;
      if (typeof rate === 'number' && rate > 0 && quantity > 0) {
        rates[code] = Math.round((rate / quantity) * 100000) / 100000;
      }
    }
    return rates;
  } catch {
    return FALLBACK_RATES;
  }
}

export function isParcelCurrency(value: string | null | undefined): value is ParcelCurrency {
  return !!value && (PARCEL_CURRENCIES as readonly string[]).includes(value);
}

// Сумма в валюте → GEL. Неизвестная валюта трактуется как USD.
export function convertToGel(amount: number, currency: string, rates: GelRates): number {
  const rate = isParcelCurrency(currency) ? rates[currency] : rates.USD;
  return amount * rate;
}

// Совместимость со страницами, которым нужен только курс USD.
export async function getUsdToGelRate(): Promise<number> {
  return (await getGelRates()).USD;
}
