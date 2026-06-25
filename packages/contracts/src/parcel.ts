import { z } from 'zod';

export const ParcelStatusSchema = z.enum([
  'PENDING',
  'IN_TRANSIT',
  'IN_CUSTOMS',
  'CUSTOMS_CLEARED',
  'DELIVERED',
  'RETURNED',
  'EXCEPTION',
]);

export type ParcelStatus = z.infer<typeof ParcelStatusSchema>;

export const CreateParcelSchema = z.object({
  recipientProfileId: z.string().cuid(),
  trackingNumber: z.string().min(4).max(100).trim(),
  carrier: z.string().max(50).trim().optional(),
  store: z.string().max(100).trim().optional(),
  description: z.string().max(255).trim().optional(),
  declaredValueUsd: z.number().positive().max(100_000).optional(),
  weightKg: z.number().positive().max(1000).optional(),
  quantity: z.number().int().positive().max(1000).optional().default(1),
});

export type CreateParcelDto = z.infer<typeof CreateParcelSchema>;

export const UpdateParcelSchema = CreateParcelSchema.partial().omit({
  recipientProfileId: true,
});

export type UpdateParcelDto = z.infer<typeof UpdateParcelSchema>;

export const ParcelResponseSchema = z.object({
  id: z.string(),
  recipientProfileId: z.string(),
  trackingNumber: z.string(),
  carrier: z.string().nullable(),
  store: z.string().nullable(),
  description: z.string().nullable(),
  declaredValueUsd: z.number().nullable(),
  declaredValueGel: z.number().nullable(),
  weightKg: z.number().nullable(),
  quantity: z.number().int().positive(),
  status: ParcelStatusSchema,
  currentExposureScore: z.number().int().min(0).max(100),
  estimatedArrival: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ParcelResponse = z.infer<typeof ParcelResponseSchema>;

export const LogisticsEventResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  occurredAt: z.string().datetime(),
});

export type LogisticsEventResponse = z.infer<typeof LogisticsEventResponseSchema>;

export const ParcelDetailResponseSchema = ParcelResponseSchema.extend({
  events: z.array(LogisticsEventResponseSchema),
});

export type ParcelDetailResponse = z.infer<typeof ParcelDetailResponseSchema>;
