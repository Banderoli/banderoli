import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ParcelStatus } from '@banderoli/contracts';
import { auth } from '@/auth';
import { getParcel } from '@/lib/api';
import { PARCEL_STATUS_META } from '@/lib/parcel-status';
import { ParcelComposition } from '@/components/ParcelComposition';
import { formatGel, formatMoney } from '@/lib/format';
import { formatDay } from '@/lib/format-day';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-canvas px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default async function ParcelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;
  const parcel = await getParcel(session.user.id, id).catch(() => null);
  if (!parcel) {
    notFound();
  }

  const t = await getTranslations('detail');
  const tc = await getTranslations('card');
  const ts = await getTranslations('status');
  const tcommon = await getTranslations('common');
  const months = tcommon.raw('months') as string[];
  const fmtDate = (iso: string | null): string => formatDay(iso, months);
  const statusLabel = (status: string): string => {
    const meta = PARCEL_STATUS_META[status as ParcelStatus];
    return meta ? ts(meta.key) : status;
  };

  const meta = PARCEL_STATUS_META[parcel.status];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden />
        {t('back')}
      </Link>

      <div className="rounded-xl border border-hairline bg-surface shadow-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-medium">
              {parcel.name ?? parcel.description ?? parcel.trackingNumber ?? tc('fallbackName')}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {parcel.carrier ?? '—'}
              {parcel.trackingNumber ? ` · ${parcel.trackingNumber}` : ''}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium">
            {ts(meta.key)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Field label={tc('fieldValue')} value={formatMoney(parcel.declaredValueUsd, parcel.currency)} />
          <Field
            label={t('inGel')}
            value={parcel.declaredValueGel !== null ? formatGel(parcel.declaredValueGel) : '—'}
          />
          <Field label={tc('fieldWeight')} value={parcel.weightKg !== null ? `${parcel.weightKg} ${tcommon('kg')}` : '—'} />
          <Field label={t('exposure')} value={String(parcel.currentExposureScore)} />
        </div>

        <ParcelComposition parcel={parcel} />

        {parcel.description ? (
          <p className="mt-3 rounded-md bg-canvas px-3 py-2 text-sm text-muted">{parcel.description}</p>
        ) : null}

        <div className="mt-3 text-sm text-muted">
          {parcel.status === 'DELIVERED'
            ? t('deliveredOn', { date: fmtDate(parcel.deliveredAt) })
            : t('expectedArrival', { date: fmtDate(parcel.estimatedArrival) })}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-hairline bg-surface shadow-card p-5">
        <h2 className="mb-4 text-sm font-medium">{t('history')}</h2>
        {parcel.events.length === 0 ? (
          <p className="text-sm text-muted">{t('noEvents')}</p>
        ) : (
          <div>
            {parcel.events.map((event, index) => {
              const isLast = index === parcel.events.length - 1;
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                    {!isLast ? <span className="w-px flex-1 bg-hairline" /> : null}
                  </div>
                  <div className={isLast ? '' : 'pb-5'}>
                    <div className="text-sm font-medium">{statusLabel(event.status)}</div>
                    {event.description ? (
                      <div className="text-sm text-muted">{event.description}</div>
                    ) : null}
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <span>{fmtDate(event.occurredAt)}</span>
                      {event.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} aria-hidden />
                          {event.location}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
