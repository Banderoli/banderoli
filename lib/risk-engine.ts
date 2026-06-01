import { Parcel } from '@prisma/client';

export interface RiskAnalysis {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
}

export function analyzeCustomsRisk(
  targetParcel: Parcel, 
  allActiveParcels: Parcel[], 
  weatherRiskScore: number = 0
): RiskAnalysis {
  let score = 0;
  const factors: string[] = [];

  if (targetParcel.value >= 300) {
    score += 80;
    factors.push('Превышен беспошлинный лимит (300 GEL)');
  }
  if (targetParcel.weight && targetParcel.weight >= 30) {
    score += 50;
    factors.push('Превышен весовой лимит коммерческой партии (30 кг)');
  }

  const overlappingParcels = allActiveParcels.filter(p => 
    p.id !== targetParcel.id && 
    p.recipientName === targetParcel.recipientName && 
    p.status !== 'Доставлено' &&
    p.status !== 'Утеряно'
  );

  let collisionValue = targetParcel.value;
  let hasShopCollision = false;
  let hasCarrierCollision = false;

  overlappingParcels.forEach(p => {
    if (p.shop && targetParcel.shop && p.shop.toLowerCase() === targetParcel.shop.toLowerCase()) {
      hasShopCollision = true;
    }
    if (p.carrier && targetParcel.carrier && p.carrier.toLowerCase() === targetParcel.carrier.toLowerCase()) {
      hasCarrierCollision = true;
    }
    
    if (p.expectedDelivery && targetParcel.expectedDelivery) {
      const diffDays = Math.abs(p.expectedDelivery.getTime() - targetParcel.expectedDelivery.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 3) {
        collisionValue += p.value;
      }
    } else {
      collisionValue += p.value;
    }
  });

  if (collisionValue >= 300 && overlappingParcels.length > 0) {
    score += 60;
    factors.push(`Риск объединения рейсов! Общая сумма в пути: ${collisionValue.toFixed(2)} GEL`);
  }

  if (hasShopCollision && hasCarrierCollision) {
    score += 40;
    factors.push('Высокая вероятность Warehouse Collision (один магазин и перевозчик)');
  }

  if (weatherRiskScore > 50 && overlappingParcels.length > 0) {
    score += 30;
    factors.push('Задержка из-за непогоды: риск скопления грузов на границе увеличен');
  }

  score = Math.min(Math.max(score, 0), 100);

  let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (score > 60) level = 'HIGH';
  else if (score > 30) level = 'MEDIUM';

  return { score, level, factors };
}