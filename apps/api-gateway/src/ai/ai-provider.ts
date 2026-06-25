import type { ProductSuggestion, ReviewSummary } from '@banderoli/contracts';

export interface AiProvider {
  // true — реальный LLM (Claude), false — мок-заглушка.
  readonly usesRealAi: boolean;
  reviewsForUrl(url: string): Promise<ReviewSummary>;
  productsForDescription(description: string): Promise<ProductSuggestion[]>;
}

// DI-токен: мок сейчас, реальный Claude-адаптер подключается через тот же интерфейс.
export const AI_PROVIDER = Symbol('AI_PROVIDER');
