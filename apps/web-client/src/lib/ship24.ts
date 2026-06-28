interface Ship24Event {
  status?: string;
  occurrenceDatetime?: string;
  location?: string;
}

interface Ship24Tracking {
  shipment?: { statusMilestone?: string };
  events?: Ship24Event[];
}

interface Ship24Response {
  data?: { trackings?: Ship24Tracking[] };
  errors?: Array<{ message?: string }>;
}

const MILESTONE_RU: Record<string, string> = {
  pending: 'ожидает',
  info_received: 'информация получена',
  in_transit: 'в пути',
  out_for_delivery: 'курьер в пути',
  failed_attempt: 'неудачная попытка',
  available_for_pickup: 'готово к выдаче',
  delivered: 'доставлено',
  exception: 'проблема',
};

export interface TrackingResult {
  ok: boolean;
  text: string;
}

// Реальный трекинг посылки по трек-номеру через Ship24 (1000+ перевозчиков).
export async function checkParcelTracking(trackingNumber: string): Promise<TrackingResult> {
  const key = process.env.SHIP24_API_KEY;
  if (!key) {
    return { ok: false, text: 'API-ключ Ship24 не задан' };
  }

  const code = trackingNumber.trim();
  if (!code) {
    return { ok: false, text: 'Нет трек-номера' };
  }

  try {
    const response = await fetch('https://api.ship24.com/public/v1/trackers/track', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ trackingNumber: code }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return { ok: false, text: `Ship24: HTTP ${response.status}` };
    }

    const json = (await response.json()) as Ship24Response;
    if (json.errors?.length) {
      return { ok: false, text: `Ship24: ${json.errors[0]?.message ?? 'ошибка запроса'}` };
    }

    const tracking = json.data?.trackings?.[0];
    const milestone = tracking?.shipment?.statusMilestone;
    const event = tracking?.events?.[0];

    if (!event && !milestone) {
      return {
        ok: false,
        text: 'Нет данных по трек-номеру (возможно, перевозчик ещё не зарегистрировал отправление)',
      };
    }

    const status = event?.status ?? (milestone ? (MILESTONE_RU[milestone] ?? milestone) : 'неизвестно');
    const location = event?.location ? `, ${event.location}` : '';
    const date = event?.occurrenceDatetime ? `, ${event.occurrenceDatetime.slice(0, 10)}` : '';
    const ms = milestone ? `[${MILESTONE_RU[milestone] ?? milestone}] ` : '';

    return { ok: true, text: `${ms}${status}${location}${date}` };
  } catch {
    return { ok: false, text: 'Не удалось обратиться к Ship24' };
  }
}
