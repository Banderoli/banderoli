import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkFlightDelays } from '@/lib/intelligence/flights';
// Предполагаем, что файл risk-engine у тебя сохранен из ответа Claude
import { calculateRiskScore } from '@/lib/intelligence/risk-engine'; 

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Базовая защита крон-задачи (в продакшене добавь CRON_SECRET в .env)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 Запуск глобального сканирования логистики...');

    // 1. Очищаем старые решенные алерты, чтобы не забивать базу
    await prisma.alert.deleteMany({ where: { isResolved: true } });

    // 2. Обновляем авиарейсы
    await checkFlightDelays();

    // 3. Пересчитываем таможенные риски (Collision Risk) для ВСЕХ пользователей
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    let updatedCount = 0;

    for (const user of allUsers) {
      const userParcels = await prisma.parcel.findMany({
        where: { userId: user.id, status: { notIn: ['Доставлено', 'Утеряно', 'В архиве'] } }
      });

      for (const parcel of userParcels) {
        // Пропускаем через risk-engine (если он у тебя установлен)
        const risk = calculateRiskScore(parcel as any, userParcels as any[]);
        
        await prisma.parcel.update({
          where: { id: parcel.id },
          data: { 
            customsRiskScore: risk.score, 
            collisionRisk: risk.collisionProbability 
          }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron завершен: Рейсы проверены, ${updatedCount} посылок пересчитано на коллизии.`
    });

  } catch (error) {
    console.error('🚨 Ошибка в Cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}