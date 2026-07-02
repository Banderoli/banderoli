'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ParcelResponse } from '@banderoli/contracts';
import type { RecipientOption } from '@/lib/mock-data';
import { formatGel } from '@/lib/format';
import { DashboardParcelCard } from './DashboardParcelCard';
import { MetricCard } from './MetricCard';

// Фирменный фиолетовый стиль всех полей фильтра (селекты + поиск по треку).
const fieldClass =
  'rounded-md border border-brand bg-brand-soft px-3 py-2 text-sm text-brand-dark shadow-card outline-none transition focus:border-brand-dark';

export function DashboardParcels({
  parcels,
  recipients,
  storeNames,
  carrierNames,
}: {
  parcels: ParcelResponse[];
  recipients: RecipientOption[];
  storeNames: string[];
  carrierNames: string[];
}) {
  const t = useTranslations('parcels');
  const [recipient, setRecipient] = useState('');
  const [store, setStore] = useState('');
  const [carrier, setCarrier] = useState('');
  const [track, setTrack] = useState('');

  // Терминальные посылки (доставлено/утеряно) живут в Архиве — на дашборде их нет.
  const active = useMemo(
    () => parcels.filter((p) => p.status !== 'DELIVERED' && p.status !== 'EXCEPTION'),
    [parcels],
  );

  const recipientNameById = useMemo(
    () => Object.fromEntries(recipients.map((r) => [r.id, r.name])),
    [recipients],
  );

  // Все получатели пользователя (даже без активных посылок) + счётчик их посылок.
  const recipientOptions = useMemo(
    () =>
      recipients
        .map((r) => ({
          id: r.id,
          name: r.name,
          count: active.filter((p) => p.recipientProfileId === r.id).length,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [recipients, active],
  );

  // Магазины/службы для фильтра приходят уже объединённым списком имён.
  const storeOptions = storeNames;
  const carrierOptions = carrierNames;

  // Сводные метрики следуют за фильтром получателя: выбран получатель — его данные,
  // «Все посылки» — сумма по всем. Магазин/служба/поиск на сводку не влияют.
  const metricsParcels = recipient
    ? active.filter((p) => p.recipientProfileId === recipient)
    : active;
  const countByStatus = (status: ParcelResponse['status']): number =>
    metricsParcels.filter((p) => p.status === status).length;
  const totalValueGel = Math.round(
    metricsParcels.reduce((sum, p) => sum + (p.declaredValueGel ?? 0), 0),
  );

  const query = track.trim().toLowerCase();
  const filtered = active.filter(
    (p) =>
      (!recipient || p.recipientProfileId === recipient) &&
      (!store || p.store === store) &&
      (!carrier || p.carrier === carrier) &&
      (!query || `${p.trackingNumber ?? ''} ${p.name ?? ''}`.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {recipients.length > 1 ? (
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            aria-label={t('recipientAria')}
            className={fieldClass}
          >
            <option value="">{t('allParcels', { count: active.length })}</option>
            {recipientOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.count})
              </option>
            ))}
          </select>
        ) : (
          <div className="hidden lg:block" />
        )}

        <select value={store} onChange={(e) => setStore(e.target.value)} aria-label={t('storeAria')} className={fieldClass}>
          <option value="">{t('allStores')}</option>
          {storeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select value={carrier} onChange={(e) => setCarrier(e.target.value)} aria-label={t('carrierAria')} className={fieldClass}>
          <option value="">{t('allCarriers')}</option>
          {carrierOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          placeholder={t('searchTrack')}
          aria-label={t('trackAria')}
          className={`${fieldClass} placeholder:text-brand-dark/50`}
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t('notFound')}</p>
        ) : (
          filtered.map((p) => (
            <DashboardParcelCard
              key={p.id}
              parcel={p}
              recipientName={recipientNameById[p.recipientProfileId] ?? '—'}
              storeNames={storeNames}
              carrierNames={carrierNames}
            />
          ))
        )}
      </div>

      {/* Сводка по выбранному в фильтре получателю (или по всем посылкам) */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricCard label={t('pending')} value={String(countByStatus('PENDING'))} sub={t('pendingSub')} />
        <MetricCard
          label={t('inTransit')}
          value={String(countByStatus('IN_TRANSIT'))}
          sub={recipient ? t('inTransitSubOne') : t('inTransitSubAll')}
        />
        <MetricCard
          label={t('inCustoms')}
          value={String(countByStatus('IN_CUSTOMS'))}
          sub={t('inCustomsSub')}
          accent="medium"
        />
        <MetricCard label={t('totalValue')} value={formatGel(totalValueGel)} sub={t('totalValueSub')} />
      </div>
    </div>
  );
}
