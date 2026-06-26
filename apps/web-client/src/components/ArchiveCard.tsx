'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { ParcelResponse } from '@banderoli/contracts';
import { PARCEL_STATUS_META, type StatusTone } from '@/lib/parcel-status';
import { formatGel, formatShortDate, formatUsd } from '@/lib/format';
import { restoreParcelAction } from '@/app/parcel-actions';

const TERMINAL: ReadonlyArray<string> = ['DELIVERED', 'RETURNED', 'EXCEPTION'];

const BADGE_TONE: Record<StatusTone, string> = {
  transit: 'bg-brand-soft text-brand-dark',
  customs: 'bg-medium-soft text-medium',
  delivered: 'bg-low-soft text-low',
  neutral: 'bg-hairline text-muted',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function ArchiveCard({
  parcel,
  recipientName,
}: {
  parcel: ParcelResponse;
  recipientName: string;
}) {
  const [open, setOpen] = useState(false);
  const meta = PARCEL_STATUS_META[parcel.status];
  const canRestore = TERMINAL.includes(parcel.status);

  return (
    <div className="rounded-xl border border-hairline bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {parcel.description ?? parcel.trackingNumber}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted">
            {recipientName} · {parcel.trackingNumber}
          </div>
        </div>
        <span className="shrink-0 text-sm font-medium">{formatUsd(parcel.declaredValueUsd)}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGE_TONE[meta.tone]}`}
        >
          {meta.label}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="border-t border-hairline px-4 py-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Получатель" value={recipientName} />
            <Field label="Магазин" value={parcel.store ?? '—'} />
            <Field label="Перевозчик" value={parcel.carrier ?? '—'} />
            <Field
              label="Стоимость"
              value={parcel.declaredValueGel !== null ? formatGel(parcel.declaredValueGel) : '—'}
            />
            <Field
              label={parcel.status === 'DELIVERED' ? 'Вручено' : 'Прибытие'}
              value={formatShortDate(
                parcel.status === 'DELIVERED' ? parcel.deliveredAt : parcel.estimatedArrival,
              )}
            />
            <Field label="Статус" value={meta.label} />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/dashboard/parcels/${parcel.id}`}
              className="rounded-md border border-hairline px-3 py-1.5 text-xs transition hover:bg-canvas"
            >
              Детали
            </Link>
            {canRestore ? (
              <form action={restoreParcelAction}>
                <input type="hidden" name="id" value={parcel.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-dark"
                >
                  <RotateCcw size={13} aria-hidden />
                  Восстановить
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
