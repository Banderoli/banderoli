// lib/intelligence/flights.ts
import { prisma } from '@/lib/prisma';
import { sendTelegramToUser } from '@/lib/telegram'; // 🔥 Добавили Telegram

// Базовая загруженность хабов (0-100)
// Все ключи переведены в нижний регистр для безопасного поиска
const HUB_CONGESTION: Record<string, number> = {
  'франкфурт': 40, // Крупный перевалочный пункт, частые задержки
  'шэньчжэнь': 35, // Высокий трафик
  'стамбул': 25,
  'нью-йорк': 30,
};

export async function checkFlightDelays() {
  console.log('✈️ Запуск анализатора авиарейсов...');

  // Берем активные посылки и сразу подтягиваем данные пользователя (для Telegram)
  const activeParcels = await prisma.parcel.findMany({
    where: {
      status: { in: ['Ожидается', 'В пути', 'На таможне'] },
      logisticsHub: { not: null }
    },
    include: {
      user: {
        select: { telegramChatId: true, name: true } // 🔥 Нужно для отправки алерта
      }
    }
  });

  for (const parcel of activeParcels) {
    const hub = parcel.logisticsHub!;
    // Нормализуем текст (убираем пробелы и переводим в нижний регистр)
    const normalizedHub = hub.trim().toLowerCase();
    
    const baseRisk = HUB_CONGESTION[normalizedHub] || 15;
    
    // Если посылка уже имеет высокий погодный риск, рейс почти гарантированно задержится
    const weatherImpact = (parcel.hubWeatherRisk ?? 0) > 60 ? 40 : 0;
    
    // Элемент случайности (только в плюс, чтобы риск не "прыгал" вниз-вверх на дашборде)
    const randomFactor = Math.floor(Math.random() * 15); // от 0 до +15
    
    let newFlightRisk = baseRisk + weatherImpact + randomFactor;
    newFlightRisk = Math.max(0, Math.min(newFlightRisk, 100)); // Держим в пределах 0-100

    // Защита от "дрожания": риск задержки не может магическим образом стать меньше, чем был вчера
    const currentRiskInDb = parcel.flightDelayRisk ?? 0;
    const finalRisk = Math.max(currentRiskInDb, newFlightRisk);

    // Обновляем риск задержки рейса в БД
    await prisma.parcel.update({
      where: { id: parcel.id },
      data: { flightDelayRisk: finalRisk }
    });

    // Если риск стал критическим (>= 75)
    if (finalRisk >= 75) {
      // Проверяем, не отправляли ли мы уже такой алерт по этому хабу
      const existingAlert = await prisma.alert.findFirst({
        where: { userId: parcel.userId, relatedHub: hub, type: 'delay', isResolved: false }
      });

      if (!existingAlert) {
        // 1. Создаем системный Alert в базе
        await prisma.alert.create({
          data: {
            type: 'delay',
            message: `Критический риск задержки рейса из хаба ${hub}. Посылка "${parcel.name}" может опоздать.`,
            severity: 'CRITICAL',
            relatedHub: hub,
            userId: parcel.userId
          }
        });

        // 2. 🔥 Отправляем уведомление в Telegram (если он подключен)
        if (parcel.user.telegramChatId) {
          const msg = `✈️ <b>ВНИМАНИЕ: ЗАДЕРЖКА РЕЙСА!</b>\n\n` +
                      `Груз: <b>${parcel.name}</b>\n` +
                      `Трек-код: <code>${parcel.trackCode}</code>\n` +
                      `Хаб отправления: <b>${hub}</b>\n\n` +
                      `🚨 Индекс риска логистики достиг <b>${finalRisk}%</b>. Вероятна задержка вылета из-за загруженности аэропорта или плохой погоды.`;
          
          await sendTelegramToUser(parcel.user.telegramChatId, msg);
        }
      }
    }
  }
  
  console.log(`✅ Обновлены риски рейсов для ${activeParcels.length} посылок.`);
}