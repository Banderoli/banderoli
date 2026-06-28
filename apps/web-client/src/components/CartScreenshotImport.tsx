'use client';

import { useRef, useState, useTransition } from 'react';
import { Sparkles, Upload } from 'lucide-react';
import { extractCartAction, type CartImportState } from '@/app/ai-actions';
import type { CartExtraction } from '@/lib/cart-vision';

// Кнопка + инструкция + drag&drop: загружает скриншот корзины, распознаёт его
// через ИИ и передаёт распознанные данные в форму для автозаполнения.
export function CartScreenshotImport({ onExtract }: { onExtract: (data: CartExtraction) => void }) {
  const [open, setOpen] = useState(false);
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
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-brand bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark shadow-card transition hover:bg-brand hover:text-white"
      >
        <Sparkles size={15} aria-hidden />
        Заполнить из скриншота
      </button>

      {open ? (
        <div className="mt-2 rounded-md border border-hairline bg-canvas p-3">
          <div className="mb-2 text-xs font-medium text-ink">Инструкция</div>
          <ol className="mb-3 space-y-1 text-xs text-muted">
            <li>1. Используйте Ctrl + / Ctrl −, чтобы вся корзина поместилась на экране.</li>
            <li>2. Сделайте скриншот и загрузите его в Banderoli.AI.</li>
            <li>3. На всякий случай сравните распознанные данные с корзиной.</li>
          </ol>

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
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-5 text-center text-xs transition ${
              dragOver
                ? 'border-brand bg-brand-soft text-brand-dark'
                : 'border-hairline text-muted hover:border-brand'
            }`}
          >
            <Upload size={18} aria-hidden />
            {pending ? 'Распознаём корзину…' : 'Перетащите скриншот сюда или нажмите, чтобы выбрать'}
            <span className="text-[11px]">PNG, JPEG, WEBP · до 5 МБ</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {state.error ? <p className="mt-2 text-xs text-high">{state.error}</p> : null}
          {state.ok ? (
            <p className="mt-2 text-xs text-low">
              Готово: позиций распознано — {state.data?.items.length ?? 0}
              {state.data?.currency ? ` · валюта ${state.data.currency}` : ''}
              {typeof state.remaining === 'number'
                ? ` · осталось ИИ-запросов: ${state.remaining}`
                : ''}
              . Проверьте поля ниже.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
