import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Чистый импорт
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Вспомогательная функция (такая же, как в route.ts для безопасности)
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'banderoli-secret-key-change-in-production');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch { return null; }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    // В Next.js 15 params является Promise, поэтому мы делаем await
    const resolvedParams = await params;
    const carrierId = resolvedParams.id;
    
    if (!carrierId) return NextResponse.json({ error: 'ID перевозчика не найден' }, { status: 400 });

    // Используем deleteMany, чтобы удалить только в том случае, если ID перевозчика совпадает и он принадлежит юзеру
    const result = await prisma.carrier.deleteMany({
      where: { 
        id: carrierId,
        userId: userId // ГАРАНТИЯ БЕЗОПАСНОСТИ: Только свои службы
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Служба не найдена или у вас нет доступа' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE /api/carriers/[id]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}