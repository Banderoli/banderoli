'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { PARCEL_CURRENCIES } from '@banderoli/contracts';
import { createParcelAction, type ParcelFormState } from '@/app/parcel-actions';
import type { RecipientExposure } from '@/lib/api';
import type { CartExtraction } from '@/lib/cart-vision';
import { currencySymbol } from '@/lib/format';
import { ParcelItemsEditor } from './ParcelItemsEditor';
import { CartScreenshotImport } from './CartScreenshotImport';

const INITIAL: ParcelFormState = {};
const inputClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function AddParcelForm({
  recipients,
  selectedRecipientId,
  storeNames,
  carrierNames,
  rates,
}: {
  recipients: RecipientExposure[];
  selectedRecipientId: string;
  storeNames: string[];
  carrierNames: string[];
  rates: Record<string, number>;
}) {
  const td = useTranslations('dashboard');
  const t = useTranslations('form');
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createParcelAction, INITIAL);
  // formKey ремонтит редактор позиций, чтобы применились распознанные товары.
  const [formKey, setFormKey] = useState(0);
  const [aiItems, setAiItems] = useState<{ name: string; priceUsd: number }[] | undefined>();
  const [currency, setCurrency] = useState('USD');
  const [recipientId, setRecipientId] = useState(selectedRecipientId);
  const [store, setStore] = useState('');
  const [shipping, setShipping] = useState('');
  const [itemsTotal, setItemsTotal] = useState(0);

  const resetForm = () => {
    setAiItems(undefined);
    setCurrency('USD');
    setRecipientId(selectedRecipientId);
    setStore('');
    setShipping('');
    setItemsTotal(0);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  // Закрываем модалку после каждого успешного добавления (dep — весь объект state,
  // чтобы срабатывало и на втором, и на третьем добавлении подряд).
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleExtract = (data: CartExtraction) => {
    setAiItems(data.items.map((it) => ({ name: it.name, priceUsd: it.price })));
    setStore(data.store ?? '');
    setShipping(data.shipping !== null ? String(data.shipping) : '');
    if (data.currency && (PARCEL_CURRENCIES as readonly string[]).includes(data.currency.toUpperCase())) {
      setCurrency(data.currency.toUpperCase());
    }
    setFormKey((k) => k + 1);
  };

  const symbol = currencySymbol(currency);
  const rate = rates[currency] ?? rates.USD ?? 0;
  const usdRate = rates.USD ?? 0;
  const storeOptions = Array.from(new Set([...storeNames, store].filter(Boolean)));

  // Живой совет: остаток лимита у выбранного получателя после этой посылки.
  const parcelAmount = itemsTotal + (Number(shipping) || 0);
  const selectedRecipient = recipients.find((r) => r.id === recipientId);
  let advice: { tone: 'green' | 'amber' | 'red'; text: string } | null = null;
  if (selectedRecipient && parcelAmount > 0) {
    const parcelGel = parcelAmount * rate;
    const headroom = selectedRecipient.limitGel - (selectedRecipient.usedGel + parcelGel);
    const headroomUsd = usdRate > 0 ? Math.round(headroom / usdRate) : 0;
    if (headroom < 0) {
      advice = {
        tone: 'red',
        text: t('adviceExceeded', { name: selectedRecipient.name, amount: Math.round(-headroom) }),
      };
    } else if (headroom <= selectedRecipient.limitGel * 0.1) {
      advice = {
        tone: 'amber',
        text: t('adviceNear', {
          name: selectedRecipient.name,
          rem: Math.round(headroom),
          remUsd: headroomUsd,
        }),
      };
    } else {
      advice = {
        tone: 'green',
        text: t('adviceOk', {
          name: selectedRecipient.name,
          rem: Math.round(headroom),
          remUsd: headroomUsd,
        }),
      };
    }
  }
  const adviceTone =
    advice?.tone === 'red' ? 'text-high' : advice?.tone === 'amber' ? 'text-medium' : 'text-low';
  const adviceEmoji = advice?.tone === 'red' ? '🔴' : advice?.tone === 'amber' ? '🟡' : '🟢';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3.5 py-2.5 text-sm font-medium text-white shadow-card transition hover:bg-brand-dark"
      >
        <Plus size={16} aria-hidden />
        {td('addOrder')}
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
              <h2 className="text-base font-medium">{t('addTitle')}</h2>
              <button
                type="button"
                aria-label={t('close')}
                onClick={closeModal}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <CartScreenshotImport onExtract={handleExtract} />

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-hairline" />
              <span className="shrink-0 text-xs text-muted">{t('orManually')}</span>
              <div className="h-px flex-1 bg-hairline" />
            </div>

            <form action={formAction} className="space-y-2.5">
              {recipients.length > 0 ? (
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('recipientLabel')}</span>
                  <select
                    name="recipientProfileId"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    className={inputClass}
                  >
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {Math.round(r.usedGel)}/{r.limitGel} GEL
                        {r.exceeded ? t('recipientExceeded') : r.ratio >= 0.85 ? t('recipientNear') : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="recipientProfileId" value="" />
              )}

              <input name="name" required placeholder={t('namePlaceholder')} className={inputClass} />

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('purchasedAt')}</span>
                  <input name="purchasedAt" type="date" className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('estimatedArrival')}</span>
                  <input name="estimatedArrival" type="date" className={inputClass} />
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
                <input
                  name="store"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  placeholder={t('storeNew')}
                  className={inputClass}
                />
              )}

              {carrierNames.length > 0 ? (
                <select name="carrier" defaultValue="" className={inputClass}>
                  <option value="">{t('carrierDash')}</option>
                  {carrierNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="carrier" placeholder={t('carrierNew')} className={inputClass} />
              )}

              <label className="block">
                <span className="mb-1 block text-xs text-muted">{t('currencyLabel')}</span>
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

              <ParcelItemsEditor
                key={formKey}
                defaultItems={aiItems}
                currencySymbol={symbol}
                onTotalChange={setItemsTotal}
              />

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('shippingLabel', { symbol })}</span>
                  <input
                    name="shippingCostUsd"
                    type="number"
                    min="0"
                    step="0.01"
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    placeholder={t('shippingPlaceholder', { symbol })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{t('weightLabel')}</span>
                  <input name="weightKg" type="number" min="0" step="0.1" placeholder={t('weightPlaceholder')} className={inputClass} />
                </label>
              </div>

              <textarea name="description" rows={2} placeholder={t('commentPlaceholder')} className={inputClass} />

              <input name="trackingNumber" placeholder={t('trackingPlaceholder')} className={inputClass} />

              {advice ? (
                <p className={`flex items-start gap-1.5 text-xs font-medium ${adviceTone}`}>
                  <span aria-hidden>{adviceEmoji}</span>
                  <span>{advice.text}</span>
                </p>
              ) : null}

              <p className="text-xs text-muted">
                {currency === 'GEL' ? t('gelHint') : t('rateHint', { currency, rate: rate.toFixed(4) })}
                {t('totalHint')}
              </p>

              {state.error ? <p className="text-xs text-high">{state.error}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-hairline px-3.5 py-2 text-sm transition hover:bg-canvas"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {pending ? t('submitAdding') : t('submitAdd')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
