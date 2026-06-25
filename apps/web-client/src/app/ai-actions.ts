'use server';

import type { ProductSearchResponse, ReviewResponse } from '@banderoli/contracts';
import { auth } from '@/auth';
import { aiProductSearch, aiReviews } from '@/lib/api';

export interface ReviewActionState {
  result?: ReviewResponse;
  error?: string;
}

export interface SearchActionState {
  result?: ProductSearchResponse;
  error?: string;
}

function quotaError(error: unknown): string {
  return String(error).includes('429')
    ? 'Дневной лимит ИИ-запросов исчерпан. Попробуйте завтра.'
    : 'Не удалось выполнить запрос. Проверьте, что API-шлюз запущен.';
}

export async function reviewsAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Сессия истекла, войдите снова' };
  }

  const url = String(formData.get('url') ?? '').trim();
  if (!/^https?:\/\//i.test(url)) {
    return { error: 'Введите корректную ссылку на товар (http/https)' };
  }

  try {
    const result = await aiReviews(session.user.id, url);
    return { result };
  } catch (error) {
    return { error: quotaError(error) };
  }
}

export async function productSearchAction(
  _prev: SearchActionState,
  formData: FormData,
): Promise<SearchActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Сессия истекла, войдите снова' };
  }

  const description = String(formData.get('description') ?? '').trim();
  if (description.length < 3) {
    return { error: 'Опишите товар подробнее (минимум 3 символа)' };
  }

  try {
    const result = await aiProductSearch(session.user.id, description);
    return { result };
  } catch (error) {
    return { error: quotaError(error) };
  }
}
