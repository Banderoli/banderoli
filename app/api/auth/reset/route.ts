// app/api/auth/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, resetToken, newPassword } = await req.json();

    if (!email || !resetToken || !newPassword) {
      return NextResponse.json({ error: 'Недостаточно данных' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        resetToken,
        resetTokenExpiry: { gt: new Date() }, // Токен еще не истек
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Неверный или просроченный токен' }, { status: 400 });
    }

    // Шифруем новый пароль
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}