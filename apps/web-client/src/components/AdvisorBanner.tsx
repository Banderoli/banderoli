import { AlertOctagon, AlertTriangle, CalendarClock, CheckCircle2, Info, PackageX, Receipt, Weight } from 'lucide-react';
import type { ComponentType } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  EXPOSURE_ALERT_CODES,
  type ExposureResult,
  type ParcelResponse,
} from '@banderoli/contracts';
import type { RecipientOption } from '@/lib/mock-data';
import { formatDay } from '@/lib/format-day';
import { buildRiskNotices, type RiskNotice } from '@/lib/risk-notices';
import { LimitBar } from './LimitBar';
import { RecipientSwitcher } from './RecipientSwitcher';

type Tone = 'green' | 'amber' | 'red';

const TONE_TEXT: Record<Tone, string> = { green: 'text-low', amber: 'text-medium', red: 'text-high' };
const TONE_BORDER: Record<Tone, string> = {
  green: 'border-l-low',
  amber: 'border-l-medium',
  red: 'border-l-high',
};
const TONE_BG: Record<Exclude<Tone, 'green'>, string> = { amber: 'bg-medium-soft', red: 'bg-high-soft' };
const TONE_EMOJI: Record<Tone, string> = { green: '🟢', amber: '🟡', red: '🔴' };
const TONE_ICON: Record<Tone, ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>> = {
  green: CheckCircle2,
  amber: AlertTriangle,
  red: AlertOctagon,
};
const NOTICE_ICON: Record<RiskNotice['kind'], ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>> = {
  exceeded: PackageX,
  sameDay: CalendarClock,
  nearDay: CalendarClock,
};

// Однотипность/вес не завязаны на даты — оставляем как отдельные подсказки по выбранному
// получателю (стоимость и совпадение прибытия уже покрыты уведомлениями о риске).
const EXTRA_ALERT_CODES: string[] = [
  EXPOSURE_ALERT_CODES.HOMOGENEOUS_GOODS,
  EXPOSURE_ALERT_CODES.WEIGHT_EXCEEDED,
];

function round(value: number): number {
  return Math.round(value);
}

