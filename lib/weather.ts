import axios from 'axios';
import { prisma } from '@/lib/prisma';

interface WeatherResponse {
  weather: { id: number; main: string; description: string }[];
  wind: { speed: number };
  name: string;
}

const LOGISTICS_HUBS = [
  { city: 'New York', name: 'Нью-Йорк (JFK)', country: 'US' },
  { city: 'Guangzhou', name: 'Гуанчжоу (CAN)', country: 'CN' },
  { city: 'Frankfurt', name: 'Франкфурт (FRA)', country: 'DE' },
  { city: 'Istanbul', name: 'Стамбул (IST)', country: 'TR' }
];

export async function checkWeatherAlerts() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error('[Погодный Монитор] Критическая ошибка: Отсутствует OPENWEATHER_API_KEY в файле .env');
    return;
  }

  for (const hub of LOGISTICS_HUBS) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(hub.city)}&appid=${apiKey}&units=metric&lang=ru`;
      const { data } = await axios.get<WeatherResponse>(url, { timeout: 8000 });

      const weatherId = data.weather[0]?.id || 800;
      const description = data.weather[0]?.description || '';
      const windSpeed = data.wind?.speed || 0;

      let isDangerous = false;
      let severity = 'WARNING';
      let message = '';

      // Анализ опасных кодов условий OpenWeather
      if (weatherId < 600) { 
        if (weatherId === 211 || weatherId === 212 || weatherId > 501) {
          isDangerous = true;
          message = `Сильный шторм/ливень в хабе ${hub.name} (${description}). Возможны массовые задержки вылетов авиарейсов.`;
        }
      } else if (weatherId >= 600 && weatherId < 700) { 
        isDangerous = true;
        message = `Сильный снегопад/буран в хабе ${hub.name} (${description}). Риск обледенения взлетных полос.`;
      } else if (weatherId >= 700 && weatherId < 800) { 
        isDangerous = true;
        severity = weatherId === 781 ? 'CRITICAL' : 'WARNING';
        message = `Критическая видимость/туман в хабе ${hub.name} (${description}). Возможна приостановка логистического узла.`;
      }

      if (windSpeed > 15) {
        isDangerous = true;
        message = `Предупреждение об ураганном ветре в хабе ${hub.name} (${windSpeed} м/с). Высокая вероятность отмены грузовых рейсов.`;
        if (windSpeed > 24) severity = 'CRITICAL';
      }

      if (isDangerous) {
        await prisma.alert.create({
          data: {
            type: 'WEATHER',
            message,
            severity: severity as any,
            relatedHub: hub.name
          }
        });
      }
    } catch (err) {
      console.error(`[Погода Монитор] Ошибка сети при запросе хаба ${hub.name}:`, err);
    }
  }
}