'use server';

import type { ProductSearchResponse, ReviewResponse } from '@banderoli/contracts';
import { auth } from '@/auth';
import { aiExtractCart, aiProductSearch, aiReviews } from '@/lib/api';
import type { CartExtraction } from '@/lib/cart-vision';

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

export interface CartImportState {
  ok?: boolean;
  data?: CartExtraction;
  remaining?: number;
  error?: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function extractCartAction(formData: FormData): Promise<CartImportState> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Сессия истекла, войдите снова' };
  }

  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Файл не выбран' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: 'Файл больше 5 МБ — уменьшите масштаб скриншота' };
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

  try {
    const { data, quota } = await aiExtractCart(session.user.id, base64, file.type);
    return { ok: true, data, remaining: quota.remaining };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('429') || message.includes('QUOTA')) {
      return { error: 'Дневной лимит ИИ-запросов исчерпан. Попробуйте завтра.' };
    }
    return { error: message || 'Не удалось распознать скриншот' };
  }
}
