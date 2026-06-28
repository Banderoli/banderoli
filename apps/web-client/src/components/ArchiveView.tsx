'use client';

import { useMemo, useState } from 'react';
import type { ParcelResponse } from '@banderoli/contracts';
import { ArchiveCard } from './ArchiveCard';

const TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Все посылки' },
  { value: 'EXCEPTION', label: 'Утеряно' },
  { value: 'DELIVERED', label: 'Доставлено' },
];

// Фирменный фиолетовый стиль полей фильтра (как на дашборде).
const fieldClass =
  'rounded-md border border-brand bg-brand-soft px-3 py-2 text-sm text-brand-dark shadow-card outline-none transition focus:border-brand-dark';

export function ArchiveView({
  parcels,
  recipientNameById,
}: {
  parcels: ParcelResponse[];
  recipientNameById: Record<string, string>;
}) {
  // В архив попадают только терминальные посылки: доставленные и утерянные.
  const archived = useMemo(
    () => parcels.filter((p) => p.status === 'DELIVERED' || p.status === 'EXCEPTION'),
    [parcels],
  );

  const [status, setStatus] = useState('');
  const [recipient, setRecipient] = useState('');
  const [store, setStore] = useState('');
  const [track, setTrack] = useState('');

  const recipientOptions = useMemo(
    () =>
      [...new Set(archived.map((p) => p.recipientProfileId))].map((id) => ({
        id,
        name: recipientNameById[id] ?? 'Получатель',
      })),
    [archived, recipientNameById],
  );

  const storeOptions = useMemo(
    () => [...new Set(archived.map((p) => p.store).filter((s): s is string => Boolean(s)))],
    [archived],
  );

  const query = track.trim().toLowerCase();
  const filtered = archived.filter(
    (p) =>
      (!status || p.status === status) &&
      (!recipient || p.recipientProfileId === recipient) &&
      (!store || p.store === store) &&
      (!query || `${p.trackingNumber ?? ''} ${p.name ?? ''}`.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-hairline bg-surface text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <select value={recipient} onChange={(e) => setRecipient(e.target.value)} aria-label="Получатель" className={fieldClass}>
          <option value="">Все получатели</option>
          {recipientOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select value={store} onChange={(e) => setStore(e.target.value)} aria-label="Магазин" className={fieldClass}>
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
          className={`${fieldClass} placeholder:text-brand-dark/50`}
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
