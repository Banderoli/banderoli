import { z } from 'zod';

export const CreateStoreSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  url: z.string().url().max(500).optional(),
});

export type CreateStoreDto = z.infer<typeof CreateStoreSchema>;

export const StoreResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type StoreResponse = z.infer<typeof StoreResponseSchema>;

export const CreateCarrierSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export type CreateCarrierDto = z.infer<typeof CreateCarrierSchema>;

export const CarrierResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export type CarrierResponse = z.infer<typeof CarrierResponseSchema>;
