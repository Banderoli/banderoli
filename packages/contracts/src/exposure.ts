import { z } from 'zod';

export const ExposureLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export type ExposureLevel = z.infer<typeof ExposureLevelSchema>;

export const ExposureResultSchema = z.object({
  recipientProfileId: z.string(),
  score: z.number().int().min(0).max(100),
  level: ExposureLevelSchema,
  totalValueGel: z.number(),
  limitGel: z.number(),
  remainingGel: z.number(),
  // ISO-дата (YYYY-MM-DD) пикового дня прибытия, по которому считается лимит; null — если
  // все посылки без даты прибытия.
  peakDay: z.string().nullable().optional(),
  alerts: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
    }),
  ),
});

export type ExposureResult = z.infer<typeof ExposureResultSchema>;

export const CUSTOMS_LIMIT_GEL = 300;
export const CUSTOMS_WEIGHT_LIMIT_KG = 30;
export const HOMOGENEOUS_GOODS_THRESHOLD = 5;

// Упрощённый курс USD→GEL для оценки стоимости в лари. Реальная FX-интеграция — позже.
export const USD_TO_GEL_RATE = 2.7;

export const EXPOSURE_ALERT_CODES = {
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  JOINT_ARRIVAL: 'JOINT_ARRIVAL',
  APPROACHING_LIMIT: 'APPROACHING_LIMIT',
  HOMOGENEOUS_GOODS: 'HOMOGENEOUS_GOODS',
  WEIGHT_EXCEEDED: 'WEIGHT_EXCEEDED',
} as const;

export type ExposureAlertCode =
  (typeof EXPOSURE_ALERT_CODES)[keyof typeof EXPOSURE_ALERT_CODES];
