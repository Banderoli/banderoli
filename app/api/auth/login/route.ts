import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

// Простая защита от брутфорса (перебора паролей)
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
    const ip = req.headers.get('x-forwarded-for') || 'unknown'

    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Подождите 15 минут.' },
        { status: 429 }
      )
    }

    const { email, password } = await req.json()

    // 1. Проверяем, что переданы все данные
    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 })
    }

    // 2. Ищем пользователя в базе данных
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // В целях безопасности мы не говорим, что "пользователь не найден", 
      // чтобы злоумышленники не могли перебирать email-адреса.
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    // 3. Проверяем правильность пароля
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    // 4. ГЕНЕРИРУЕМ JWT ТОКЕН
    const secretKey = process.env.JWT_SECRET || 'parcelge-secret-key'
    const secret = new TextEncoder().encode(secretKey)
    
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h') // Токен действует 24 часа
      .sign(secret)

   // 5. Записываем токен в защищенные куки
    // ДОБАВЛЕН AWAIT
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24
    });

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error) {
    console.error('Ошибка при входе:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}