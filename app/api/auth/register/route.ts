import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs' // Импортируем библиотеку

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email уже используется' }, { status: 400 })
    }

    // ШИФРУЕМ ПАРОЛЬ: цифра 10 — это "соль" (уровень сложности шифрования)
    const hashedPassword = await bcrypt.hash(password, 10)

    // Сохраняем в базу зашифрованный пароль
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name 
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка при регистрации:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}