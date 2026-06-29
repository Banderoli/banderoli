import 'server-only';
import { USD_TO_GEL_RATE } from '@banderoli/contracts';

const NBG_URL =
  'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/?currencies=USD';

interface NbgCurrency {
  code?: string;
  quantity?: number;
  rate?: number;
}

interface NbgEntry {
  currencies?: NbgCurrency[];
}

// Актуальный курс USD→GEL по официальным данным Нацбанка Грузии (nbg.gov.ge).
// Кэш 1 ч (НБГ обновляет курс раз в рабочий день); при недоступности — фолбэк-константа.
export async function getUsdToGelRate(): Promise<number> {
  try {
    const response = await fetch(NBG_URL, { next: { revalidate: 3600 } });
    if (!response.ok) {
      return USD_TO_GEL_RATE;
    }
    const json = (await response.json()) as NbgEntry[];
    const usd = json?.[0]?.currencies?.find((c) => c.code === 'USD');
    const rate = usd?.rate;
    const quantity = usd?.quantity ?? 1;
    if (typeof rate === 'number' && rate > 0 && quantity > 0) {
      // rate указан за `quantity` единиц валюты → нормируем к 1 USD.
      return Math.round((rate / quantity) * 10000) / 10000;
    }
    return USD_TO_GEL_RATE;
  } catch {
    return USD_TO_GEL_RATE;
  }
}
