'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Upload } from 'lucide-react';
import { extractCartAction, type CartImportState } from '@/app/ai-actions';
import type { CartExtraction } from '@/lib/cart-vision';

// Главный сценарий добавления посылки: загрузка скриншота корзины → ИИ-распознавание
// → автозаполнение формы. Ручной ввод идёт ниже как запасной вариант.
export function CartScreenshotImport({ onExtract }: { onExtract: (data: CartExtraction) => void }) {
  const t = useTranslations('cartImport');
  const [state, setState] = useState<CartImportState>({});
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null | undefined) => {
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    setState({});
    startTransition(async () => {
      const result = await extractCartAction(formData);
      setState(result);
      if (result.ok && result.data) {
        onExtract(result.data);
      }
    });
  };

  return (
    <div className="rounded-xl border border-brand/40 bg-brand-soft/40 p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
        <Sparkles size={16} aria-hidden />
        {t('fastest')}
      </div>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{t('desc')}</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-6 text-center text-sm transition ${
          dragOver
            ? 'border-brand bg-brand-soft text-brand-dark'
            : 'border-brand/40 bg-surface text-muted hover:border-brand hover:bg-brand-soft/50'
        }`}
      >
        <Upload size={20} aria-hidden className="text-brand-dark" />
        <span className="font-medium text-ink">
          {pending ? t('recognizing') : t('dropOrClick')}
        </span>
        <span className="text-[11px]">{t('fileTypes')}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <p className="mt-2 text-[11px] leading-relaxed text-muted">{t('tip')}</p>

      {state.error ? <p className="mt-2 text-xs text-high">{state.error}</p> : null}
      {state.ok ? (
        <p className="mt-2 text-xs text-low">
          {t('done', {
            count: state.data?.items.length ?? 0,
            currencyPart: state.data?.currency ? t('currencyPart', { currency: state.data.currency }) : '',
            remainingPart:
              typeof state.remaining === 'number'
                ? t('remainingPart', { remaining: state.remaining })
                : '',
          })}
        </p>
      ) : null}
    </div>
  );
}
