import { Injectable } from '@nestjs/common';
import type { ProductSuggestion, ReviewSummary } from '@banderoli/contracts';
import type { AiProvider } from './ai-provider';

function titleFromUrl(url: string): { title: string; host: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const segment = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
    const cleaned = decodeURIComponent(segment)
      .replace(/\.\w+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    return { title: cleaned.length > 0 ? cleaned : host, host };
  } catch {
    return { title: 'Товар', host: 'источник' };
  }
}

/**
 * Мок ИИ-движка (Этап «ИИ функции», без ключей). Возвращает правдоподобную
 * структуру, помеченную как сгенерированную НЕ ИИ (usesRealAi=false).
 * Реальный Claude-адаптер реализует тот же интерфейс AiProvider.
 */
@Injectable()
export class MockAiProvider implements AiProvider {
  readonly usesRealAi = false;

  async reviewsForUrl(url: string): Promise<ReviewSummary> {
    const { title, host } = titleFromUrl(url);

    return {
      productTitle: title,
      sourceUrl: url,
      rating: 4.2,
      sentiment: 'positive',
      pros: ['Соответствует описанию', 'Хорошее соотношение цена/качество', 'Быстрая доставка у большинства'],
      cons: ['Встречаются жалобы на упаковку', 'Размер может отличаться'],
      summary:
        'Демонстрационная сводка отзывов (реальный ИИ-движок ещё не подключён). ' +
        'После подключения Claude здесь будет агрегированный анализ отзывов с разных площадок.',
      sources: [{ title: `Страница товара (${host})`, url }],
      generatedByAi: false,
    };
  }

  async productsForDescription(description: string): Promise<ProductSuggestion[]> {
    const query = description.trim();
    return [
      {
        title: `Вариант по запросу: «${query}»`,
        reason: 'Наиболее близкое совпадение по ключевым словам описания.',
        exampleQuery: query,
      },
      {
        title: `Бюджетная альтернатива: «${query}»`,
        reason: 'Похожие характеристики при меньшей цене (демо-подбор).',
        exampleQuery: `${query} cheap`,
      },
      {
        title: `Премиум-вариант: «${query}»`,
        reason: 'Выше качество/бренд (демо-подбор).',
        exampleQuery: `${query} premium`,
      },
    ];
  }
}
