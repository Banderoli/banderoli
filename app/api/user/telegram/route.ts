import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
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

// GET: Получение текущего Telegram Chat ID пользователя
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { telegramChatId: true, name: true, email: true }
    });

    return NextResponse.json({ 
      telegramChatId: user?.telegramChatId || '',
      name: user?.name || '',
      email: user?.email || ''
    });
  } catch (error) {
    console.error('Ошибка GET /api/user/telegram:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT: Сохранение или обновление Telegram Chat ID
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { telegramChatId } = await req.json();

    // Очищаем ввод от лишних пробелов
    const cleanChatId = telegramChatId ? String(telegramChatId).trim() : null;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: cleanChatId },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Telegram успешно привязан',
      telegramChatId: updatedUser.telegramChatId 
    });
  } catch (error: any) {
    console.error('Ошибка PUT /api/user/telegram:', error);
    return NextResponse.json({ error: 'Ошибка сервера при сохранении настроек' }, { status: 500 });
  }
}