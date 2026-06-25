import {
  CUSTOMS_LIMIT_GEL,
  CUSTOMS_WEIGHT_LIMIT_KG,
  HOMOGENEOUS_GOODS_THRESHOLD,
} from '@banderoli/contracts';

// Вход для одной посылки получателя (стоимость уже сконвертирована в GEL и в number).
export interface ParcelExposureInput {
  valueGel: number;
  weightKg: number;
  quantity: number;
  estimatedArrival: Date | null;
}

// Настраиваемые коэффициенты. В рантайме подгружаются из таблицы CustomsRule;
// дефолты соответствуют нормам rs.ge и дереву решений из базы знаний.
export interface ExposureRuleConfig {
  limitGel: number;
  weightLimitKg: number;
  approachingLimitRatio: number;
  jointArrivalScore: number;
  approachingScore: number;
  homogeneousScore: number;
  homogeneousThreshold: number;
}

export const DEFAULT_EXPOSURE_CONFIG: ExposureRuleConfig = {
  limitGel: CUSTOMS_LIMIT_GEL,
  weightLimitKg: CUSTOMS_WEIGHT_LIMIT_KG,
  approachingLimitRatio: 0.8,
  jointArrivalScore: 50,
  approachingScore: 40,
  homogeneousScore: 40,
  homogeneousThreshold: HOMOGENEOUS_GOODS_THRESHOLD,
};
