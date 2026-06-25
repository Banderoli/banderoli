export interface EtaQuery {
  carrier: string | null;
  shippedAt: Date | null;
  originHub?: string;
  destinationHub?: string;
}

export type EtaSource = 'mock' | 'flight-api';

export interface EtaEstimate {
  estimatedArrival: Date;
  source: EtaSource;
  cachedUntil: Date;
}

// Порт кэша — на Этапе 3 реализуется поверх Redis (TTL 1–3 ч, агрессивное кэширование).
export interface EtaCachePort {
  get(key: string): Promise<EtaEstimate | null>;
  set(key: string, value: EtaEstimate, ttlSeconds: number): Promise<void>;
}
