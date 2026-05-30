import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Ультимативная финансовая функция с защитой Number.EPSILON
function parseMoney(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  let str = String(val).replace(',', '.');
  str = str.replace(/[^0-9.]/g, '');
  const num = Number(str);
  if (isNaN(num)) return 0;
  
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.parcel.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Посылка не найдена или нет прав' }, { status: 403 });
    }

    // Применяем парсер только если цена была передана
    let safeValue = undefined;
    if (data.value !== undefined && data.value !== null && data.value !== '') {
      safeValue = parseMoney(data.value);
    }

    const updatedParcel = await prisma.parcel.update({
      where: { id },
      data: {
        trackCode: data.trackCode,
        name: data.name,
        value: safeValue,
        carrier: data.carrier,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        recipient: data.recipient,
        comment: data.comment,
        status: data.status
      }
    });

    return NextResponse.json({ success: true, parcel: updatedParcel });
  } catch (error) {
    console.error('Ошибка PUT /api/parcels/[id]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.parcel.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Посылка не найдена или нет прав' }, { status: 403 });
    }

    await prisma.parcel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE /api/parcels/[id]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}