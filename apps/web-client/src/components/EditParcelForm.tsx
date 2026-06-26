'use client';

import { useActionState, useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { ParcelResponse } from '@banderoli/contracts';
import { updateParcelAction, type ParcelFormState } from '@/app/parcel-actions';

const INITIAL: ParcelFormState = {};
const inputClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function EditParcelForm({ parcel }: { parcel: ParcelResponse }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateParcelAction, INITIAL);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium transition hover:bg-canvas"
      >
        <Pencil size={13} aria-hidden />
        Редактировать
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-auto w-full max-w-md rounded-xl border border-hairline bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium">Редактировать посылку</h2>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <form action={action} className="space-y-2.5">
              <input type="hidden" name="id" value={parcel.id} />
              <input name="trackingNumber" required defaultValue={parcel.trackingNumber} placeholder="Трек-номер *" className={inputClass} />
              <input name="description" defaultValue={parcel.description ?? ''} placeholder="Описание" className={inputClass} />
              <input name="store" defaultValue={parcel.store ?? ''} placeholder="Магазин" className={inputClass} />
              <input name="carrier" defaultValue={parcel.carrier ?? ''} placeholder="Перевозчик" className={inputClass} />
              <div className="grid grid-cols-3 gap-2">
                <input name="declaredValueUsd" type="number" min="0" step="0.01" defaultValue={parcel.declaredValueUsd ?? ''} placeholder="$ цена" className={inputClass} />
                <input name="weightKg" type="number" min="0" step="0.1" defaultValue={parcel.weightKg ?? ''} placeholder="кг" className={inputClass} />
                <input name="quantity" type="number" min="1" step="1" defaultValue={parcel.quantity} placeholder="шт" className={inputClass} />
              </div>

              {state.error ? <p className="text-xs text-high">{state.error}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-hairline px-3.5 py-2 text-sm transition hover:bg-canvas">
                  Отмена
                </button>
                <button type="submit" disabled={pending} className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
                  {pending ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
