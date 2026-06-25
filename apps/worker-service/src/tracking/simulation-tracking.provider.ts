import { Injectable } from '@nestjs/common';
import { estimateEta } from '@banderoli/flight-intelligence';
import type {
  TrackingEvent,
  TrackingProvider,
  TrackingQuery,
  TrackingUpdate,
} from './tracking-provider';

const MS_PER_DAY = 86_400_000;

/**
 * Детерминированный симуляционный провайдер трекинга (Этап 3, без платных API).
 * Строит правдоподобную ленту событий по времени отправки и прогнозу ETA.
 * Боевые адаптеры перевозчиков подключаются через тот же интерфейс TrackingProvider.
 */
@Injectable()
export class SimulationTrackingProvider implements TrackingProvider {
  async fetch(query: TrackingQuery): Promise<TrackingUpdate> {
    const now = Date.now();
    const base = query.shippedAt ?? query.createdAt;
    const eta = estimateEta({ carrier: query.carrier, shippedAt: base }).estimatedArrival;

    const inTransitAt = new Date(base.getTime() + MS_PER_DAY);
    const customsAt = new Date(eta.getTime() - MS_PER_DAY);

    const pending: TrackingEvent = {
      status: 'PENDING',
      description: 'Заказ зарегистрирован',
      location: null,
      occurredAt: base,
    };

    const timeline: TrackingEvent[] = [
      pending,
      {
        status: 'IN_TRANSIT',
        description: 'Принято перевозчиком',
        location: query.carrier,
        occurredAt: inTransitAt,
      },
    ];

    if (customsAt.getTime() > inTransitAt.getTime()) {
      timeline.push({
        status: 'IN_CUSTOMS',
        description: 'Прибыло на таможенное оформление',
        location: 'Тбилиси (TBS)',
        occurredAt: customsAt,
      });
    }

    timeline.push({
      status: 'DELIVERED',
      description: 'Вручено получателю',
      location: 'Тбилиси (TBS)',
      occurredAt: eta,
    });

    const past = timeline.filter((event) => event.occurredAt.getTime() <= now);
    const current = past.at(-1);

    return {
      status: current?.status ?? 'PENDING',
      estimatedArrival: eta,
      events: past.length > 0 ? past : [pending],
    };
  }
}
