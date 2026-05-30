import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'parcelge-secret-key-change-in-production'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    // Получаем все посылки текущего пользователя
    const parcels = await prisma.parcel.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ parcels })
  } catch (error) {
    console.error('Ошибка получения:', error)
    return NextResponse.json({ parcels: [] }) // Возвращаем пустой список при ошибке
  }
}