import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Распознавание скриншота корзины магазина: ИИ извлекает позиции, магазин,
// стоимость доставки и валюту, чтобы автозаполнить форму посылки. Назначение —
// помочь честному импортёру быстро завести посылку, не вводя всё вручную.

const SUPPORTED_MEDIA = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const CartItemSchema = z.object({
  name: z.string().min(1).max(120),
  price: z.number().nonnegative(),
});

const CartExtractionSchema = z.object({
  store: z.string().max(100).nullable(),
  currency: z.string().max(8).nullable(),
  items: z.array(CartItemSchema),
  shipping: z.number().nonnegative().nullable(),
  total: z.number().nonnegative().nullable(),
});

export type CartExtraction = z.infer<typeof CartExtractionSchema>;

export interface CartVisionResult {
  ok: boolean;
  data?: CartExtraction;
  error?: string;
}

const SYSTEM_PROMPT = [
  'Ты — парсер скриншотов корзины интернет-магазина для трекера личных посылок.',
  'По изображению извлеки структуру корзины. Возвращай ТОЛЬКО JSON-объект без markdown и пояснений со схемой:',
  '{ "store": string|null, "currency": string|null, "items": [{ "name": string, "price": number }], "shipping": number|null, "total": number|null }',
  '- store: название магазина, если видно (иначе null).',
  '- currency: код валюты корзины (USD, EUR, GEL...), если определимо (иначе null).',
  '- items: каждая товарная позиция отдельной строкой; price — цена за позицию числом (без символа валюты).',
  '- shipping: стоимость доставки числом, если указана (иначе null).',
  '- total: итоговая сумма корзины числом, если указана (иначе null).',
  'Если данных нет — верни пустой items и null для остального. Не выдумывай значения.',
].join('\n');

function stripJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

export async function extractCartFromImage(
  base64: string,
  mediaType: string,
): Promise<CartVisionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'ИИ-распознавание не настроено на сервере (нет ANTHROPIC_API_KEY)' };
  }
  if (!SUPPORTED_MEDIA.has(mediaType)) {
    return { ok: false, error: 'Поддерживаются изображения PNG, JPEG, WEBP или GIF' };
  }

  const client = new Anthropic({ apiKey });

  let raw: string;
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
                data: base64,
              },
            },
            { type: 'text', text: 'Извлеки корзину из этого скриншота строго по схеме (только JSON).' },
          ],
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) {
      return { ok: false, error: 'ИИ-распознавание: неверный ANTHROPIC_API_KEY' };
    }
    if (status === 429) {
      return { ok: false, error: 'ИИ-сервис перегружен, попробуйте позже' };
    }
    return { ok: false, error: 'Не удалось обратиться к ИИ-распознаванию' };
  }

  try {
    const parsed = CartExtractionSchema.parse(JSON.parse(stripJson(raw)));
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: 'Не удалось разобрать корзину на скриншоте — заполните вручную' };
  }
}
