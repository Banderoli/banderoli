import { z } from 'zod';

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  error: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationDto = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  });
