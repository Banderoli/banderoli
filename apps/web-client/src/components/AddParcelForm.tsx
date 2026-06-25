'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createParcelAction, type ParcelFormState } from '@/app/parcel-actions';

const INITIAL: ParcelFormState = {};
const inputClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function AddParcelForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createParcelAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
      >
        <Plus size={15} aria-hidden />
        Добавить трек
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-hairline bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium">Новая посылка</h2>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <form ref={formRef} action={formAction} className="space-y-2.5">
              <input name="trackingNumber" required placeholder="Трек-номер *" className={inputClass} />
              <input name="description" placeholder="Описание (напр. Кроссовки Nike)" className={inputClass} />
              <input name="carrier" placeholder="Перевозчик (DHL, FedEx, USPS…)" className={inputClass} />
              <div className="grid grid-cols-3 gap-2">
                <input name="declaredValueUsd" type="number" min="0" step="0.01" placeholder="$ цена" className={inputClass} />
                <input name="weightKg" type="number" min="0" step="0.1" placeholder="кг" className={inputClass} />
                <input name="quantity" type="number" min="1" step="1" placeholder="шт" className={inputClass} />
              </div>

              {state.error ? <p className="text-xs text-high">{state.error}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-hairline px-3.5 py-2 text-sm transition hover:bg-canvas"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {pending ? 'Добавление…' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
