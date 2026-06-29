'use client';

import { useActionState, useState } from 'react';
import { Check, ChevronDown, Trash2, Truck, XCircle } from 'lucide-react';
import type { ParcelResponse } from '@banderoli/contracts';
import { PARCEL_STATUS_META, type StatusTone } from '@/lib/parcel-status';
import { formatGel, formatMoney, formatShortDate } from '@/lib/format';
import {
  checkTrackingAction,
  deleteParcelAction,
  setParcelStatusAction,
  type TrackingCheckState,
} from '@/app/parcel-actions';
import { EditParcelForm } from './EditParcelForm';
import { ParcelComposition } from './ParcelComposition';

const BADGE_TONE: Record<StatusTone, string> = {
  transit: 'bg-brand-soft text-brand-dark',
  customs: 'bg-medium-soft text-medium',
  delivered: 'bg-low-soft text-low',
  neutral: 'bg-hairline text-muted',
};

const TRACKING_INIT: TrackingCheckState = {};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function DashboardParcelCard({
  parcel,
  recipientName,
}: {
  parcel: ParcelResponse;
  recipientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [track, trackAction, trackPending] = useActionState(checkTrackingAction, TRACKING_INIT);
  const meta = PARCEL_STATUS_META[parcel.status];

  const eta =
    parcel.status === 'DELIVERED'
      ? `получено ${formatShortDate(parcel.deliveredAt)}`
      : `ETA ${formatShortDate(parcel.estimatedArrival)}`;

  return (
    <div className="rounded-xl border border-hairline bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {parcel.name ?? parcel.description ?? parcel.trackingNumber ?? 'Посылка'}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted">
            {parcel.carrier ?? '—'} · {eta}
          </div>
        </div>
        <span className="shrink-0 text-sm font-medium">{formatMoney(parcel.declaredValueUsd, parcel.currency)}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGE_TONE[meta.tone]}`}>
          {meta.label}
        </span>
        <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="border-t border-hairline px-4 py-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Получатель" value={recipientName} />
            <Field label="Магазин" value={parcel.store ?? '—'} />
            <Field label="Трек-номер" value={parcel.trackingNumber ?? '—'} />
            <Field label="Стоимость" value={parcel.declaredValueGel !== null ? formatGel(parcel.declaredValueGel) : '—'} />
            <Field label="Вес" value={parcel.weightKg !== null ? `${parcel.weightKg} кг` : '—'} />
            <Field label="Статус" value={meta.label} />
          </div>

          <ParcelComposition parcel={parcel} />

          {parcel.description ? (
            <p className="mt-3 text-xs text-muted">{parcel.description}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <EditParcelForm parcel={parcel} />

            <form action={setParcelStatusAction}>
              <input type="hidden" name="id" value={parcel.id} />
              <input type="hidden" name="status" value="DELIVERED" />
              <button type="submit" className="flex items-center gap-1.5 rounded-md bg-low-soft px-3 py-1.5 text-xs font-medium text-low transition hover:opacity-80">
                <Check size={13} aria-hidden />
                Доставлено
              </button>
            </form>

            <form action={setParcelStatusAction}>
              <input type="hidden" name="id" value={parcel.id} />
              <input type="hidden" name="status" value="EXCEPTION" />
              <button type="submit" className="flex items-center gap-1.5 rounded-md bg-medium-soft px-3 py-1.5 text-xs font-medium text-medium transition hover:opacity-80">
                <XCircle size={13} aria-hidden />
                Утеряно
              </button>
            </form>

            {parcel.trackingNumber ? (
              <form action={trackAction}>
                <input type="hidden" name="tracking" value={parcel.trackingNumber} />
                <button type="submit" disabled={trackPending} className="flex items-center gap-1.5 rounded-md bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-dark transition hover:opacity-80 disabled:opacity-60">
                  <Truck size={13} aria-hidden />
                  {trackPending ? 'Проверяем…' : 'Проверить статус'}
                </button>
              </form>
            ) : null}

            <form
              action={deleteParcelAction}
              onSubmit={(e) => {
                if (!confirm('Удалить эту посылку?')) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={parcel.id} />
              <button type="submit" className="flex items-center gap-1.5 rounded-md bg-high-soft px-3 py-1.5 text-xs font-medium text-high transition hover:opacity-80">
                <Trash2 size={13} aria-hidden />
                Удалить
              </button>
            </form>
          </div>

          {track.text ? <p className="mt-2 text-xs text-muted">📦 {track.text}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
