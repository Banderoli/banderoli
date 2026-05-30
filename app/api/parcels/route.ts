import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'parcelge-secret-key-change-in-production'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    const body = await req.json()
    const { trackCode, name, value, carrier, purchaseDate, expectedDate, recipient, comment, status } = body

    if (!trackCode || !name || !value) {
      return NextResponse.json({ error: 'Не заполнены обязательные поля' }, { status: 400 })
    }

    const parcel = await prisma.parcel.create({
      data: {
        userId: decoded.userId,
        trackCode, name, carrier, recipient,
        comment: comment || null,
        status: status || 'ожидается',
        value: parseFloat(value),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
      },
    })

    return NextResponse.json({ success: true, parcel })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}