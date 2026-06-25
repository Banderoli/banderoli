import type { EtaEstimate, EtaQuery } from './types';

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

// Типовые сроки доставки по перевозчику (календарные дни). Мок Этапа 1.
const DEFAULT_TRANSIT_DAYS: Record<string, number> = {
  DHL: 5,
  FedEx: 6,
  UPS: 6,
  USPS: 12,
};

const FALLBACK_TRANSIT_DAYS = 10;
const CACHE_TTL_HOURS = 3;

export function etaCacheKey(query: EtaQuery): string {
  return [
    query.carrier ?? 'unknown',
    query.originHub ?? '-',
    query.destinationHub ?? 'TBS',
    query.shippedAt ? query.shippedAt.toISOString().slice(0, 10) : 'nodate',
  ].join(':');
}

/**
 * Детерминированная оценка даты прибытия. Назначение — прогноз ETA и уведомления.
 * Реальная интеграция flight/weather API подключается на Этапе 3.
 */
export function estimateEta(query: EtaQuery, now: Date = new Date()): EtaEstimate {
  const base = query.shippedAt ?? now;
  const transitDays = query.carrier
    ? (DEFAULT_TRANSIT_DAYS[query.carrier] ?? FALLBACK_TRANSIT_DAYS)
    : FALLBACK_TRANSIT_DAYS;

  return {
    estimatedArrival: new Date(base.getTime() + transitDays * MS_PER_DAY),
    source: 'mock',
    cachedUntil: new Date(now.getTime() + CACHE_TTL_HOURS * MS_PER_HOUR),
  };
}

export const ETA_CACHE_TTL_SECONDS = CACHE_TTL_HOURS * 3600;
