// app/api/carriers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const resolvedParams = await params;
    const carrierId = resolvedParams.id;
    if (!carrierId) return NextResponse.json({ error: 'ID перевозчика не найден' }, { status: 400 });

    const result = await prisma.carrier.deleteMany({
      where: { 
        id: carrierId,
        userId: userId // ГАРАНТИЯ: Только свои службы
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Служба не найдена или нет доступа' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE /carriers/[id]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}