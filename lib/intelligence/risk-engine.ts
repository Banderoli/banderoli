// lib/risk-engine.ts

export function calculateParcelRiskPercentage(current: any, allParcels: any[]): number {
  const currentStatus = (current.status || '').toLowerCase();
  if (currentStatus === 'доставлено' || currentStatus === 'утеряно') return 0;
  
  const val = Number(current.value) || 0;
  if (val >= 300) return 100; // Прямое превышение лимита в 300 GEL

  let riskPercentage = 0;
  if (val >= 200) riskPercentage += 35;
  else if (val >= 100) riskPercentage += 15;
  else riskPercentage += 5;

  if (!current.expectedDate && !current.expectedDelivery) return riskPercentage;
  
  // Поддерживаем оба названия полей даты
  const dateStr = current.expectedDate || current.expectedDelivery;
  const currentFieldsTime = new Date(dateStr).getTime();

  let hasCarrierCollision = false;
  let hasDifferentCarrierCollision = false;
  let hasShopCollision = false;

  allParcels.forEach((p: any) => {
    const pStatus = (p.status || '').toLowerCase();
    const pDateStr = p.expectedDate || p.expectedDelivery;
    
    if (p.id === current.id || pStatus === 'доставлено' || pStatus === 'утеряно' || !pDateStr) return;
    
    const pTime = new Date(pDateStr).getTime();
    const dayDiff = Math.abs(pTime - currentFieldsTime) / 86400000;

    if (dayDiff <= 4 && p.recipientName === current.recipientName) {
      if (p.carrier === current.carrier) hasCarrierCollision = true;
      else hasDifferentCarrierCollision = true;
      
      if ((p.shop || '').toLowerCase() === (current.shop || '').toLowerCase()) hasShopCollision = true;
    }
  });

  if (hasCarrierCollision) riskPercentage += 35;
  if (hasDifferentCarrierCollision) riskPercentage += 15;
  if (hasShopCollision) riskPercentage += 15;

  return Math.min(riskPercentage, 100);
}