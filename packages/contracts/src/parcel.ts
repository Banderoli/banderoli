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

export const ParcelItemInputSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  priceUsd: z.number().nonnegative().max(100_000),
});

export type ParcelItemInput = z.infer<typeof ParcelItemInputSchema>;

export const CreateParcelSchema = z.object({
  recipientProfileId: z.string().cuid(),
  name: z.string().max(120).trim().optional(),
  trackingNumber: z.string().min(4).max(100).trim().optional(),
  carrier: z.string().max(50).trim().optional(),
  store: z.string().max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  items: z.array(ParcelItemInputSchema).max(50).optional(),
  shippingCostUsd: z.number().nonnegative().max(100_000).optional(),
  declaredValueUsd: z.number().positive().max(100_000).optional(),
  weightKg: z.number().positive().max(1000).optional(),
  quantity: z.number().int().positive().max(1000).optional().default(1),
  purchasedAt: z.string().optional(),
  estimatedArrival: z.string().optional(),
});

export type CreateParcelDto = z.infer<typeof CreateParcelSchema>;

export const UpdateParcelSchema = CreateParcelSchema.partial().omit({
  recipientProfileId: true,
});

export type UpdateParcelDto = z.infer<typeof UpdateParcelSchema>;

export const ParcelItemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceUsd: z.number(),
});

export type ParcelItemResponse = z.infer<typeof ParcelItemResponseSchema>;

export const ParcelResponseSchema = z.object({
  id: z.string(),
  recipientProfileId: z.string(),
  name: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  carrier: z.string().nullable(),
  store: z.string().nullable(),
  description: z.string().nullable(),
  items: z.array(ParcelItemResponseSchema),
  declaredValueUsd: z.number().nullable(),
  declaredValueGel: z.number().nullable(),
  shippingCostUsd: z.number().nullable(),
  weightKg: z.number().nullable(),
  quantity: z.number().int().positive(),
  status: ParcelStatusSchema,
  currentExposureScore: z.number().int().min(0).max(100),
  purchasedAt: z.string().datetime().nullable(),
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
