'use client';

import { useActionState, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PARCEL_CURRENCIES, type CarrierResponse, type StoreResponse } from '@banderoli/contracts';
import { createParcelAction, type ParcelFormState } from '@/app/parcel-actions';
import type { RecipientExposure } from '@/lib/api';
import type { CartExtraction } from '@/lib/cart-vision';
import { currencySymbol } from '@/lib/format';
import { ParcelItemsEditor } from './ParcelItemsEditor';
import { CartScreenshotImport } from './CartScreenshotImport';

const INITIAL: ParcelFormState = {};
const inputClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

interface Prefill {
  store?: string;
  shipping?: string;
  items?: { name: string; priceUsd: number }[];
}

export function AddParcelForm({
  recipients,
  selectedRecipientId,
  stores,
  carriers,
  rates,
}: {
  recipients: RecipientExposure[];
  selectedRecipientId: string;
  stores: StoreResponse[];
  carriers: CarrierResponse[];
  rates: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createParcelAction, INITIAL);
  // Данные из распознанного скриншота; formKey ремонтит форму, чтобы defaultValue применился.
  const [prefill, setPrefill] = useState<Prefill>({});
  const [formKey, setFormKey] = useState(0);
  const [currency, setCurrency] = useState('USD');

  const closeModal = () => {
    setOpen(false);
    setPrefill({});
    setCurrency('USD');
  };

  useEffect(() => {
    if (state.ok) {
      closeModal();
    }
  }, [state.ok]);

  const handleExtract = (data: CartExtraction) => {
    setPrefill({
      store: data.store ?? undefined,
      shipping: data.shipping !== null ? String(data.shipping) : undefined,
      items: data.items.map((it) => ({ name: it.name, priceUsd: it.price })),
    });
    if (data.currency && (PARCEL_CURRENCIES as readonly string[]).includes(data.currency.toUpperCase())) {
      setCurrency(data.currency.toUpperCase());
    }
    setFormKey((k) => k + 1);
  };

  const symbol = currencySymbol(currency);
  const rate = rates[currency] ?? rates.USD ?? 0;

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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="my-auto w-full max-w-lg rounded-xl border border-hairline bg-surface shadow-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium">Новая посылка</h2>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={closeModal}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <CartScreenshotImport onExtract={handleExtract} />

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-hairline" />
              <span className="shrink-0 text-xs text-muted">или заполните вручную</span>
              <div className="h-px flex-1 bg-hairline" />
            </div>

            <form key={formKey} action={formAction} className="space-y-2.5">
              {recipients.length > 0 ? (
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">
                    Получатель (на кого выписать)
                  </span>
                  <select
                    name="recipientProfileId"
                    defaultValue={selectedRecipientId}
                    className={inputClass}
                  >
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {Math.round(r.usedGel)}/{r.limitGel} GEL
                        {r.exceeded ? ' (превышен)' : r.ratio >= 0.85 ? ' (близко)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="recipientProfileId" value="" />
              )}

              <input name="name" required placeholder="Название посылки (напр. Алия1) *" className={inputClass} />

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Дата покупки</span>
                  <input name="purchasedAt" type="date" className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Ожидаемая доставка</span>
                  <input name="estimatedArrival" type="date" className={inputClass} />
                </label>
              </div>

              <input
                name="store"
                list="add-store-suggestions"
                defaultValue={prefill.store ?? ''}
                placeholder="Магазин"
                className={inputClass}
              />
              <datalist id="add-store-suggestions">
                {stores.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>

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

              <label className="block">
                <span className="mb-1 block text-xs text-muted">Валюта цен</span>
                <select
                  name="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputClass}
                >
                  {PARCEL_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c} {currencySymbol(c)}
                    </option>
                  ))}
                </select>
              </label>

              <ParcelItemsEditor defaultItems={prefill.items} currencySymbol={symbol} />

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Стоимость доставки ({symbol})</span>
                  <input name="shippingCostUsd" type="number" min="0" step="0.01" defaultValue={prefill.shipping ?? ''} placeholder={`${symbol} доставка`} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Вес (кг)</span>
                  <input name="weightKg" type="number" min="0" step="0.1" placeholder="кг" className={inputClass} />
                </label>
              </div>

              <textarea name="description" rows={2} placeholder="Комментарий" className={inputClass} />

              <input name="trackingNumber" placeholder="Трек-номер (если есть)" className={inputClass} />

              <p className="text-xs text-muted">
                {currency === 'GEL'
                  ? 'Цены уже в лари. '
                  : `Курс НБ Грузии: 1 ${currency} ≈ ${rate.toFixed(4)} GEL. `}
                Итог = сумма товаров + доставка, переводится в лари по курсу НБГ. Доставка тоже входит
                в лимит 300 GEL.
              </p>

              {state.error ? <p className="text-xs text-high">{state.error}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
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
