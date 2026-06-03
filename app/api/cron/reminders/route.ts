import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramToUser } from '@/lib/telegram'; // Используем надежный абсолютный путь
import { prisma } from '@/lib/prisma'; // Используем надежный абсолютный путь

export const dynamic = 'force-dynamic'; // Указываем Next.js, что этот роут нельзя кешировать

export async function GET(req: NextRequest) {
  try {
    // 1. Проверка авторизации
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('⚠️ Попытка несанкционированного запуска cron-задачи');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Формируем временные рамки "Завтра"
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow.setHours(0, 0, 0, 0));
    const end = new Date(tomorrow.setHours(23, 59, 59, 999));

    // 3. Запрашиваем посылки из БД
    const parcels = await prisma.parcel.findMany({
      where: { 
        status: 'ожидается', 
        expectedDelivery: { gte: start, lte: end } 
      },
      include: { user: true }
    });

    if (parcels.length === 0) {
      return NextResponse.json({ success: true, message: 'На завтра нет ожидаемых посылок' });
    }

    // 4. ОПТИМИЗАЦИЯ: Формируем массив задач для параллельной отправки
    const notificationPromises = parcels
      .filter(p => p.user?.telegramChatId) // <-- ТЕПЕРЬ ТУТ ПРАВИЛЬНОЕ ПОЛЕ
      .map(p => sendTelegramToUser(p.user.telegramChatId!, `📦 Завтра прибывает: ${p.name}`)); // <-- И ТУТ

    // 5. Выполняем все отправки ОДНОВРЕМЕННО
    const results = await Promise.allSettled(notificationPromises);

    // 6. Собираем статистику для логов сервера
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Cron завершен. Найдено: ${parcels.length}. Отправлено: ${successful}. Ошибок: ${failed}`);

    return NextResponse.json({ 
      success: true, 
      totalFound: parcels.length,
      sent: successful,
      failed: failed
    });

  } catch (error) {
    console.error('❌ Ошибка в cron-задаче:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}