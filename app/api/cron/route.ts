import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkCarrierDelays } from '@/lib/monitor';
import { checkWeatherAlerts } from '@/lib/weather';

export async function GET() {
  try {
    // 1. Очищаем старые неразрешенные автоматические оповещения, чтобы избежать накопления дубликатов
    await prisma.alert.deleteMany({
      where: { isResolved: false }
    });

    // 2. Выполняем автоматический анализ погоды во всех 4-х транзитных хабах
    await checkWeatherAlerts();

    // 3. Выгружаем все динамически добавленные пользователями почтовые службы
    const carriers = await prisma.carrier.findMany({
      where: {
        NOT: { website: null }
      }
    });

    // 4. Запускаем парсер сайтов для каждой пользовательской интеграции
    for (const carrier of carriers) {
      if (carrier.website && carrier.website.startsWith('http')) {
        await checkCarrierDelays(carrier.name, carrier.website);
      }
    }

    return NextResponse.json({ success: true, message: 'Автоматический мониторинг хабов и служб успешно завершен.' });
  } catch (error) {
    console.error('[Критическая ошибка Cron]:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при выполнении фонового мониторинга' }, { status: 500 });
  }
}