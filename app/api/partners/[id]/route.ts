// app/api/partners/[id]/route.ts
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
    const partnerId = resolvedParams.id;
    if (!partnerId) return NextResponse.json({ error: 'ID партнера не найден' }, { status: 400 });

    // deleteMany защищает от ошибки Prisma, если запись не найдена, и позволяет искать по 2 полям
    const result = await prisma.partner.deleteMany({
      where: { 
        id: partnerId,
        userId: userId // ГАРАНТИЯ: Удаляется только если принадлежит текущему юзеру
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Партнер не найден или нет доступа' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE /partners/[id]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}