// Единый блок «риск + лимит»: адресные уведомления по датам прибытия (кто и какие
// посылки), плюс полосы лимита/веса по выбранному получателю.
export async function AdvisorBanner({
  usdRate,
  exposure,
  recipientName,
  weightUsedKg,
  weightLimitKg,
  switcherRecipients,
  selectedRecipientId,
  parcels,
  recipientNameById,
}: {
  usdRate: number;
  exposure: ExposureResult;
  recipientName: string;
  weightUsedKg: number;
  weightLimitKg: number;
  switcherRecipients: RecipientOption[];
  selectedRecipientId: string;
  parcels: ParcelResponse[];
  recipientNameById: Record<string, string>;
}) {
  const t = await getTranslations('advisor');
  const tc = await getTranslations('common');
  const locale = await getLocale();
  const months = tc.raw('months') as string[];
  const [openQuote, closeQuote] = locale === 'en' ? ['“', '”'] : ['«', '»'];
  const wrap = (label: string): string => `${openQuote}${label}${closeQuote}`;
  const fmtDay = (day: string): string => formatDay(day, months);

  const notices = buildRiskNotices(parcels, recipientNameById, exposure.limitGel);
  const hasRed = notices.some((n) => n.tone === 'red');
  const tone: Tone = hasRed ? 'red' : notices.length > 0 ? 'amber' : 'green';
  const Icon = TONE_ICON[tone];

  const remGel = round(exposure.remainingGel);
  const remUsd = usdRate > 0 ? round(remGel / usdRate) : 0;

  let title: string;
  let detail: string;
  if (notices.length === 0) {
    title = t('okTitle');
    detail = t('okDetail', { recipient: recipientName, rem: remGel, remUsd });
  } else if (hasRed) {
    title = t('exceededTitle', { count: notices.filter((n) => n.tone === 'red').length });
    detail = t('exceededDetail');
  } else {
    title = t('riskTitle', { count: notices.length });
    detail = t('riskDetail');
  }

  const noticeText = (n: RiskNotice): string => {
    if (n.kind === 'exceeded') {
      return t('noticeExceeded', {
        recipient: n.recipientName,
        parcel: n.parcels[0] ?? '',
        value: n.valueGel,
        limit: n.limitGel,
      });
    }
    if (n.kind === 'sameDay') {
      const key = n.exceeded ? 'noticeSameDayExceeded' : 'noticeSameDayWithin';
      return t(key, {
        recipient: n.recipientName,
        list: n.parcels.map(wrap).join(' + '),
        value: n.valueGel,
        limit: n.limitGel,
        date: fmtDay(n.days[0]!),
      });
    }
    return t('noticeNearDay', {
      recipient: n.recipientName,
      list: n.parcels.map(wrap).join(', '),
      value: n.valueGel,
      limit: n.limitGel,
      range: `${fmtDay(n.days[0]!)}–${fmtDay(n.days[n.days.length - 1]!)}`,
    });
  };

  const extraAlerts = exposure.alerts.filter((a) => EXTRA_ALERT_CODES.includes(a.code));

  return (
    <div className={`mb-4 rounded-xl border border-hairline border-l-4 ${TONE_BORDER[tone]} bg-surface p-4 shadow-card`}>
      {/* Заголовок-советник */}
      <div className="flex min-w-0 gap-2.5">
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          <Icon size={20} aria-hidden className={TONE_TEXT[tone]} />
          <span className="text-sm leading-none" aria-hidden>
            {TONE_EMOJI[tone]}
          </span>
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-semibold ${TONE_TEXT[tone]}`}>{title}</div>
          <div className="mt-0.5 text-sm leading-relaxed text-ink">{detail}</div>
        </div>
      </div>

      {/* Адресные уведомления по датам прибытия */}
      {notices.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {notices.map((n, idx) => {
            const NIcon = NOTICE_ICON[n.kind];
            return (
              <li
                key={`${n.recipientName}-${n.kind}-${idx}`}
                className={`flex gap-2 rounded-md ${TONE_BG[n.tone]} p-2.5 text-sm leading-relaxed`}
              >
                <NIcon size={15} aria-hidden className={`mt-0.5 shrink-0 ${TONE_TEXT[n.tone]}`} />
                <span className="text-ink">{noticeText(n)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Полосы лимита по выбранному получателю — за пиковый день прибытия */}
      <div className="mt-4 border-t border-hairline pt-3">
        <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
          <span>{t('limitFor')}</span>
          {switcherRecipients.length > 1 ? (
            <RecipientSwitcher recipients={switcherRecipients} selectedId={selectedRecipientId} />
          ) : (
            <span className="font-medium text-ink">{recipientName}</span>
          )}
          <span>
            — {t('peakDay')}
            {exposure.peakDay ? ` · ${fmtDay(exposure.peakDay)}` : ''}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <LimitBar
            icon={<Receipt size={13} aria-hidden />}
            label={t('valueBar', { limit: exposure.limitGel })}
            used={exposure.totalValueGel}
            total={exposure.limitGel}
            valueText={`${round(exposure.totalValueGel)} / ${exposure.limitGel}`}
          />
          <LimitBar
            icon={<Weight size={13} aria-hidden />}
            label={t('weightBar', { limit: weightLimitKg })}
            used={weightUsedKg}
            total={weightLimitKg}
            valueText={`${weightUsedKg} / ${weightLimitKg} ${tc('kg')}`}
          />
        </div>
        {extraAlerts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {extraAlerts.map((alert) => (
              <div
                key={alert.code}
                className="flex gap-2 rounded-md bg-medium-soft p-2.5 text-xs leading-relaxed text-medium"
              >
                <Info size={14} aria-hidden className="mt-0.5 shrink-0" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
