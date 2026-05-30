import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function getUserId() {
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

// PUT: Обновление
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    // Ожидаем promise параметров
    const resolvedParams = await params;
    const parcelId = resolvedParams.id;

    if (!parcelId) {
      return NextResponse.json({ error: 'ID посылки не найден' }, { status: 400 });
    }

    const data = await req.json();

    const existing = await prisma.parcel.findUnique({ where: { id: parcelId } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Посылка не найдена' }, { status: 403 });
    }

    // Использование parseMoney для точности
    const safeValue = data.value !== undefined ? Math.round((parseFloat(String(data.value).replace(',', '.')) + Number.EPSILON) * 100) / 100 : existing.value;

    const updatedParcel = await prisma.parcel.update({
      where: { id: parcelId },
      data: {
        trackCode: data.trackCode || existing.trackCode,
        name: data.name || existing.name,
        value: safeValue,
        carrier: data.carrier || existing.carrier,
        status: data.status || existing.status,
        recipient: data.recipient || existing.recipient,
        comment: data.comment,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : existing.expectedDate,
      }
    });

    return NextResponse.json({ success: true, parcel: updatedParcel });
  } catch (error) {
    console.error('Ошибка PUT:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE: Удаление
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const resolvedParams = await params;
    const parcelId = resolvedParams.id;

    if (!parcelId) return NextResponse.json({ error: 'ID не найден' }, { status: 400 });

    await prisma.parcel.delete({ where: { id: parcelId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}