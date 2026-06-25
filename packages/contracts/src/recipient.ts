import { z } from 'zod';

export const CreateRecipientSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  isDefault: z.boolean().optional().default(false),
});

export type CreateRecipientDto = z.infer<typeof CreateRecipientSchema>;

export const UpdateRecipientSchema = CreateRecipientSchema.partial();

export type UpdateRecipientDto = z.infer<typeof UpdateRecipientSchema>;

export const RecipientResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RecipientResponse = z.infer<typeof RecipientResponseSchema>;
