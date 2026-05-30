import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification } from '../../../../lib/telegram';
import { prisma } from '../../../../lib/prisma';// Относительный путь

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow.setHours(0, 0, 0, 0));
    const end = new Date(tomorrow.setHours(23, 59, 59, 999));

    const parcels = await prisma.parcel.findMany({
      where: { status: 'ожидается', expectedDate: { gte: start, lte: end } },
      include: { user: true }
    });

    for (const p of parcels) {
      if (p.user.telegramChatId) {
        await sendTelegramNotification(p.user.telegramChatId, `📦 Завтра прибывает: ${p.name}`);
      }
    }
    return NextResponse.json({ success: true, count: parcels.length });
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}