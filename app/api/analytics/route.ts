import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'banderoli-secret-key-change-in-production'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    // Получаем все посылки пользователя
    const parcels = await prisma.parcel.findMany({ 
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'asc' }
    })
    
    // 1. Считаем расходы по месяцам (для линейного графика)
    const monthlyDataMap: Record<string, number> = {}
    parcels.forEach(p => {
      // Используем дату добавления или ожидаемую дату
      const date = p.expectedDate ? new Date(p.expectedDate) : new Date(p.createdAt)
      const monthYear = date.toLocaleString('ru-RU', { month: 'short', year: 'numeric' })
      
      monthlyDataMap[monthYear] = (monthlyDataMap[monthYear] || 0) + p.value
    })
    
    // Превращаем объект в массив для библиотеки графиков
    const monthlyData = Object.keys(monthlyDataMap).map(key => ({
      name: key,
      total: monthlyDataMap[key]
    }))

    // 2. Распределение по перевозчикам (для круговой диаграммы)
    const carrierDataMap: Record<string, number> = {}
    parcels.forEach(p => {
      carrierDataMap[p.carrier] = (carrierDataMap[p.carrier] || 0) + 1
    })
    
    const carrierData = Object.keys(carrierDataMap).map(key => ({
      name: key,
      value: carrierDataMap[key]
    }))

    // 3. Общая краткая статистика
    const totalSpent = parcels.reduce((sum, p) => sum + p.value, 0)
    const totalParcels = parcels.length
    const deliveredCount = parcels.filter(p => p.status === 'доставлено').length

    return NextResponse.json({ 
      monthlyData, 
      carrierData, 
      stats: { totalSpent, totalParcels, deliveredCount } 
    })
  } catch (error) {
    console.error('Ошибка GET /api/analytics:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}