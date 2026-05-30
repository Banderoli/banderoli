import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'parcelge-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const parcels = await prisma.parcel.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    const totalParcels = parcels.length;
    const deliveredCount = parcels.filter(p => p.status === 'доставлено').length;
    const lostCount = parcels.filter(p => p.status === 'утеряно').length;

    // ИСПРАВЛЕНИЕ: Добавляем EPSILON при каждом сложении тетри
    let totalCents = 0;
    parcels.forEach(p => { 
      totalCents += Math.round(((Number(p.value) || 0) + Number.EPSILON) * 100); 
    });
    const totalSpent = (totalCents / 100).toFixed(2);

    const carrierCounts: Record<string, number> = {};
    parcels.forEach(p => {
      carrierCounts[p.carrier] = (carrierCounts[p.carrier] || 0) + 1;
    });
    const carrierData = Object.keys(carrierCounts).map(name => ({
      name,
      value: carrierCounts[name]
    }));

    const monthlyStatsCents: Record<string, number> = {};
    parcels.forEach(p => {
      const date = new Date(p.createdAt);
      const month = date.toLocaleString('ru-RU', { month: 'short', year: '2-digit' });
      
      // ИСПРАВЛЕНИЕ: Применяем защиту EPSILON для графиков расходов
      monthlyStatsCents[month] = (monthlyStatsCents[month] || 0) + Math.round(((Number(p.value) || 0) + Number.EPSILON) * 100);
    });
    
    const monthlyData = Object.keys(monthlyStatsCents).map(name => ({
      name,
      total: Number((monthlyStatsCents[name] / 100).toFixed(2))
    }));

    return NextResponse.json({
      stats: { totalParcels, deliveredCount, lostCount, totalSpent },
      carrierData,
      monthlyData
    });

  } catch (error) {
    console.error('Ошибка аналитики:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}