import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

/**
 * Проверяет авторизацию пользователя по токену в cookies.
 * @returns {Promise<string | null>} ID пользователя или null, если не авторизован.
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
 * Серверный движок расчета вероятности растаможки в процентах (0-100%).
 * Учитывает стоимость и логистические коллизии (совпадения).
 * 
 * @param current Посылка, для которой рассчитывается риск
 * @param allParcels Все активные посылки пользователя для поиска совпадений
 * @returns {number} Итоговый процент риска (максимум 100)
 */
function calculateParcelRiskPercentage(current: any, allParcels: any[]): number {
  if (current.status === 'доставлено' || current.status === 'утеряно') return 0;
  
  const val = Number(current.value) || 0;
  // По закону Грузии, >= 300 лари — это 100% растаможка
  if (val >= 300) return 100; 

  let riskPercentage = 0;
  
  // 1. Формируем базовый процент риска на основе стоимости
  if (val >= 200) riskPercentage += 35;
  else if (val >= 100) riskPercentage += 15;
  else riskPercentage += 5;

  if (!current.expectedDate) return riskPercentage;
  const currentFieldsTime = new Date(current.expectedDate).getTime();

  // 2. Ищем совпадения в транзитных хабах (окно 4 дня)
  let hasCarrierCollision = false;
  let hasDifferentCarrierCollision = false;
  let hasShopCollision = false;

  allParcels.forEach(p => {
    if (p.id === current.id || p.status === 'доставлено' || p.status === 'утеряно' || !p.expectedDate) return;
    
    const pTime = new Date(p.expectedDate).getTime();
    const dayDiff = Math.abs(pTime - currentFieldsTime) / 86400000;

    // Если посылки летят на одно имя в одно и то же время
    if (dayDiff <= 4 && p.recipient === current.recipient) {
      if (p.carrier === current.carrier) {
        hasCarrierCollision = true; // Один рейс/перевозчик
      } else {
        hasDifferentCarrierCollision = true; // Разные перевозчики, но встретятся на таможне
      }
      if (p.name.toLowerCase() === current.name.toLowerCase()) {
        hasShopCollision = true; // Подозрение на коммерческую партию
      }
    }
  });

  // Начисляем дополнительные проценты за совпадения
  if (hasCarrierCollision) riskPercentage += 35;
  if (hasDifferentCarrierCollision) riskPercentage += 15;
  if (hasShopCollision) riskPercentage += 15;

  // Ограничиваем максимальный риск до 100%
  return Math.min(riskPercentage, 100);
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

    // Безопасное сложение денег (с защитой от бага копеек)
    let totalCents = 0;
    parcels.forEach(p => { 
      totalCents += Math.round(((Number(p.value) || 0) + Number.EPSILON) * 100); 
    });
    const totalSpent = (totalCents / 100).toFixed(2);

    // Группировка посылок по зонам риска (в процентах)
    let lowRiskCount = 0;
    let medRiskCount = 0;
    let highRiskCount = 0;

    parcels.forEach(p => {
      if (p.status !== 'доставлено' && p.status !== 'утеряно') {
        const percent = calculateParcelRiskPercentage(p, parcels);
        if (percent >= 61) highRiskCount++;
        else if (percent >= 31) medRiskCount++;
        else lowRiskCount++;
      }
    });

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