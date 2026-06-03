import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'parcelge-secret-key-change-in-production'

// ПОЛУЧЕНИЕ ДАННЫХ ПРОФИЛЯ
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    return NextResponse.json({
      name: user.name, 
      email: user.email, 
      phone: user.phone, 
      idDocument: user.documentId
    })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// ОБНОВЛЕНИЕ ДАННЫХ И ПАРОЛЯ
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const body = await req.json()
    const { name, phone, idDocument, oldPassword, newPassword } = body

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    const updateData: any = { name, phone, idDocument }

    // Безопасная смена пароля
    if (oldPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 })
      }
      updateData.password = await bcrypt.hash(newPassword, 10)
    }

    await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// УДАЛЕНИЕ АККАУНТА И ВСЕХ ДАННЫХ
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    await prisma.user.delete({ 
      where: { id: decoded.userId } 
    });

    const response = NextResponse.json({ success: true, message: 'Аккаунт удален' });
    response.cookies.delete('token');
    
    return response;
  } catch (error) {
    console.error('Ошибка при удалении аккаунта:', error);
    return NextResponse.json({ error: 'Ошибка сервера при удалении' }, { status: 500 });
  }
}