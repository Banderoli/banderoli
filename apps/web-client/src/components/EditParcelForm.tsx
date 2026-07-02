'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, X } from 'lucide-react';
import { PARCEL_CURRENCIES, type ParcelResponse } from '@banderoli/contracts';
import { updateParcelAction, type ParcelFormState } from '@/app/parcel-actions';
import { currencySymbol } from '@/lib/format';
import { ParcelItemsEditor } from './ParcelItemsEditor';

const INITIAL: ParcelFormState = {};
const inputClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function EditParcelForm({
  parcel,
  storeNames,
  carrierNames,
}: {
  parcel: ParcelResponse;
  storeNames: string[];
  carrierNames: string[];
}) {
  const t = useTranslations('form');
  const tCard = useTranslations('card');
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateParcelAction, INITIAL);
  const [currency, setCurrency] = useState(parcel.currency || 'USD');
  const [store, setStore] = useState(parcel.store ?? '');
  const [carrier, setCarrier] = useState(parcel.carrier ?? '');
  const symbol = currencySymbol(currency);
  const storeOptions = Array.from(new Set([...storeNames, store].filter(Boolean)));
  const carrierOptions = Array.from(new Set([...carrierNames, carrier].filter(Boolean)));

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
        {tCard('btnEdit')}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-auto w-full max-w-lg rounded-xl border border-hairline bg-surface shadow-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium">{t('editTitle')}</h2>
              <button
                type="button"
                aria-label={t('close')}
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <form action={action} className="space-y-2.5">
              <input type="hidden" name="id" value={parcel.id} />
              <input name="name" required defaultValue={parcel.name ?? ''} placeholder={t('namePlaceholder')} className={inputClass} />

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('purchasedAt')}</span>
                  <input name="purchasedAt" type="date" defaultValue={parcel.purchasedAt ? parcel.purchasedAt.slice(0, 10) : ''} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('estimatedArrival')}</span>
                  <input name="estimatedArrival" type="date" defaultValue={parcel.estimatedArrival ? parcel.estimatedArrival.slice(0, 10) : ''} className={inputClass} />
                </label>
              </div>

              {storeOptions.length > 0 ? (
                <select name="store" value={store} onChange={(e) => setStore(e.target.value)} className={inputClass}>
                  <option value="">{t('storeDash')}</option>
                  {storeOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="store" value={store} onChange={(e) => setStore(e.target.value)} placeholder={t('storeEdit')} className={inputClass} />
              )}

              {carrierOptions.length > 0 ? (
                <select name="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputClass}>
                  <option value="">{t('carrierDash')}</option>
                  {carrierOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={t('carrierEdit')} className={inputClass} />
              )}

              <label className="block">
                <span className="mb-1 block text-xs text-muted">{t('currencyLabel')}</span>
                <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                  {PARCEL_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c} {currencySymbol(c)}
                    </option>
                  ))}
                </select>
              </label>

              <ParcelItemsEditor defaultItems={parcel.items} currencySymbol={symbol} />

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('shippingLabel', { symbol })}</span>
                  <input name="shippingCostUsd" type="number" min="0" step="0.01" defaultValue={parcel.shippingCostUsd ?? ''} placeholder={t('shippingPlaceholder', { symbol })} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('weightLabel')}</span>
                  <input name="weightKg" type="number" min="0" step="0.1" defaultValue={parcel.weightKg ?? ''} placeholder={t('weightPlaceholder')} className={inputClass} />
                </label>
              </div>

              <textarea name="description" rows={2} defaultValue={parcel.description ?? ''} placeholder={t('commentPlaceholder')} className={inputClass} />
              <input name="trackingNumber" defaultValue={parcel.trackingNumber ?? ''} placeholder={t('trackingPlaceholder')} className={inputClass} />

              {state.error ? <p className="text-xs text-high">{state.error}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-hairline px-3.5 py-2 text-sm transition hover:bg-canvas">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={pending} className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
                  {pending ? t('submitSaving') : t('submitSave')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
