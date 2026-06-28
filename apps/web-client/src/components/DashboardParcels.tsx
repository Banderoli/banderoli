'use client';

import { useMemo, useState } from 'react';
import type { CarrierResponse, ParcelResponse, StoreResponse } from '@banderoli/contracts';
import { DashboardParcelCard } from './DashboardParcelCard';

const selectClass =
  'rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function DashboardParcels({
  parcels,
  recipientNameById,
  stores,
  carriers,
}: {
  parcels: ParcelResponse[];
  recipientNameById: Record<string, string>;
  stores: StoreResponse[];
  carriers: CarrierResponse[];
}) {
  const [recipient, setRecipient] = useState('');
  const [store, setStore] = useState('');
  const [carrier, setCarrier] = useState('');
  const [track, setTrack] = useState('');

  // Терминальные посылки (доставлено/утеряно) живут в Архиве — на дашборде их нет.
  const active = useMemo(
    () => parcels.filter((p) => p.status !== 'DELIVERED' && p.status !== 'EXCEPTION'),
    [parcels],
  );

  // Получатели, у которых есть активные посылки.
  const recipientOptions = useMemo(() => {
    const ids = [...new Set(active.map((p) => p.recipientProfileId))];
    return ids
      .map((id) => ({ id, name: recipientNameById[id] ?? 'Получатель' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [active, recipientNameById]);

  // Магазины/службы: все сохранённые у пользователя + встречающиеся в посылках.
  const storeOptions = useMemo(() => {
    const names = new Set<string>(stores.map((s) => s.name));
    for (const p of active) {
      if (p.store) names.add(p.store);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [stores, active]);

  const carrierOptions = useMemo(() => {
    const names = new Set<string>(carriers.map((c) => c.name));
    for (const p of active) {
      if (p.carrier) names.add(p.carrier);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [carriers, active]);

  const query = track.trim().toLowerCase();
  const filtered = active.filter(
    (p) =>
      (!recipient || p.recipientProfileId === recipient) &&
      (!store || p.store === store) &&
      (!carrier || p.carrier === carrier) &&
      (!query || p.trackingNumber.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {recipientOptions.length > 1 ? (
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            aria-label="Получатель"
            className={selectClass}
          >
            <option value="">Все получатели</option>
            {recipientOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="hidden lg:block" />
        )}

        <select value={store} onChange={(e) => setStore(e.target.value)} aria-label="Магазин" className={selectClass}>
          <option value="">Все магазины</option>
          {storeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select value={carrier} onChange={(e) => setCarrier(e.target.value)} aria-label="Почтовая служба" className={selectClass}>
          <option value="">Все службы</option>
          {carrierOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          placeholder="Поиск по трек-коду"
          aria-label="Трек-код"
          className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Ничего не найдено</p>
        ) : (
          filtered.map((p) => (
            <DashboardParcelCard
              key={p.id}
              parcel={p}
              recipientName={recipientNameById[p.recipientProfileId] ?? '—'}
            />
          ))
        )}
      </div>
    </div>
  );
}
