'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { CarrierResponse, StoreResponse } from '@banderoli/contracts';
import { createParcelAction, type ParcelFormState } from '@/app/parcel-actions';
import type { RecipientOption } from '@/lib/mock-data';

const INITIAL: ParcelFormState = {};
const inputClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function AddParcelForm({
  recipients,
  selectedRecipientId,
  stores,
  carriers,
}: {
  recipients: RecipientOption[];
  selectedRecipientId: string;
  stores: StoreResponse[];
  carriers: CarrierResponse[];
}) {
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
              {recipients.length > 1 ? (
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Получатель</span>
                  <select
                    name="recipientProfileId"
                    defaultValue={selectedRecipientId}
                    className={inputClass}
                  >
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="recipientProfileId" value={recipients[0]?.id ?? ''} />
              )}

              <input name="trackingNumber" required placeholder="Трек-номер *" className={inputClass} />
              <input name="description" placeholder="Описание (напр. Кроссовки Nike)" className={inputClass} />

              {stores.length > 0 ? (
                <select name="store" defaultValue="" className={inputClass}>
                  <option value="">— магазин —</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="store" placeholder="Магазин (добавьте в Настройках)" className={inputClass} />
              )}

              {carriers.length > 0 ? (
                <select name="carrier" defaultValue="" className={inputClass}>
                  <option value="">— перевозчик —</option>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="carrier" placeholder="Перевозчик (добавьте в Настройках)" className={inputClass} />
              )}

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
