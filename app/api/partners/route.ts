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

// GET: Получить всех партнеров пользователя
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    // Достаем имя самого пользователя (Владельца) и его партнеров
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { partners: true } // Prisma автоматически подтянет всех партнеров
    });

    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    return NextResponse.json({ 
      ownerName: user.name, 
      partners: user.partners 
    });
  } catch (error) {
    console.error('Ошибка GET /api/partners:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST: Добавить нового партнера
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const data = await req.json();

    if (!data.name) {
      return NextResponse.json({ error: 'Имя партнера обязательно' }, { status: 400 });
    }

    const partner = await prisma.partner.create({
      data: {
       name: data.name,
        phone: data.phone || null,
        documentId: data.idDocument || null, // <-- ИСПРАВЛЕНО (слева documentId)
        isActive: true, 
        userId: userId
      }
    });

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('Ошибка POST /api/partners:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE: Удалить партнера
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { id } = await req.json();

    // Защита: проверяем, что партнер принадлежит именно этому пользователю
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner || partner.userId !== userId) {
      return NextResponse.json({ error: 'Партнер не найден или нет прав' }, { status: 403 });
    }

    await prisma.partner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE /api/partners:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}