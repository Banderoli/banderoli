import { z } from 'zod';

// Имена очередей BullMQ — единый источник для продюсера (api-gateway) и консьюмера (worker)
export const QUEUE_NAMES = {
  TRACKING: 'tracking',
  EXPOSURE: 'exposure',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  REFRESH_PARCEL: 'refresh-parcel',
  RECALCULATE_EXPOSURE: 'recalculate-exposure',
  SEND_TELEGRAM: 'send-telegram',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

// ─── Payload-схемы заданий ────────────────────────────────────────────────────

export const RefreshParcelJobSchema = z.object({
  parcelId: z.string().cuid(),
});

export type RefreshParcelJob = z.infer<typeof RefreshParcelJobSchema>;

export const RecalculateExposureJobSchema = z.object({
  recipientProfileId: z.string().cuid(),
});

export type RecalculateExposureJob = z.infer<typeof RecalculateExposureJobSchema>;

export const SendTelegramJobSchema = z.object({
  telegramChatId: z.string().min(1),
  message: z.string().min(1).max(4096),
});

export type SendTelegramJob = z.infer<typeof SendTelegramJobSchema>;
