// lib/intelligence/weather.ts

export interface WeatherReport {
  hub: string;
  hasDelay: boolean;
  delayDays: number;
  alertMessage: string | null;
}

/**
 * Weather Analysis Engine
 * Прогнозирует логистические задержки на основе погодных условий в хабах вылета.
 */
export async function analyzeWeatherRisk(carrier: string): Promise<WeatherReport> {
  // В будущем здесь будет реальный запрос к OpenWeather API
  // Для MVP мы привязываем хабы к перевозчикам и симулируем риски
  
  let hub = 'Europe Hub';
  if (carrier.toLowerCase().includes('camex')) hub = 'USA/China Hub';
  if (carrier.toLowerCase().includes('usa2georgia')) hub = 'USA Hub';

  // Имитация случайных погодных явлений (в продакшене заменить на fetch к API погоды)
  const isStormInUSA = Math.random() > 0.8; // 20% шанс шторма
  const isSnowInEurope = Math.random() > 0.85; // 15% шанс снегопада

  if (hub === 'USA Hub' && isStormInUSA) {
    return { hub, hasDelay: true, delayDays: 2, alertMessage: 'Штормовое предупреждение на Восточном побережье США. Задержка консолидации.' };
  }

  if (hub === 'Europe Hub' && isSnowInEurope) {
    return { hub, hasDelay: true, delayDays: 1, alertMessage: 'Снегопад в Европе. Ожидается перенос рейсов.' };
  }

  return { hub, hasDelay: false, delayDays: 0, alertMessage: null };
}