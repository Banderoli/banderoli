import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose' // 🔥 ЗАМЕНА jsonwebtoken НА jose (требование Next.js)
import bcrypt from 'bcryptjs'

// Конвертируем секрет для jose
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'parcelge-secret-key-change-in-production'
)

// ПОЛУЧЕНИЕ ДАННЫХ ПРОФИЛЯ
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    return NextResponse.json({
      name: user.name, 
      email: user.email, 
      phone: user.phone, 
      telegram: (user as any).telegram || '', // страхуем, если поля нет в схеме
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
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string

    const body = await req.json()
    // Принимаем telegram из фронтенда
    const { name, phone, telegram, idDocument, oldPassword, newPassword } = body

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    // Маппим idDocument на правильное поле базы (documentId)
    const updateData: any = { 
      name, 
      phone, 
      documentId: idDocument 
    }
    
    if (telegram !== undefined) updateData.telegram = telegram;

    // Безопасная смена пароля
    if (oldPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 })
      }
      updateData.password = await bcrypt.hash(newPassword, 10)
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile PUT Error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// УДАЛЕНИЕ АККАУНТА И ВСЕХ ДАННЫХ
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    await prisma.user.delete({ 
      where: { id: userId } 
    });

    const response = NextResponse.json({ success: true, message: 'Аккаунт удален' });
    response.cookies.delete('token');
    
    return response;
  } catch (error) {
    console.error('Ошибка при удалении аккаунта:', error);
    return NextResponse.json({ error: 'Ошибка сервера при удалении' }, { status: 500 });
  }
}