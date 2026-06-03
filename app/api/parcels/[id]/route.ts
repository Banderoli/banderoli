import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Используем красивый алиас пути
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// ── Вспомогательная функция проверки токена ──
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'parcelge-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch { return null; }
}

// ── PATCH: ДЛЯ КНОПОК "Доставлено", "Утеряно", "В архив" (Быстрое обновление статуса) ──
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const parcelId = resolvedParams.id;
    const body = await req.json();

    // Формируем объект обновления. Позволяет безопасно менять статус на "Архив" и другие.
    const updateData: any = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Защита от пустого запроса
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
    }

    // Обновляем (updateMany защищает от обновления чужой посылки)
    const updatedParcel = await prisma.parcel.updateMany({
      where: { 
        id: parcelId,
        userId: userId 
      },
      data: updateData
    });

    if (updatedParcel.count === 0) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка PATCH /api/parcels/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


// ── PUT: ДЛЯ КНОПКИ "Изменить" (Полное редактирование формы) ──
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const parcelId = resolvedParams.id;
    const body = await req.json();

    const existing = await prisma.parcel.findUnique({ where: { id: parcelId } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    // Безопасная обработка чисел (теперь позволяет обнулять вес, если пользователь его стер)
    const safeValue = body.value !== undefined 
        ? (typeof body.value === 'string' ? parseFloat(body.value.replace(',', '.')) : body.value) 
        : existing.value;
        
    const safeWeight = body.weight !== undefined 
        ? (body.weight ? parseFloat(String(body.weight).replace(',', '.')) : null) 
        : existing.weight;

    // Безопасная обработка дат (позволяет стирать дату доставки/покупки)
    const safeExpectedDelivery = body.expectedDelivery !== undefined 
        ? (body.expectedDelivery ? new Date(body.expectedDelivery) : null) 
        : existing.expectedDelivery;

    const safePurchaseDate = body.purchaseDate !== undefined 
        ? (body.purchaseDate ? new Date(body.purchaseDate) : null) 
        : existing.purchaseDate;

    // Используем строгое !== undefined, чтобы пустые строки ("") корректно стирали данные в БД
    const updatedParcel = await prisma.parcel.update({
      where: { id: parcelId },
      data: {
        trackCode: body.trackCode !== undefined ? body.trackCode : existing.trackCode,
        name: body.name !== undefined ? body.name : existing.name,
        shop: body.shop !== undefined ? body.shop : existing.shop,
        value: safeValue,
        weight: safeWeight,
        carrier: body.carrier !== undefined ? body.carrier : existing.carrier,
        expectedDelivery: safeExpectedDelivery,
        purchaseDate: safePurchaseDate,
        recipientName: body.recipientName !== undefined ? body.recipientName : existing.recipientName,
        comment: body.comment !== undefined ? body.comment : existing.comment,
        status: body.status !== undefined ? body.status : existing.status,
      }
    });

    return NextResponse.json({ success: true, parcel: updatedParcel });
  } catch (error) {
    console.error('Ошибка PUT /api/parcels/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


// ── DELETE: Для удаления посылки ──
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const parcelId = resolvedParams.id;
    
    const existing = await prisma.parcel.findUnique({ where: { id: parcelId } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    await prisma.parcel.delete({ where: { id: parcelId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE /api/parcels/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}