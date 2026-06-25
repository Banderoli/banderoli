import Link from 'next/link';
import { AlertTriangle, Check, Plane, Package } from 'lucide-react';
import type { ParcelResponse } from '@banderoli/contracts';
import { PARCEL_STATUS_META, type StatusTone } from '@/lib/parcel-status';
import { formatShortDate, formatUsd } from '@/lib/format';

const TONE_STYLES: Record<StatusTone, { wrap: string; badge: string }> = {
  transit: { wrap: 'bg-brand-soft text-brand-dark', badge: 'bg-brand-soft text-brand-dark' },
  customs: { wrap: 'bg-medium-soft text-medium', badge: 'bg-medium-soft text-medium' },
  delivered: { wrap: 'bg-low-soft text-low', badge: 'bg-low-soft text-low' },
  neutral: { wrap: 'bg-hairline text-muted', badge: 'bg-hairline text-muted' },
};

function ToneIcon({ tone }: { tone: StatusTone }) {
  if (tone === 'customs') {
    return <AlertTriangle size={16} aria-hidden />;
  }
  if (tone === 'delivered') {
    return <Check size={16} aria-hidden />;
  }
  if (tone === 'transit') {
    return <Plane size={16} aria-hidden />;
  }
  return <Package size={16} aria-hidden />;
}

export function ParcelRow({ parcel }: { parcel: ParcelResponse }) {
  const meta = PARCEL_STATUS_META[parcel.status];
  const styles = TONE_STYLES[meta.tone];
  const eta =
    parcel.status === 'DELIVERED'
      ? `получено ${formatShortDate(parcel.deliveredAt)}`
      : `ETA ${formatShortDate(parcel.estimatedArrival)}`;

  return (
    <Link
      href={`/dashboard/parcels/${parcel.id}`}
      className="-mx-2 flex items-center gap-3 rounded-lg border-b border-hairline px-2 py-2.5 transition last:border-b-0 hover:bg-canvas"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.wrap}`}>
        <ToneIcon tone={meta.tone} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{parcel.description ?? parcel.trackingNumber}</div>
        <div className="mt-0.5 text-xs text-muted">
          {parcel.carrier ?? '—'} · {eta}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-medium">{formatUsd(parcel.declaredValueUsd)}</div>
        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${styles.badge}`}>
          {meta.label}
        </span>
      </div>
    </Link>
  );
}
