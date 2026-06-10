import { prisma } from '@/lib/prisma';

// Базовая загруженность хабов (0-100)
// В будущем сюда можно подключить AviationStack API
const HUB_CONGESTION: Record<string, number> = {
  'Франкфурт': 40, // Крупный перевалочный пункт, частые задержки
  'Шэньчжэнь': 35, // Высокий трафик
  'Стамбул': 25,
  'Нью-Йорк': 30,
};

export async function checkFlightDelays() {
  console.log('✈️ Запуск анализатора авиарейсов...');

  // Берем все посылки, которые еще не доставлены и привязаны к хабу
  const activeParcels = await prisma.parcel.findMany({
    where: {
      status: { in: ['Ожидается', 'В пути', 'На таможне'] },
      logisticsHub: { not: null }
    }
  });

  for (const parcel of activeParcels) {
    const hub = parcel.logisticsHub!;
    const baseRisk = HUB_CONGESTION[hub] || 15;
    
    // Если посылка уже имеет высокий погодный риск, рейс почти гарантированно задержится
    const weatherImpact = (parcel.hubWeatherRisk ?? 0) > 60 ? 40 : 0;
    
    // Добавляем элемент случайности (от -10 до +20) для симуляции реального расписания
    const randomFactor = Math.floor(Math.random() * 30) - 10;
    
    let flightRisk = baseRisk + weatherImpact + randomFactor;
    flightRisk = Math.max(0, Math.min(flightRisk, 100)); // Держим в пределах 0-100

    // Обновляем риск задержки рейса в БД
    await prisma.parcel.update({
      where: { id: parcel.id },
      data: { flightDelayRisk: flightRisk }
    });

    // Если риск стал критическим, создаем системный Alert
    if (flightRisk >= 75) {
      const existingAlert = await prisma.alert.findFirst({
        where: { userId: parcel.userId, relatedHub: hub, type: 'delay', isResolved: false }
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            type: 'delay',
            message: `Критический риск задержки рейса из хаба ${hub}. Посылка "${parcel.name}" может опоздать.`,
            severity: 'CRITICAL',
            relatedHub: hub,
            userId: parcel.userId
          }
        });
      }
    }
  }
  console.log(`✅ Обновлены риски рейсов для ${activeParcels.length} посылок.`);
}