import { z } from 'zod';

// Дневной бесплатный лимит ИИ-запросов на пользователя.
export const AI_DAILY_LIMIT = 10;

// ─── Запросы ──────────────────────────────────────────────────────────────────

export const ReviewRequestSchema = z.object({
  url: z.string().url().max(2000),
});

export type ReviewRequestDto = z.infer<typeof ReviewRequestSchema>;

export const ProductSearchRequestSchema = z.object({
  description: z.string().trim().min(3).max(500),
});

export type ProductSearchRequestDto = z.infer<typeof ProductSearchRequestSchema>;

// ─── Квота ──────────────────────────────────────────────────────────────────

export const AiQuotaSchema = z.object({
  used: z.number().int().min(0),
  limit: z.number().int().positive(),
  remaining: z.number().int().min(0),
});

export type AiQuota = z.infer<typeof AiQuotaSchema>;

// ─── Результаты ───────────────────────────────────────────────────────────────

export const AiSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});

export const ReviewSummarySchema = z.object({
  productTitle: z.string(),
  sourceUrl: z.string(),
  rating: z.number().min(0).max(5).nullable(),
  sentiment: z.enum(['positive', 'mixed', 'negative']),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  summary: z.string(),
  sources: z.array(AiSourceSchema),
  generatedByAi: z.boolean(),
});

export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

export const ProductSuggestionSchema = z.object({
  title: z.string(),
  reason: z.string(),
  exampleQuery: z.string(),
});

export type ProductSuggestion = z.infer<typeof ProductSuggestionSchema>;

// ─── Ответы (результат + остаток квоты) ──────────────────────────────────────

export const ReviewResponseSchema = z.object({
  summary: ReviewSummarySchema,
  quota: AiQuotaSchema,
});

export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export const ProductSearchResponseSchema = z.object({
  suggestions: z.array(ProductSuggestionSchema),
  generatedByAi: z.boolean(),
  quota: AiQuotaSchema,
});

export type ProductSearchResponse = z.infer<typeof ProductSearchResponseSchema>;
