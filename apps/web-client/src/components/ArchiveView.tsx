'use client';

import { useMemo, useState } from 'react';
import type { ParcelResponse } from '@banderoli/contracts';
import { ArchiveCard } from './ArchiveCard';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'DELIVERED', label: 'Доставлено' },
  { value: 'EXCEPTION', label: 'Утеряно' },
  { value: 'RETURNED', label: 'Возврат' },
  { value: 'IN_TRANSIT', label: 'В пути' },
  { value: 'IN_CUSTOMS', label: 'На таможне' },
];

const selectClass =
  'rounded-md border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-brand';

export function ArchiveView({
  parcels,
  recipientNameById,
}: {
  parcels: ParcelResponse[];
  recipientNameById: Record<string, string>;
}) {
  const [status, setStatus] = useState('');
  const [recipient, setRecipient] = useState('');
  const [store, setStore] = useState('');
  const [track, setTrack] = useState('');

  const recipientOptions = useMemo(
    () =>
      [...new Set(parcels.map((p) => p.recipientProfileId))].map((id) => ({
        id,
        name: recipientNameById[id] ?? 'Получатель',
      })),
    [parcels, recipientNameById],
  );

  const storeOptions = useMemo(
    () => [...new Set(parcels.map((p) => p.store).filter((s): s is string => Boolean(s)))],
    [parcels],
  );

  const query = track.trim().toLowerCase();
  const filtered = parcels.filter(
    (p) =>
      (!status || p.status === status) &&
      (!recipient || p.recipientProfileId === recipient) &&
      (!store || p.store === store) &&
      (!query || p.trackingNumber.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Статус" className={selectClass}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={recipient} onChange={(e) => setRecipient(e.target.value)} aria-label="Получатель" className={selectClass}>
          <option value="">Все получатели</option>
          {recipientOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select value={store} onChange={(e) => setStore(e.target.value)} aria-label="Магазин" className={selectClass}>
          <option value="">Все магазины</option>
          {storeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
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

      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Ничего не найдено</p>
        ) : (
          filtered.map((p) => (
            <ArchiveCard
              key={p.id}
              parcel={p}
              recipientName={recipientNameById[p.recipientProfileId] ?? 'Получатель'}
            />
          ))
        )}
      </div>
    </div>
  );
}
