'use client';

import { useActionState } from 'react';
import { ExternalLink, Search, Sparkles, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { AiQuota } from '@banderoli/contracts';
import {
  productSearchAction,
  reviewsAction,
  type ReviewActionState,
  type SearchActionState,
} from '@/app/ai-actions';

const REVIEW_INIT: ReviewActionState = {};
const SEARCH_INIT: SearchActionState = {};
const inputClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

const SENTIMENT: Record<string, { label: string; cls: string }> = {
  positive: { label: 'Преимущественно положительные', cls: 'text-low' },
  mixed: { label: 'Смешанные', cls: 'text-medium' },
  negative: { label: 'Преимущественно отрицательные', cls: 'text-high' },
};

function QuotaLine({ quota }: { quota: AiQuota }) {
  return (
    <p className="mt-3 text-xs text-muted">
      Осталось ИИ-запросов сегодня: {quota.remaining} из {quota.limit}
    </p>
  );
}

function DemoBadge() {
  return (
    <span className="rounded-full bg-medium-soft px-2 py-0.5 text-[10px] font-medium text-medium">
      демо · ИИ не подключён
    </span>
  );
}

export function AiTools() {
  const [reviewState, reviewAction, reviewPending] = useActionState(reviewsAction, REVIEW_INIT);
  const [searchState, searchAction, searchPending] = useActionState(
    productSearchAction,
    SEARCH_INIT,
  );

  const review = reviewState.result?.summary;
  const sentiment = review ? (SENTIMENT[review.sentiment] ?? SENTIMENT['mixed']) : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-hairline bg-surface p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles size={16} aria-hidden />
          Поиск отзывов на товар
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Вставьте ссылку на товар — ИИ соберёт и сведёт отзывы.
        </p>

        <form action={reviewAction} className="flex gap-2">
          <input name="url" type="url" required placeholder="https://..." className={inputClass} />
          <button
            type="submit"
            disabled={reviewPending}
            className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {reviewPending ? '…' : 'Анализ'}
          </button>
        </form>

        {reviewState.error ? <p className="mt-2 text-xs text-high">{reviewState.error}</p> : null}

        {review && sentiment ? (
          <div className="mt-4 border-t border-hairline pt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium">{review.productTitle}</div>
              {!review.generatedByAi ? <DemoBadge /> : null}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm">
              {review.rating !== null ? (
                <span className="flex items-center gap-1 font-medium">
                  <Star size={14} aria-hidden /> {review.rating.toFixed(1)}
                </span>
              ) : null}
              <span className={sentiment.cls}>{sentiment.label}</span>
            </div>

            <p className="mt-2 text-sm text-muted">{review.summary}</p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-low">
                  <ThumbsUp size={13} aria-hidden /> Плюсы
                </div>
                <ul className="space-y-0.5 text-sm text-muted">
                  {review.pros.map((p) => (
                    <li key={p}>+ {p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-high">
                  <ThumbsDown size={13} aria-hidden /> Минусы
                </div>
                <ul className="space-y-0.5 text-sm text-muted">
                  {review.cons.map((c) => (
                    <li key={c}>− {c}</li>
                  ))}
                </ul>
              </div>
            </div>

            {review.sources.length > 0 ? (
              <div className="mt-3 text-xs">
                <span className="text-muted">Источники: </span>
                {review.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-2 inline-flex items-center gap-1 text-brand-dark underline"
                  >
                    {s.title}
                    <ExternalLink size={11} aria-hidden />
                  </a>
                ))}
              </div>
            ) : null}

            <QuotaLine quota={reviewState.result!.quota} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-hairline bg-surface p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Search size={16} aria-hidden />
          Поиск товара по описанию
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Опишите, что ищете — ИИ предложит варианты и поисковые запросы.
        </p>

        <form action={searchAction} className="space-y-2">
          <textarea
            name="description"
            required
            rows={3}
            placeholder="Напр.: лёгкие беговые кроссовки до $80, размер 42"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={searchPending}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {searchPending ? 'Поиск…' : 'Найти варианты'}
          </button>
        </form>

        {searchState.error ? <p className="mt-2 text-xs text-high">{searchState.error}</p> : null}

        {searchState.result ? (
          <div className="mt-4 border-t border-hairline pt-4">
            {!searchState.result.generatedByAi ? <DemoBadge /> : null}
            <ul className="mt-2 space-y-3">
              {searchState.result.suggestions.map((s) => (
                <li key={s.title}>
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-sm text-muted">{s.reason}</div>
                  <code className="mt-0.5 inline-block rounded bg-canvas px-1.5 py-0.5 text-xs text-muted">
                    {s.exampleQuery}
                  </code>
                </li>
              ))}
            </ul>
            <QuotaLine quota={searchState.result.quota} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
