'use client';

import { useMemo, useState } from 'react';
import type { ParcelResponse } from '@banderoli/contracts';
import type { RecipientOption } from '@/lib/mock-data';
import { RecipientSwitcher } from './RecipientSwitcher';
import { DashboardParcelCard } from './DashboardParcelCard';

const selectClass =
  'rounded-md border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-brand';

export function DashboardParcels({
  parcels,
  recipients,
  selectedRecipientId,
  recipientName,
}: {
  parcels: ParcelResponse[];
  recipients: RecipientOption[];
  selectedRecipientId: string;
  recipientName: string;
}) {
  const [store, setStore] = useState('');
  const [track, setTrack] = useState('');

  const storeOptions = useMemo(
    () => [...new Set(parcels.map((p) => p.store).filter((s): s is string => Boolean(s)))],
    [parcels],
  );

  const query = track.trim().toLowerCase();
  const filtered = parcels.filter(
    (p) =>
      (!store || p.store === store) &&
      (!query || p.trackingNumber.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        {recipients.length > 1 ? (
          <RecipientSwitcher recipients={recipients} selectedId={selectedRecipientId} />
        ) : (
          <div className="hidden sm:block" />
        )}
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

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Ничего не найдено</p>
        ) : (
          filtered.map((p) => (
            <DashboardParcelCard key={p.id} parcel={p} recipientName={recipientName} />
          ))
        )}
      </div>
    </div>
  );
}
