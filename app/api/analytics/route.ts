import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Parcel } from '@prisma/client'; // 🔥 ИМПОРТИРУЕМ ИДЕАЛЬНЫЙ ТИП НАПРЯМУЮ ИЗ БАЗЫ

/**
 * Проверяет авторизацию пользователя
 */
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
 * Серверный движок расчета вероятности растаможки
 */
function calculateParcelRiskPercentage(current: Parcel, allParcels: Parcel[]): number {
  const status = current.status.toLowerCase();
  // Исключаем доставленные, утерянные и архивные из расчета рисков
  if (status === 'доставлено' || status === 'утеряно' || status === 'в архиве') return 0;
  
  const val = Number(current.value) || 0;
  if (val >= 300) return 100; 

  let riskPercentage = 0;
  
  if (val >= 200) riskPercentage += 35;
  else if (val >= 100) riskPercentage += 15;
  else riskPercentage += 5;

  // ИСПОЛЬЗУЕМ ПРАВИЛЬНОЕ ПОЛЕ expectedDelivery
  if (!current.expectedDelivery) return riskPercentage;
  const currentFieldsTime = new Date(current.expectedDelivery).getTime();

  let hasCarrierCollision = false;
  let hasDifferentCarrierCollision = false;
  let hasShopCollision = false;

  allParcels.forEach((p: Parcel) => {
    const pStatus = p.status.toLowerCase();
    if (p.id === current.id || pStatus === 'доставлено' || pStatus === 'утеряно' || pStatus === 'в архиве' || !p.expectedDelivery) return;
    
    const pTime = new Date(p.expectedDelivery).getTime();
    const dayDiff = Math.abs(pTime - currentFieldsTime) / 86400000;

    // ИСПОЛЬЗУЕМ ПРАВИЛЬНОЕ ПОЛЕ recipientName
    if (dayDiff <= 4 && p.recipientName === current.recipientName && current.recipientName) {
      if (p.carrier === current.carrier && current.carrier) {
        hasCarrierCollision = true;
      } else {
        hasDifferentCarrierCollision = true;
      }
      
      // ИСПОЛЬЗУЕМ ПРАВИЛЬНОЕ ПОЛЕ shop (или name как запасной вариант)
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

    // Получаем посылки (TypeScript теперь сам знает все поля благодаря импорту Prisma)
    const parcels: Parcel[] = await prisma.parcel.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    const totalParcels = parcels.length;
    const deliveredCount = parcels.filter(p => p.status.toLowerCase() === 'доставлено').length;
    const lostCount = parcels.filter(p => p.status.toLowerCase() === 'утеряно').length;

    // Безопасное сложение денег
    let totalCents = 0;
    parcels.forEach((p: Parcel) => { 
      totalCents += Math.round(((Number(p.value) || 0) + Number.EPSILON) * 100); 
    });
    const totalSpent = (totalCents / 100).toFixed(2);

    // Группировка посылок по зонам риска
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

    // Безопасный подсчет перевозчиков (учитываем, что перевозчик может быть не указан)
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