import { AlertOctagon, AlertTriangle, CalendarClock, CheckCircle2, Info, PackageX, Receipt, Weight } from 'lucide-react';
import type { ComponentType } from 'react';
import {
  EXPOSURE_ALERT_CODES,
  type ExposureResult,
  type ParcelResponse,
} from '@banderoli/contracts';
import type { RecipientOption } from '@/lib/mock-data';
import { buildRiskNotices, type RiskNotice } from '@/lib/risk-notices';
import { formatShortDate } from '@/lib/format';
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

function fmtDay(day: string): string {
  return formatShortDate(`${day}T12:00:00`);
}

// Человекочитаемый текст уведомления — называем получателя и конкретные посылки.
function noticeText(n: RiskNotice): string {
  const val = `${n.valueGel} GEL из ${n.limitGel}`;
  if (n.kind === 'exceeded') {
    return `Лимит превышен: ${n.recipientName} — «${n.parcels[0]}» (${val}). Вероятен НДС 18% и пошлина на всю стоимость — заложите налог в бюджет.`;
  }
  if (n.kind === 'sameDay') {
    const list = n.parcels.map((p) => `«${p}»`).join(' + ');
    const head = `На один день (${fmtDay(n.days[0]!)}) выписаны: ${n.recipientName} — ${list} = ${val}.`;
    return n.exceeded
      ? `${head} Совместное прибытие превышает лимит — лучше не выписывать на эту дату.`
      : `${head} Пока в пределах лимита, но новые заказы на эту дату оформляйте с осторожностью.`;
  }
  const list = n.parcels.map((p) => `«${p}»`).join(', ');
  const range = `${fmtDay(n.days[0]!)}–${fmtDay(n.days[n.days.length - 1]!)}`;
  return `Риск объединения (${range}): ${n.recipientName} — ${list} = ${val}. Даты рядом — при сдвиге рейсов посылки могут прийти в один день и превысить лимит.`;
}

// Единый блок «риск + лимит»: адресные уведомления по датам прибытия (кто и какие
// посылки), плюс полосы лимита/веса по выбранному получателю.
export function AdvisorBanner({
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
  const notices = buildRiskNotices(parcels, recipientNameById, exposure.limitGel);
  const hasRed = notices.some((n) => n.tone === 'red');
  const tone: Tone = hasRed ? 'red' : notices.length > 0 ? 'amber' : 'green';
  const Icon = TONE_ICON[tone];

  const remGel = round(exposure.remainingGel);
  const remUsd = usdRate > 0 ? round(remGel / usdRate) : 0;

  let title: string;
  let detail: string;
  if (notices.length === 0) {
    title = 'Всё в порядке — рисков нет';
    detail = `Можно спокойно заказывать. У получателя ${recipientName} до лимита ещё ≈ ${remGel} GEL (~$${remUsd}) за пиковый день прибытия.`;
  } else {
    const redCount = notices.filter((n) => n.tone === 'red').length;
    title = hasRed
      ? `Внимание: превышение лимита (${redCount})`
      : `Есть риски по датам прибытия (${notices.length})`;
    detail = hasRed
      ? 'Совокупная стоимость на день прибытия выше 300 GEL — при ввозе вероятны НДС и пошлина. Детали ниже.'
      : 'Посылки могут прийти вместе и превысить лимит 300 GEL. Проверьте даты ниже.';
  }

  const extraAlerts = exposure.alerts.filter((a) => EXTRA_ALERT_CODES.includes(a.code));

  return (
    <div className={`mb-4 rounded-xl border border-hairline border-l-4 ${TONE_BORDER[tone]} bg-surface p-4 shadow-card`}>
      {/* Заголовок-советник + переключатель получателя (для полос ниже) */}
      <div className="flex items-start justify-between gap-3">
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
        {switcherRecipients.length > 1 ? (
          <RecipientSwitcher recipients={switcherRecipients} selectedId={selectedRecipientId} />
        ) : null}
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
        <div className="mb-2 text-xs text-muted">
          Лимит получателя <span className="font-medium text-ink">{recipientName}</span> — за пиковый
          день прибытия
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <LimitBar
            icon={<Receipt size={13} aria-hidden />}
            label={`Стоимость · ${exposure.limitGel} GEL`}
            used={exposure.totalValueGel}
            total={exposure.limitGel}
            valueText={`${round(exposure.totalValueGel)} / ${exposure.limitGel}`}
          />
          <LimitBar
            icon={<Weight size={13} aria-hidden />}
            label={`Вес · ${weightLimitKg} кг`}
            used={weightUsedKg}
            total={weightLimitKg}
            valueText={`${weightUsedKg} / ${weightLimitKg} кг`}
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
