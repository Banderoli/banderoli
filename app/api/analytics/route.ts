import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { Parcel } from '@prisma/client'; 

async function getUserId(): Promise<string | null> {
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

/**
 * 🔥 СЕРВЕРНЫЙ ДВИЖОК РИСКОВ:
 * Считает суммы и столкновения только для каждого получателя в отдельности!
 */
function calculateParcelRiskPercentage(current: Parcel, allParcels: Parcel[]): number {
  const status = current.status.toLowerCase();
  if (status === 'доставлено' || status === 'утеряно' || status === 'в архиве') return 0;
  
  const currentRecipient = current.recipientName || 'Владелец';
  
  // 1. Собираем активные посылки ТОЛЬКО ЭТОГО получателя
  let totalValue = 0;
  let totalWeight = 0;
  
  const activeParcels = allParcels.filter(p => {
    const pStatus = p.status.toLowerCase();
    return pStatus !== 'доставлено' && pStatus !== 'утеряно' && pStatus !== 'в архиве';
  });

  activeParcels.forEach(p => {
    const pRec = p.recipientName || 'Владелец';
    if (pRec === currentRecipient) {
      totalValue += Number(p.value) || 0;
      totalWeight += Number(p.weight) || 0;
    }
  });

  // Если этот конкретный человек уже превысил лимит — риск 100%
  if (totalValue >= 300 || totalWeight >= 30) return 100; 

  let riskPercentage = 0;
  
  if (totalValue >= 200) riskPercentage += 35;
  else if (totalValue >= 100) riskPercentage += 15;
  else riskPercentage += 5;

  if (!current.expectedDelivery) return riskPercentage;
  const currentFieldsTime = new Date(current.expectedDelivery).getTime();

  let hasCarrierCollision = false;
  let hasDifferentCarrierCollision = false;
  let hasShopCollision = false;

  activeParcels.forEach((p: Parcel) => {
    if (p.id === current.id || !p.expectedDelivery) return;
    
    // Проверяем столкновения посылок ТОЛЬКО для одного и того же получателя
    const pRec = p.recipientName || 'Владелец';
    if (pRec !== currentRecipient) return; 
    
    const pTime = new Date(p.expectedDelivery).getTime();
    const dayDiff = Math.abs(pTime - currentFieldsTime) / 86400000;

    if (dayDiff <= 4) {
      const cCarrier = current.carrier || 'Не указан';
      const pCarrier = p.carrier || 'Не указан';
      
      if (pCarrier === cCarrier && cCarrier !== 'Не указан') {
        hasCarrierCollision = true;
      } else if (cCarrier !== 'Не указан' && pCarrier !== 'Не указан') {
        hasDifferentCarrierCollision = true;
      }
      
      const pShop = p.shop || p.name;
      const cShop = current.shop || current.name;
      if (pShop.toLowerCase() === cShop.toLowerCase()) {
        hasShopCollision = true;
      }
    }
  });

  if (hasCarrierCollision) riskPercentage += 35;
  if (hasDifferentCarrierCollision) riskPercentage += 15;
  if (hasShopCollision) riskPercentage += 15;

  return Math.min(riskPercentage, 100);
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const parcels: Parcel[] = await prisma.parcel.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    const totalParcels = parcels.length;
    const deliveredCount = parcels.filter(p => p.status.toLowerCase() === 'доставлено').length;
    const lostCount = parcels.filter(p => p.status.toLowerCase() === 'утеряно').length;

    let totalCents = 0;
    parcels.forEach((p: Parcel) => { 
      totalCents += Math.round(((Number(p.value) || 0) + Number.EPSILON) * 100); 
    });
    const totalSpent = (totalCents / 100).toFixed(2);

    let lowRiskCount = 0;
    let medRiskCount = 0;
    let highRiskCount = 0;

    parcels.forEach((p: Parcel) => {
      const status = p.status.toLowerCase();
      if (status !== 'доставлено' && status !== 'утеряно' && status !== 'в архиве') {
        const percent = calculateParcelRiskPercentage(p, parcels);
        if (percent >= 61) highRiskCount++;
        else if (percent >= 31) medRiskCount++;
        else lowRiskCount++;
      }
    });

    const carrierCounts: Record<string, number> = {};
    parcels.forEach((p: Parcel) => {
      const carrierName = p.carrier || 'Не указан';
      carrierCounts[carrierName] = (carrierCounts[carrierName] || 0) + 1;
    });
    
    const carrierData = Object.keys(carrierCounts).map(name => ({
      name,
      value: carrierCounts[name]
    }));

    const monthlyStatsCents: Record<string, number> = {};
    parcels.forEach((p: Parcel) => {
      const date = new Date(p.createdAt);
      const month = date.toLocaleString('ru-RU', { month: 'short', year: '2-digit' });
      monthlyStatsCents[month] = (monthlyStatsCents[month] || 0) + Math.round(((Number(p.value) || 0) + Number.EPSILON) * 100);
    });
    
    const monthlyData = Object.keys(monthlyStatsCents).map(name => ({
      name,
      total: Number((monthlyStatsCents[name] / 100).toFixed(2))
    }));

    return NextResponse.json({
      stats: { 
        totalParcels, 
        deliveredCount, 
        lostCount, 
        totalSpent,
        lowRiskCount,
        medRiskCount,
        highRiskCount
      },
      carrierData,
      monthlyData
    });

  } catch (error) {
    console.error('Ошибка аналитики:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}