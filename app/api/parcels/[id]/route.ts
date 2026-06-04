import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

// ── PATCH: Быстрое обновление статуса ──
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const parcelId = resolvedParams.id;
    const body = await req.json();

    const updateData: any = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
    }

    const updatedParcel = await prisma.parcel.updateMany({
      where: { id: parcelId, userId: userId },
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

// ── PUT: Полное редактирование формы ──
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

    const safeValue = body.value !== undefined 
        ? (typeof body.value === 'string' ? parseFloat(body.value.replace(',', '.')) : body.value) 
        : existing.value;
        
    const safeWeight = body.weight !== undefined 
        ? (body.weight ? parseFloat(String(body.weight).replace(',', '.')) : null) 
        : existing.weight;

    const safeExpectedDelivery = body.expectedDelivery !== undefined 
        ? (body.expectedDelivery ? new Date(body.expectedDelivery) : null) 
        : existing.expectedDelivery;

    const safePurchaseDate = body.purchaseDate !== undefined 
        ? (body.purchaseDate ? new Date(body.purchaseDate) : null) 
        : existing.purchaseDate;

    const parsedRecipientName = body.recipientName !== undefined 
        ? (body.recipientName || null) 
        : existing.recipientName;
        
    const parsedComment = body.comment !== undefined 
        ? (body.comment || null) 
        : existing.comment;

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
        recipientName: parsedRecipientName,
        comment: parsedComment,
        status: body.status !== undefined ? body.status : existing.status,
      }
    });

    return NextResponse.json({ success: true, parcel: updatedParcel });
  } catch (error: any) {
    console.error('Ошибка PUT /api/parcels/[id]:', error);
    
    // 🔥 Ловим ошибку P2002 (Дубликат трек-кода) и возвращаем понятный текст
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Посылка с таким трек-кодом уже существует в системе!' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Ошибка сервера при сохранении' }, { status: 500 });
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