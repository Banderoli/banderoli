import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

// 1. Простая защита от спама (ограничение количества запросов)
const attempts = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }

  if (record.count >= 5) return false

  record.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    // Получаем IP пользователя для защиты от спама
    const ip = req.headers.get('x-forwarded-for') || 'unknown'

    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Подождите 15 минут.' },
        { status: 429 }
      )
    }

    // Читаем данные, которые прислал пользователь
    const { email, password, name } = await req.json()

    // 2. Базовая проверка данных (валидация)
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Все поля обязательны' }, 
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Пароль должен быть минимум 8 символов' }, 
        { status: 400 }
      )
    }

    // 3. Проверяем, нет ли уже пользователя с таким email
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' }, 
        { status: 400 }
      )
    }

    // 4. Безопасно хешируем пароль и сохраняем пользователя в базу
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    })

    // 5. ГЕНЕРАЦИЯ JWT ТОКЕНА
    const secretKey = process.env.JWT_SECRET || 'parcelge-secret-key'
    const secret = new TextEncoder().encode(secretKey)
    
    // Создаем токен-пропуск со сроком жизни 24 часа
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret)

    // 6. ЗАПИСЬ В COOKIES (С использованием await для новых версий Next.js)
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'token',
      value: token,
      httpOnly: true, // Защищает от кражи токена скриптами
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 1 день в секундах
    })

    // Возвращаем успешный ответ
    return NextResponse.json({ success: true, userId: user.id })
    
  } catch (error) {
    console.error('Ошибка при регистрации:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}