import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'banderoli-secret-key-change-in-production'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    const carriers = await prisma.carrier.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json({ carriers })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    const { name, website } = await req.json()
    if (!name) return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })

    const newCarrier = await prisma.carrier.create({
      data: { name, website, userId: decoded.userId }
    })
    return NextResponse.json({ success: true, carrier: newCarrier })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.carrier.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}