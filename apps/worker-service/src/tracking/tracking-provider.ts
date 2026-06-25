import type { ParcelStatus } from '@banderoli/database';

export interface TrackingEvent {
  status: ParcelStatus;
  description: string | null;
  location: string | null;
  occurredAt: Date;
}

export interface TrackingUpdate {
  status: ParcelStatus;
  estimatedArrival: Date | null;
  events: TrackingEvent[];
}

export interface TrackingQuery {
  trackingNumber: string;
  carrier: string | null;
  shippedAt: Date | null;
  createdAt: Date;
}

export interface TrackingProvider {
  fetch(query: TrackingQuery): Promise<TrackingUpdate>;
}

// DI-токен: позволяет подменить симуляцию на боевые API перевозчиков без правок процессора.
export const TRACKING_PROVIDER = Symbol('TRACKING_PROVIDER');
