// app/api/auth/register/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 });
    }

    // Шифруем пароль (10 - уровень соли)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // Сохраняем зашифрованный пароль
        name,
      },
    });

    return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email } });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}