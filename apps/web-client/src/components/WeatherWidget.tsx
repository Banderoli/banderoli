import { Clock } from 'lucide-react';
import { loadHubsWeather } from '@/lib/weather';
import { WeatherClock } from './WeatherClock';

// Эмодзи по коду иконки OpenWeatherMap (без внешних картинок).
function weatherEmoji(icon: string | null): string {
  if (!icon) {
    return '🌐';
  }
  const day = icon.endsWith('d');
  const code = icon.slice(0, 2);
  switch (code) {
    case '01':
      return day ? '☀️' : '🌙';
    case '02':
      return day ? '⛅' : '☁️';
    case '03':
    case '04':
      return '☁️';
    case '09':
      return '🌧️';
    case '10':
      return day ? '🌦️' : '🌧️';
    case '11':
      return '⛈️';
    case '13':
      return '❄️';
    case '50':
      return '🌫️';
    default:
      return '🌐';
  }
}

export async function WeatherWidget() {
  const hubs = await loadHubsWeather();

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
      <h2 className="mb-1 text-sm font-medium">Погода в хабах</h2>
      <p className="mb-3 text-xs text-muted">
        Крупнейшие международные хабы — прогноз и местное время.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {hubs.map((hub) => (
          <div
            key={hub.city}
            className="rounded-lg border border-hairline bg-canvas p-3 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="text-[11px] uppercase tracking-wide text-muted">{hub.region}</div>
            <div className="truncate text-sm font-medium">{hub.city}</div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl leading-none" aria-hidden>
                {weatherEmoji(hub.icon)}
              </span>
              <span className="text-xl font-semibold">
                {hub.tempC !== null ? `${Math.round(hub.tempC)}°` : '—'}
              </span>
            </div>

            <div className="mt-1 h-4 truncate text-xs capitalize text-muted">
              {hub.description ?? (hub.ok ? '' : 'нет данных')}
            </div>

            <div className="mt-1.5 flex items-center gap-1 text-xs text-muted">
              <Clock size={12} aria-hidden />
              <WeatherClock offsetSeconds={hub.timezoneOffset} />
              <span>местн.</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
