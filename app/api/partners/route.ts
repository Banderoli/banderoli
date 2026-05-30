import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'banderoli-secret-key-change-in-production'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    const partners = await prisma.partner.findMany({ 
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json({ partners })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const { name, phone, idDocument } = await req.json()

    if (!name) return NextResponse.json({ error: 'Имя обязательно' }, { status: 400 })

    const newPartner = await prisma.partner.create({
      data: { name, phone, idDocument, isActive: true, userId: decoded.userId }
    })
    return NextResponse.json({ success: true, partner: newPartner })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// DELETE теперь обрабатывается здесь же или через динамический роут
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.partner.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}