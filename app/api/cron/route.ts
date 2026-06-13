// app/api/cron/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkFlightDelays } from '@/lib/intelligence/flights';
import { calculateRiskScore } from '@/lib/intelligence/risk-engine'; 
import { sendTelegramToUser } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Защита крон-задачи
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 Запуск глобального сканирования логистики и пересчета рисков...');

    // 1. Очищаем старые решенные алерты
    await prisma.alert.deleteMany({ where: { isResolved: true } });

    // 2. Обновляем авиарейсы
    await checkFlightDelays();

    // 3. Загружаем пользователей со всеми их активными посылками
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
        
        const oldRiskScore = parcel.customsRiskScore || 0;
        const newRiskScore = risk.score;

        // Обновляем данные в БД
        await prisma.parcel.update({
          where: { id: parcel.id },
          data: { 
            customsRiskScore: newRiskScore, 
            collisionRisk: risk.collisionProbability 
          }
        });

        updatedCount++;

        // 🔥 DELTA CHECK (ЗАЩИТА ОТ СПАМА)
        // Бот пишет ТОЛЬКО если риск только что превысил лимит (был < 60, стал >= 60)
        if (oldRiskScore < 60 && newRiskScore >= 60 && user.telegramChatId) {
          const recipient = parcel.recipientName || parcel.partner?.name || user.name || 'Владелец';
          
          const msg = `⚠️ <b>ОБНАРУЖЕН ТАМОЖЕННЫЙ РИСК!</b>\n\n` +
                      `Груз: <b>${parcel.name}</b>\n` +
                      `Трек-код: <code>${parcel.trackCode}</code>\n` +
                      `Получатель: <b>${recipient}</b>\n\n` +
                      `🚨 Индекс опасности коллизии вырос до <b>${newRiskScore}%</b>.\n` +
                      `Посылки этого получателя могут пересечься на границе и превысить беспошлинный лимит Грузии в 300 ₾. Рекомендуется распределить грузы или изменить получателя.`;
          
          // Отправляем сообщение асинхронно, чтобы не тормозить цикл
          sendTelegramToUser(user.telegramChatId, msg).catch(err => 
            console.error(`Ошибка отправки Telegram юзеру ${user.telegramChatId}:`, err)
          );
          
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