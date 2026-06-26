interface AviationFlight {
  flight_status?: string;
  flight?: { iata?: string };
  airline?: { name?: string };
  departure?: { iata?: string };
  arrival?: { iata?: string };
}

interface AviationResponse {
  error?: { message?: string };
  data?: AviationFlight[];
}

const STATUS_RU: Record<string, string> = {
  scheduled: 'по расписанию',
  active: 'в полёте',
  landed: 'приземлился',
  cancelled: 'отменён',
  incident: 'инцидент',
  diverted: 'перенаправлен',
};

export interface FlightStatusResult {
  ok: boolean;
  text: string;
}

// Проверка статуса рейса по коду (IATA). Бесплатный тариф aviationstack — только http.
export async function checkFlightStatus(flightCode: string): Promise<FlightStatusResult> {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key) {
    return { ok: false, text: 'API-ключ aviationstack не задан' };
  }

  const code = flightCode.trim();
  const isFlightCode = /^[A-Z]{2}\d{1,4}$/i.test(code);
  const url =
    `http://api.aviationstack.com/v1/flights?access_key=${key}&limit=1` +
    (isFlightCode ? `&flight_iata=${encodeURIComponent(code)}` : '');

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { ok: false, text: `aviationstack: HTTP ${response.status}` };
    }

    const json = (await response.json()) as AviationResponse;
    if (json.error) {
      return { ok: false, text: `aviationstack: ${json.error.message ?? 'ошибка запроса'}` };
    }

    const flight = json.data?.[0];
    if (!flight) {
      return {
        ok: false,
        text: isFlightCode ? 'Рейс не найден' : 'Укажите код рейса (напр. TK324) для проверки',
      };
    }

    const flightNo = flight.flight?.iata ?? code;
    const status = flight.flight_status ? (STATUS_RU[flight.flight_status] ?? flight.flight_status) : 'неизвестно';
    const dep = flight.departure?.iata ?? '?';
    const arr = flight.arrival?.iata ?? '?';
    return { ok: true, text: `Рейс ${flightNo}: ${status} (${dep} → ${arr})` };
  } catch {
    return { ok: false, text: 'Не удалось обратиться к aviationstack' };
  }
}
