// app/api/cron/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkFlightDelays } from '@/lib/intelligence/flights';
import { calculateRiskScore } from '@/lib/intelligence/risk-engine'; 
import { sendTelegramToUser } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Защита крон-задачи (проверяет секретный ключ в заголовках)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 Запуск глобального сканирования логистики и пересчета рисков...');

    // 1. Очищаем старые решенные алерты
    await prisma.alert.deleteMany({ where: { isResolved: true } });

    // 2. Обновляем авиарейсы (вызов заглушки)
    await checkFlightDelays();

    // 3. Загружаем пользователей со всеми их активными посылками и получателями
    const allUsers = await prisma.user.findMany({
      include: {
        parcels: {
          where: { status: { notIn: ['Доставлено', 'Утеряно', 'В архиве'] } },
          include: { partner: true }
        }
      }
    });

    let updatedCount = 0;
    let alertsSentCount = 0;

    for (const user of allUsers) {
      // Подготавливаем массив посылок в формате, который ждет risk-engine
      const mappedParcels = user.parcels.map(p => ({
        ...p,
        partner: p.partner ? { name: p.partner.name } : null
      }));

      for (const parcel of user.parcels) {
        const formattedParcel = {
          ...parcel,
          partner: parcel.partner ? { name: parcel.partner.name } : null
        };

        // Запускаем пересчет рисков
        const risk = calculateRiskScore(formattedParcel, mappedParcels, user.name);
        
        // Запоминаем старый риск посылки из базы, чтобы сравнить его
        const oldRiskScore = parcel.customsRiskScore || 0;
        const newRiskScore = risk.score;

        // Обновляем данные рисков в базе данных Prisma
        await prisma.parcel.update({
          where: { id: parcel.id },
          data: { 
            customsRiskScore: newRiskScore, 
            collisionRisk: risk.collisionProbability 
          }
        });

        updatedCount++;

        // 🔥 DELTA CHECK + TELEGRAM TRIGGER
        // Если риск вырос и стал опасным (>= 60), а раньше был безопасным (< 60)
        if (oldRiskScore < 60 && newRiskScore >= 60 && user.telegramChatId) {
          const recipient = parcel.recipientName || parcel.partner?.name || user.name || 'Владелец';
          
          // Создаем красивое сообщение для Telegram
          const msg = `⚠️ <b>ОБНАРУЖЕН ТАМОЖЕННЫЙ РИСК!</b>\n\n` +
                      `Груз: <b>${parcel.name}</b>\n` +
                      `Трек-код: <code>${parcel.trackCode}</code>\n` +
                      `Получатель: <b>${recipient}</b>\n\n` +
                      `🚨 Индекс опасности коллизии вырос до <b>${newRiskScore}%</b>.\n` +
                      `Посылки этого получателя могут пересечься на границе и превысить беспошлинный лимит Грузии в 300 ₾. Рекомендуется распределить грузы или изменить получателя.`;
          
          // Отправляем пользователю в чат
          await sendTelegramToUser(user.telegramChatId, msg);
          alertsSentCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron успешно завершен. Пересчитано посылок: ${updatedCount}. Отправлено критических алертов в Telegram: ${alertsSentCount}.`
    });

  } catch (error) {
    console.error('🚨 Фатальная ошибка в Cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}