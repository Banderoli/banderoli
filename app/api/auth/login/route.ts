// app/api/auth/login/route.ts
import bcrypt from 'bcryptjs'; // или 'bcrypt', в зависимости от того, что у тебя в package.json
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';
// Если используешь bcrypt для хеширования паролей, раскомментируй:
// import bcrypt from 'bcrypt';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'parcelge-secret-key'
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }

    // Ищем пользователя в базе
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Проверка пароля (раскомментируй нужный вариант)
    // Вариант 1: Обычный текст (для дебага/старой версии)
   const isPasswordValid = await bcrypt.compare(password, user.password);

if (!isPasswordValid) {
  return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
}

    // Создаем JWT токен
    const token = await new SignJWT({ 
        userId: user.id, 
        email: user.email, 
        name: user.name 
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d') // Токен живет 7 дней
      .sign(JWT_SECRET);

    // Отправляем успешный ответ и устанавливаем cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 7 дней
    });

    return response;

  } catch (error) {
    console.error('Ошибка при логине:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}