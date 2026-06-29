import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Receipt, Weight } from 'lucide-react';
import type { ComponentType } from 'react';
import type { ExposureResult, ParcelResponse } from '@banderoli/contracts';
import type { RecipientExposure } from '@/lib/api';
import type { RecipientOption } from '@/lib/mock-data';
import { ExposureGauge } from './ExposureGauge';
import { LimitBar } from './LimitBar';
import { RecipientSwitcher } from './RecipientSwitcher';

type Tone = 'green' | 'amber' | 'red';

const TONE_BG: Record<Tone, string> = {
  green: 'bg-low-soft',
  amber: 'bg-medium-soft',
  red: 'bg-high-soft',
};
const TONE_TEXT: Record<Tone, string> = {
  green: 'text-low',
  amber: 'text-medium',
  red: 'text-high',
};
const TONE_EMOJI: Record<Tone, string> = { green: '🟢', amber: '🟡', red: '🔴' };
const TONE_ICON: Record<Tone, ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>> = {
  green: CheckCircle2,
  amber: AlertTriangle,
  red: AlertOctagon,
};

function round(value: number): number {
  return Math.round(value);
}

// Personal advisor + блок экспозиции в одном баннере: вердикт по самому рискованному
// получателю, список рисковых посылок и визуальные индикаторы по выбранному получателю.
export function AdvisorBanner({
  recipients,
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
  recipients: RecipientExposure[];
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
  const toUsd = (gel: number): number => (usdRate > 0 ? round(gel / usdRate) : 0);
  const named = recipients.length > 1;

  const exceeded = recipients
    .filter((r) => r.exceeded)
    .sort((a, b) => b.usedGel - b.limitGel - (a.usedGel - a.limitGel));
  const atRisk = recipients
    .filter((r) => !r.exceeded && (r.ratio >= 0.8 || r.jointArrival))
    .sort((a, b) => b.ratio - a.ratio);

  let tone: Tone;
  let title: string;
  let detail: string;

  if (recipients.length === 0) {
    tone = 'green';
    title = 'Готовы к работе';
    detail = 'Добавьте получателей в Настройках и посылки — здесь появится оценка лимита и рисков.';
  } else if (exceeded.length > 0) {
    const r = exceeded[0]!;
    tone = 'red';
    title = `Лимит превышен${named ? ` · ${r.name}` : ''}: ${round(r.usedGel)}/${r.limitGel} GEL`;
    detail =
      `Превышение на ${round(r.usedGel - r.limitGel)} GEL${exceeded.length > 1 ? ` (и ещё у ${exceeded.length - 1})` : ''}. ` +
      'Вероятен НДС 18% и пошлина на всю стоимость — заложите налог в бюджет.';
  } else if (atRisk.length > 0) {
    const r = atRisk[0]!;
    const remGel = Math.max(0, round(r.limitGel - r.usedGel));
    tone = 'amber';
    title = `Есть один риск${named ? ` · ${r.name}` : ''}`;
    detail = r.jointArrival
      ? `Возможно совпадение прибытия — совокупно ≈ ${round(r.usedGel)} GEL из ${r.limitGel}. До лимита ещё ≈ ${remGel} GEL (~$${toUsd(remGel)}).`
      : `Близко к лимиту: осталось ≈ ${remGel} GEL (~$${toUsd(remGel)}) до порога. Новую покупку оформляйте аккуратно.`;
  } else {
    const tightest = [...recipients].sort(
      (a, b) => a.limitGel - a.usedGel - (b.limitGel - b.usedGel),
    )[0]!;
    const remGel = Math.max(0, round(tightest.limitGel - tightest.usedGel));
    tone = 'green';
    title = 'Всё в порядке — рисков нет';
    detail =
      `Можно спокойно заказывать: до лимита ещё ≈ ${remGel} GEL (~$${toUsd(remGel)})` +
      `${named ? ` у получателя ${tightest.name}` : ''}.`;
  }

  // Список конкретных посылок, создающих риск (по рисковым получателям).
  const riskyIds = new Set(
    recipients.filter((r) => r.exceeded || r.ratio >= 0.8 || r.jointArrival).map((r) => r.id),
  );
  const riskyParcels = parcels
    .filter(
      (p) =>
        p.status !== 'DELIVERED' && p.status !== 'EXCEPTION' && riskyIds.has(p.recipientProfileId),
    )
    .map((p) => ({
      label: p.name ?? p.description ?? p.trackingNumber ?? 'Посылка',
      recipient: recipientNameById[p.recipientProfileId] ?? '—',
    }));
  const shownRisky = riskyParcels.slice(0, 6);
  const extraRisky = riskyParcels.length - shownRisky.length;

  const Icon = TONE_ICON[tone];

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-hairline bg-surface shadow-card">
      <div className="grid lg:grid-cols-[1fr_320px]">
        {/* Вердикт + список рисковых посылок */}
        <div className={`p-4 ${TONE_BG[tone]}`}>
          <div className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
              <Icon size={22} aria-hidden className={TONE_TEXT[tone]} />
              <span className="text-base leading-none" aria-hidden>
                {TONE_EMOJI[tone]}
              </span>
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${TONE_TEXT[tone]}`}>{title}</div>
              <div className="mt-0.5 text-sm leading-relaxed text-ink">{detail}</div>
            </div>
          </div>

          {shownRisky.length > 0 ? (
            <div className="mt-3 border-t border-black/5 pt-3">
              <div className={`mb-1 text-xs font-medium ${TONE_TEXT[tone]}`}>Посылки с риском</div>
              <ul className="space-y-0.5 text-sm">
                {shownRisky.map((p, i) => (
                  <li key={`${p.label}-${i}`} className="truncate">
                    <span className="font-medium text-ink">{p.label}</span>
                    <span className="text-muted"> — {p.recipient}</span>
                  </li>
                ))}
                {extraRisky > 0 ? <li className="text-muted">…и ещё {extraRisky}</li> : null}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Индикаторы экспозиции по выбранному получателю */}
        <div className="border-t border-hairline bg-surface p-4 lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Экспозиция · {recipientName}</h3>
            {switcherRecipients.length > 1 ? (
              <RecipientSwitcher recipients={switcherRecipients} selectedId={selectedRecipientId} />
            ) : null}
          </div>

          <ExposureGauge score={exposure.score} level={exposure.level} />

          <div className="mt-4 space-y-3">
            <LimitBar
              icon={<Receipt size={13} aria-hidden />}
              label={`Лимит ${exposure.limitGel} GEL`}
              used={exposure.totalValueGel}
              total={exposure.limitGel}
              valueText={`${round(exposure.totalValueGel)} / ${exposure.limitGel}`}
            />
            <LimitBar
              icon={<Weight size={13} aria-hidden />}
              label="Вес"
              used={weightUsedKg}
              total={weightLimitKg}
              valueText={`${weightUsedKg} / ${weightLimitKg} кг`}
            />
          </div>

          {exposure.alerts.map((alert) => (
            <div
              key={alert.code}
              className="mt-3 flex gap-2 rounded-md bg-medium-soft p-3 text-xs leading-relaxed text-medium"
            >
              <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
