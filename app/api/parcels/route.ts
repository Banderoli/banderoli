// app/api/parcels/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { calculateParcelRiskPercentage } from '@/lib/intelligence/risk-engine';
import { sendTelegramAlert } from '@/lib/telegram';

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'parcelge-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

// ── GET: Отдаем посылки УЖЕ С РАССЧИТАННЫМ РИСКОМ ──
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ message: "Не авторизован" }, { status: 401 });

    const parcels = await prisma.parcel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Рассчитываем риск для КАЖДОЙ посылки "на лету"
    const enrichedParcels = parcels.map((parcel, _, all) => {
      const riskScore = calculateParcelRiskPercentage(parcel, all);
      return { ...parcel, riskScore }; // Добавляем поле riskScore в ответ
    });

    return NextResponse.json({ parcels: enrichedParcels });
  } catch (error) {
    return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
  }
}

// ── POST: Создаем посылку и ПРОВЕРЯЕМ РИСК для TELEGRAM ──
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ message: "Не авторизован" }, { status: 401 });

    const body = await req.json();
    if (!body.trackCode || !body.name || body.value === undefined) {
      return NextResponse.json({ message: "Не заполнены обязательные поля" }, { status: 400 });
    }

    let partnerId = null;
    let recipientName = "Владелец";
    if (body.partner && body.partner.trim() !== '') {
      const partner = await prisma.partner.findFirst({
        where: { userId, name: { equals: body.partner.trim(), mode: 'insensitive' } }
      });
      if (partner) { partnerId = partner.id; recipientName = partner.name; } 
      else recipientName = body.partner;
    }

    // 1. Создаем посылку
    const newParcel = await prisma.parcel.create({
      data: {
        userId, trackCode: body.trackCode, name: body.name, value: Number(body.value),
        weight: body.weight ? Number(body.weight) : null, shop: body.shop || null,
        carrier: body.carrier || null, partnerId, recipientName,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
        comment: body.comment || null, status: 'Ожидается'
      }
    });

    // 2. Достаем все активные посылки, чтобы рассчитать риск новой с учетом старых
    const allParcels = await prisma.parcel.findMany({ where: { userId } });
    const currentRisk = calculateParcelRiskPercentage(newParcel, allParcels);

    // 3. ОТПРАВЛЯЕМ TELEGRAM АЛЕРТ, если риск HIGH (>= 61)
    if (currentRisk >= 61) {
      const alertMsg = `
🚨 <b>ВНИМАНИЕ: ВЫСОКИЙ РИСК ТАМОЖНИ!</b> 🚨
<b>Риск совпадения:</b> ${currentRisk}%
📦 <b>Посылка:</b> ${newParcel.name}
💰 <b>Стоимость:</b> ${newParcel.value} GEL
👤 <b>Получатель:</b> ${newParcel.recipientName}
✈️ <b>Ожидается:</b> ${newParcel.expectedDelivery ? new Date(newParcel.expectedDelivery).toLocaleDateString('ru-RU') : 'Неизвестно'}

<i>Рекомендуем изменить получателя, если возможно!</i>`;
      await sendTelegramAlert(alertMsg);
    }

    return NextResponse.json({ success: true, parcel: { ...newParcel, riskScore: currentRisk } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Ошибка сохранения" }, { status: 500 });
  }
}