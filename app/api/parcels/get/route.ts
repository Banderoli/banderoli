// app/api/parcels/get/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { calculateAdvancedRisk } from '../../../../lib/intelligence/risk-engine';

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'parcelge-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const parcels = await prisma.parcel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const activeParcels = parcels.filter(p => p.status !== 'доставлено' && p.status !== 'утеряно');
    
    // Прогоняем активные посылки через AI Engine
    const parcelsWithIntelligence = await Promise.all(parcels.map(async (parcel) => {
      if (parcel.status === 'доставлено' || parcel.status === 'утеряно') {
        return { ...parcel, aiAnalysis: null };
      }
      const analysis = await calculateAdvancedRisk(parcel, activeParcels);
      return { ...parcel, aiAnalysis: analysis };
    }));

    return NextResponse.json({ parcels: parcelsWithIntelligence });
  } catch (error) {
    console.error('Ошибка GET /api/parcels/get:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}