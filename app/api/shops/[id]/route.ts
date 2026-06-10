import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'parcelge-secret-key-change-in-production');

// 🔥 ИЗМЕНЕНИЕ: Типизация params как Promise
export async function DELETE(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> } 
) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    // 🔥 ИЗМЕНЕНИЕ: Ожидание params
    const { id } = await context.params;

    // Убеждаемся, что магазин существует и принадлежит пользователю
    const shop = await prisma.shop.findFirst({
      where: { id: id, userId }
    });

    if (!shop) return NextResponse.json({ error: 'Магазин не найден' }, { status: 404 });

    await prisma.shop.delete({ where: { id: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}