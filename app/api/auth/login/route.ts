import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'parcelge-secret-key-change-in-production'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    // СРАВНИВАЕМ ПАРОЛИ: bcrypt сам поймет, совпадает ли текст с хэшем
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    const response = NextResponse.json({ success: true })
    
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7 
    })

    return response
  } catch (error) {
    console.error('Ошибка при логине:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}