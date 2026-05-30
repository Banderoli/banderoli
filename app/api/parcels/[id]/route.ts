import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'parcelge-secret-key-change-in-production'

// УДАЛЕНИЕ ПОСЫЛКИ
export async function DELETE(req: NextRequest, { params }: { params: any }) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован (отсутствует токен)' }, { status: 401 })
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    // Универсальный способ извлечения ID, работающий и в Next.js 14, и в Next.js 15+
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return NextResponse.json({ error: 'Идентификатор посылки (ID) не найден' }, { status: 400 })
    }

    // Удаляем строго ту посылку, которая принадлежит текущему пользователю
    await prisma.parcel.delete({
      where: { 
        id: id,
        userId: decoded.userId 
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка в API DELETE /api/parcels/[id]:', error)
    return NextResponse.json({ error: 'Ошибка сервера при удалении посылки из базы данных' }, { status: 500 })
  }
}

// ОБНОВЛЕНИЕ (РЕДАКТИРОВАНИЕ) ПОСЫЛКИ
export async function PUT(req: NextRequest, { params }: { params: any }) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    // Делаем параметры асинхронными и для метода редактирования
    const resolvedParams = await params
    const id = resolvedParams.id

    const body = await req.json()
    const { trackCode, name, value, carrier, expectedDate, purchaseDate, recipient, comment, status } = body

    const updatedParcel = await prisma.parcel.update({
      where: { id: id, userId: decoded.userId },
      data: {
        trackCode, name, carrier, recipient, comment, status,
        value: parseFloat(value),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      }
    })

    return NextResponse.json({ success: true, parcel: updatedParcel })
  } catch (error) {
    console.error('Ошибка в API PUT /api/parcels/[id]:', error)
    return NextResponse.json({ error: 'Ошибка сервера при обновлении данных' }, { status: 500 })
  }
}