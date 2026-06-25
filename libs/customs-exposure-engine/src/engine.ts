import {
  EXPOSURE_ALERT_CODES,
  type ExposureLevel,
  type ExposureResult,
} from '@banderoli/contracts';
import {
  DEFAULT_EXPOSURE_CONFIG,
  type ExposureRuleConfig,
  type ParcelExposureInput,
} from './types';

interface DayGroup {
  key: string;
  count: number;
  valueGel: number;
  weightKg: number;
}

type ExposureAlert = ExposureResult['alerts'][number];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function dayKey(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : 'unscheduled';
}

// Консолидация: посылки одного получателя группируются по операционному дню прибытия.
function groupByDay(parcels: readonly ParcelExposureInput[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const parcel of parcels) {
    const key = dayKey(parcel.estimatedArrival);
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      existing.valueGel += parcel.valueGel;
      existing.weightKg += parcel.weightKg;
    } else {
      groups.set(key, {
        key,
        count: 1,
        valueGel: parcel.valueGel,
        weightKg: parcel.weightKg,
      });
    }
  }

  return [...groups.values()];
}

function pickWorstDay(groups: readonly DayGroup[]): DayGroup | null {
  return groups.reduce<DayGroup | null>((worst, group) => {
    if (!worst || group.valueGel > worst.valueGel) {
      return group;
    }
    return worst;
  }, null);
}

function scoreToLevel(score: number): ExposureLevel {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  return 'HIGH';
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Считает таможенную экспозицию получателя по дереву решений из базы знаний.
 * Назначение — прозрачность: показать вероятность и величину налогового события
 * и обязанности пользователя. Не оптимизирует обход контроля.
 */
export function calculateExposure(
  recipientProfileId: string,
  parcels: readonly ParcelExposureInput[],
  config: ExposureRuleConfig = DEFAULT_EXPOSURE_CONFIG,
): ExposureResult {
  const alerts: ExposureAlert[] = [];
  const groups = groupByDay(parcels);
  const worstDay = pickWorstDay(groups);
  const totalValueGel = round2(worstDay?.valueGel ?? 0);

  let score = 0;

  if (worstDay && worstDay.valueGel > config.limitGel) {
    // Проверка 1: суммарная стоимость за один операционный день превышает лимит.
    score = 100;
    alerts.push({
      code: EXPOSURE_ALERT_CODES.LIMIT_EXCEEDED,
      message: `Порог ${config.limitGel} GEL превышен (≈${round2(
        worstDay.valueGel,
      )} GEL за ${worstDay.key}). Вероятен НДС 18% и пошлина на всю совокупную стоимость — заложите в бюджет.`,
    });
  } else if (worstDay) {
    // Проверка 2: совместное прибытие нескольких личных посылок в один день.
    if (worstDay.count > 1) {
      score += config.jointArrivalScore;
      alerts.push({
        code: EXPOSURE_ALERT_CODES.JOINT_ARRIVAL,
        message: `Совместное прибытие ${worstDay.count} посылок (${worstDay.key}): совокупная стоимость ≈${round2(
          worstDay.valueGel,
        )} GEL. При превышении ${config.limitGel} GEL НДС начисляется на всю сумму.`,
      });
    }

    if (worstDay.valueGel >= config.limitGel * config.approachingLimitRatio) {
      score = Math.max(score, config.approachingScore);
      alerts.push({
        code: EXPOSURE_ALERT_CODES.APPROACHING_LIMIT,
        message: `Стоимость ≈${round2(
          worstDay.valueGel,
        )} GEL приближается к лимиту ${config.limitGel} GEL. Новые посылки в тот же день могут привести к налогу.`,
      });
    }
  }

  // Однородность: 5+ единиц однотипного товара — маркер коммерческой партии.
  const homogeneousParcel = parcels.find(
    (parcel) => parcel.quantity >= config.homogeneousThreshold,
  );
  if (homogeneousParcel) {
    score = Math.max(score, config.homogeneousScore);
    alerts.push({
      code: EXPOSURE_ALERT_CODES.HOMOGENEOUS_GOODS,
      message: `Обнаружено ${homogeneousParcel.quantity}+ единиц однотипного товара — ввоз может быть переквалифицирован как коммерческий с полным оформлением.`,
    });
  }

  // Вес: превышение 30 кг за день переводит отправление в коммерческую категорию.
  if (worstDay && worstDay.weightKg > config.weightLimitKg) {
    score = Math.max(score, config.approachingScore);
    alerts.push({
      code: EXPOSURE_ALERT_CODES.WEIGHT_EXCEEDED,
      message: `Вес ≈${round2(worstDay.weightKg)} кг за ${worstDay.key} превышает ${config.weightLimitKg} кг — отправление может быть переведено в категорию коммерческих.`,
    });
  }

  const finalScore = clampScore(score);

  return {
    recipientProfileId,
    score: finalScore,
    level: scoreToLevel(finalScore),
    totalValueGel,
    limitGel: config.limitGel,
    remainingGel: round2(Math.max(0, config.limitGel - totalValueGel)),
    alerts,
  };
}
