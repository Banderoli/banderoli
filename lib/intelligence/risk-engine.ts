// lib/intelligence/risk-engine.ts
import { analyzeWeatherRisk } from './weather';
import { analyzeFlightStatus } from './flights';

export interface RiskAnalysisResult {
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
  projectedArrivalDate: Date | null;
}

/**
 * AI Customs-Risk Prediction Engine
 * Вычисляет вероятность растаможки и риск коллизии батчей.
 */
export async function calculateAdvancedRisk(currentParcel: any, allActiveParcels: any[]): Promise<RiskAnalysisResult> {
  const factors: string[] = [];
  let score = 0;
  
  // 1. Анализ стоимости (Закон Грузии: >= 300 GEL = растаможка)
  const val = Number(currentParcel.value) || 0;
  if (val >= 300) {
    factors.push(`Прямое превышение таможенного лимита Грузии (${val.toFixed(2)} ₾).`);
    return { riskScore: 100, riskLevel: 'HIGH', factors, projectedArrivalDate: currentParcel.expectedDate };
  }

  if (val >= 200) { score += 35; factors.push(`Высокая базовая стоимость (${val.toFixed(2)} ₾).`); }
  else if (val >= 100) { score += 15; factors.push(`Средняя базовая стоимость (${val.toFixed(2)} ₾).`); }
  else { score += 5; }

  // 2. Flight & Weather Intelligence (Сбор внешних данных)
  const weather = await analyzeWeatherRisk(currentParcel.carrier);
  const flight = await analyzeFlightStatus(currentParcel.carrier);

  let totalDelayDays = 0;
  if (weather.hasDelay) {
    totalDelayDays += weather.delayDays;
    score += 10;
    factors.push(`🌤 ${weather.alertMessage}`);
  }
  if (flight.status === 'DELAYED') {
    totalDelayDays += flight.delayDays;
    score += 15;
    factors.push(`✈️ ${flight.intelligenceMessage}`);
  }

  // Сдвигаем ожидаемую дату прибытия с учетом задержек
  let projectedDate = currentParcel.expectedDate ? new Date(currentParcel.expectedDate) : null;
  if (projectedDate && totalDelayDays > 0) {
    projectedDate.setDate(projectedDate.getDate() + totalDelayDays);
    factors.push(`⚠️ Arrival Batch смещен на ${totalDelayDays} дн. Возрастает риск коллизии.`);
  }

  // 3. Shipment Collision Analyzer (Поиск совпадений на таможне)
  if (projectedDate) {
    const projectedTime = projectedDate.getTime();
    let carrierCollision = false;
    let shopCollision = false;

    allActiveParcels.forEach(p => {
      if (p.id === currentParcel.id || !p.expectedDate) return;
      
      const pTime = new Date(p.expectedDate).getTime();
      const dayDiff = Math.abs(pTime - projectedTime) / 86400000;

      // Если после всех сдвигов из-за погоды посылки попадают в одно окно (4 дня)
      if (dayDiff <= 4 && p.recipient === currentParcel.recipient) {
        if (p.carrier === currentParcel.carrier) carrierCollision = true;
        if (p.name.toLowerCase() === currentParcel.name.toLowerCase()) shopCollision = true;
      }
    });

    if (carrierCollision) { score += 35; factors.push('Критическое совпадение arrival batch (один рейс и получатель).'); }
    if (shopCollision) { score += 20; factors.push('Совпадение отправителя/магазина (подозрение на коммерческую партию).'); }
  }

  const finalScore = Math.min(score, 100);
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (finalScore >= 61) riskLevel = 'HIGH';
  else if (finalScore >= 31) riskLevel = 'MEDIUM';

  return { riskScore: finalScore, riskLevel, factors, projectedArrivalDate: projectedDate };
}