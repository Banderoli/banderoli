// Погода и местное время в крупнейших международных логистических хабах.
// Данные из OpenWeatherMap (current weather), агрессивно кэшируются на стороне
// Next.js (revalidate 30 мин), чтобы не упираться в лимиты бесплатного тарифа.

interface OwmResponse {
  main?: { temp?: number };
  weather?: Array<{ description?: string; icon?: string }>;
  timezone?: number; // сдвиг от UTC в секундах
  cod?: number | string;
}

interface Hub {
  region: string;
  city: string;
  query: string;
  fallbackOffset: number; // секунды от UTC, если API недоступен
}

const HUBS: Hub[] = [
  { region: 'Китай', city: 'Гуанчжоу', query: 'Guangzhou,CN', fallbackOffset: 8 * 3600 },
  { region: 'США', city: 'Нью-Йорк', query: 'New York,US', fallbackOffset: -4 * 3600 },
  { region: 'Европа', city: 'Франкфурт', query: 'Frankfurt,DE', fallbackOffset: 2 * 3600 },
  { region: 'Турция', city: 'Стамбул', query: 'Istanbul,TR', fallbackOffset: 3 * 3600 },
];

export interface HubWeather {
  region: string;
  city: string;
  ok: boolean;
  tempC: number | null;
  description: string | null;
  icon: string | null;
  timezoneOffset: number; // секунды от UTC
}

async function fetchHub(hub: Hub, key: string): Promise<HubWeather> {
  const base: HubWeather = {
    region: hub.region,
    city: hub.city,
    ok: false,
    tempC: null,
    description: null,
    icon: null,
    timezoneOffset: hub.fallbackOffset,
  };

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(hub.query)}` +
      `&units=metric&lang=ru&appid=${key}`;
    const response = await fetch(url, { next: { revalidate: 1800 } });
    if (!response.ok) {
      return base;
    }

    const json = (await response.json()) as OwmResponse;
    const temp = json.main?.temp;
    const weather = json.weather?.[0];

    return {
      ...base,
      ok: true,
      tempC: typeof temp === 'number' ? temp : null,
      description: weather?.description ?? null,
      icon: weather?.icon ?? null,
      timezoneOffset: typeof json.timezone === 'number' ? json.timezone : hub.fallbackOffset,
    };
  } catch {
    return base;
  }
}

export async function loadHubsWeather(): Promise<HubWeather[]> {
  const key = process.env.OPENWEATHERMAP_API_KEY;
  if (!key) {
    return HUBS.map((hub) => ({
      region: hub.region,
      city: hub.city,
      ok: false,
      tempC: null,
      description: null,
      icon: null,
      timezoneOffset: hub.fallbackOffset,
    }));
  }

  return Promise.all(HUBS.map((hub) => fetchHub(hub, key)));
}
