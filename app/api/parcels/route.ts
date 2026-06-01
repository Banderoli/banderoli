import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Валидация
    if (!body.trackCode || !body.name || body.value === undefined) {
      return NextResponse.json({ message: "Не заполнены обязательные поля" }, { status: 400 });
    }

    // Ищем партнера по имени, чтобы привязать посылку к нужному лимиту
    let partnerId = null;
    let recipientName = "Владелец";

    if (body.partner && body.partner.trim() !== '') {
      const partner = await prisma.partner.findFirst({
        where: { name: { equals: body.partner.trim(), mode: 'insensitive' } }
      });
      if (partner) {
        partnerId = partner.id;
        recipientName = partner.name;
      } else {
        recipientName = body.partner; // Если не нашли в базе, просто пишем имя
      }
    }

    // Создание в БД
    const newParcel = await prisma.parcel.create({
      data: {
        trackCode: body.trackCode,
        name: body.name,
        value: Number(body.value),
        weight: body.weight ? Number(body.weight) : null,
        shop: body.shop || null,
        carrier: body.carrier || null,
        partnerId: partnerId,
        recipientName: recipientName,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
        comment: body.comment || null,
        status: 'Ожидается'
      }
    });

    return NextResponse.json({ success: true, parcel: newParcel });
  } catch (error) {
    console.error("Ошибка создания посылки:", error);
    return NextResponse.json({ message: "Ошибка сохранения в БД" }, { status: 500 });
  }
}