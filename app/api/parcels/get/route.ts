import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // 1. Преобразуем строку секрета в Uint8Array
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'parcelge-secret-key')

    // 2. Используем правильную переменную для результата (payload вместо decoded)
    const { payload } = await jwtVerify(token, secret)
    
    // 3. Теперь payload.userId доступен
    const userId = payload.userId as string

    const parcels = await prisma.parcel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ parcels })
  } catch (error) {
    console.error('Ошибка получения:', error)
    return NextResponse.json({ parcels: [] }, { status: 500 })
  }
}