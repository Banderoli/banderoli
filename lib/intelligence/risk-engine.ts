// lib/intelligence/risk-engine.ts

export interface RiskBreakdown {
  score: number;                   // 0–100 (Таможенный риск)
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: RiskFactor[];
  collisionProbability: number;    // Вероятность встречи на таможне (0-100)
}

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
}

export interface ParcelInput {
  id: string;
  name: string;
  trackCode: string;
  status: string;
  value: number;
  weight?: number | null;
  recipientName?: string | null;
  expectedDelivery?: Date | string | null;
  logisticsHub?: string | null;
  carrier?: string | null;
  hubWeatherRisk?: number | null;
  flightDelayRisk?: number | null;
  partner?: {
    name: string;
  } | null;
}

// ── Пороги (Законодательство Грузии и логистика) ──
export const THRESHOLDS = {
  PRICE_LIMIT_GEL: 300,
  WEIGHT_LIMIT_KG: 30,
  COLLISION_WINDOW_DAYS: 4, // Если посылки прибывают с разницей < 4 дней, они объединяются
  HOMOGENEOUS_BATCH_MIN: 3, // 3+ посылки из одного магазина = коммерческая партия
};

function num(v: any): number {
  return Number(v) || 0;
}

function dateMs(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const ms = new Date(d).getTime();
  return isNaN(ms) ? null : ms;
}

// Главная функция расчета
export function calculateRiskScore(current: ParcelInput, allParcels: ParcelInput[], ownerName: string): RiskBreakdown {
  // Не проверяем завершенные посылки
  if (['доставлено', 'утеряно', 'в архиве'].includes((current.status || '').toLowerCase())) {
    return { score: 0, level: 'LOW', factors: [], collisionProbability: 0 };
  }

  const factors: RiskFactor[] = [];
  // 🔥 ИСПРАВЛЕНО: Четко извлекаем имя получателя (строку), даже если partner — это объект из Prisma
  const recipient = current.recipientName || current.partner?.name || ownerName || 'Владелец';

  // Собираем все АКТИВНЫЕ посылки ТОГО ЖЕ получателя
  const sibling = allParcels.filter(p => 
    !['доставлено', 'утеряно', 'в архиве'].includes((p.status || '').toLowerCase()) &&
    (p.recipientName || p.partner?.name || ownerName || 'Владелец') === recipient
  );

  const totalValue = sibling.reduce((s, p) => s + num(p.value), 0);
  const totalWeight = sibling.reduce((s, p) => s + num(p.weight), 0);

  // ── 1. Стоимость (0–40 баллов) ─────────────────────────────────
  let valueScore = 0;
  if      (totalValue >= THRESHOLDS.PRICE_LIMIT_GEL)       valueScore = 40;
  else if (totalValue >= THRESHOLDS.PRICE_LIMIT_GEL * 0.8) valueScore = 25;
  else if (totalValue >= THRESHOLDS.PRICE_LIMIT_GEL * 0.6) valueScore = 15;
  
  if (valueScore > 0) {
    factors.push({
      name: 'Стоимость товаров',
      score: valueScore,
      description: `${totalValue.toFixed(2)} ₾ из ${THRESHOLDS.PRICE_LIMIT_GEL} ₾ (получатель: ${recipient})`
    });
  }

  // ── 2. Вес (0–20 баллов) ──────────────────────────────────────
  let weightScore = 0;
  if      (totalWeight >= THRESHOLDS.WEIGHT_LIMIT_KG)       weightScore = 20;
  else if (totalWeight >= THRESHOLDS.WEIGHT_LIMIT_KG * 0.8) weightScore = 10;
  
  if (weightScore > 0) {
    factors.push({ name: 'Вес посылок', score: weightScore, description: `${totalWeight.toFixed(1)} кг из ${THRESHOLDS.WEIGHT_LIMIT_KG} кг` });
  }

  // ── 3. Коллизии рейсов (Встреча на таможне) ───────────────────
  let collisionScore = 0;
  const currentMs = dateMs(current.expectedDelivery);
  
  if (currentMs && sibling.length > 1) {
    sibling.forEach(p => {
      if (p.id === current.id) return;
      const pMs = dateMs(p.expectedDelivery);
      if (!pMs) return;

      const dayDiff = Math.abs(pMs - currentMs) / 86_400_000;
      
      // Если посылки летят с разницей меньше 4 дней
      if (dayDiff <= THRESHOLDS.COLLISION_WINDOW_DAYS) {
        if (p.logisticsHub && p.logisticsHub === current.logisticsHub) {
          collisionScore += 20;
          factors.push({ name: 'Совпадение хаба', score: 20, description: `Посылки из ${current.logisticsHub} могут попасть в один рейс` });
        } else if (p.carrier && p.carrier === current.carrier) {
          collisionScore += 15;
          factors.push({ name: 'Один перевозчик', score: 15, description: `Форвардер (${current.carrier}) может объединить партии` });
        }
      }
    });
  }

  // ── 4. Задержка рейса и погода (Внешние факторы) ──────────────
  const weatherRisk = num(current.hubWeatherRisk);
  if (weatherRisk >= 50) {
    factors.push({ name: 'Погода в хабе', score: 15, description: `Погодный риск ${weatherRisk}% — задержка рейса сдвигает график доставки` });
  }

  const flightRisk = num(current.flightDelayRisk);
  if (flightRisk >= 60) {
    factors.push({ name: 'Задержка рейса', score: 15, description: `Риск задержки ${flightRisk}% — повышает шанс встречи с другими посылками` });
  }

  // ── Итог ──────────────────────────────────────────────────────
  let rawScore = factors.reduce((s, f) => s + f.score, 0);
  const score = Math.min(rawScore, 100);
  
  const level: 'LOW' | 'MEDIUM' | 'HIGH' = score >= 61 ? 'HIGH' : score >= 31 ? 'MEDIUM' : 'LOW';

  const collisionProbability = Math.min(collisionScore + (flightRisk * 0.5), 100);

  return { score, level, factors, collisionProbability };
}