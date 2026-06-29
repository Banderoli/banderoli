import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ComponentType } from 'react';
import type { RecipientExposure } from '@/lib/api';

type Tone = 'green' | 'amber' | 'red';

const TONE_CLASS: Record<Tone, string> = {
  green: 'bg-low-soft text-low',
  amber: 'bg-medium-soft text-medium',
  red: 'bg-high-soft text-high',
};

const TONE_ICON: Record<Tone, ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>> = {
  green: CheckCircle2,
  amber: AlertTriangle,
  red: AlertOctagon,
};

function round(value: number): number {
  return Math.round(value);
}

// Personal advisor: одна короткая фраза-вердикт по самому рискованному получателю.
// Снижает тревогу — отвечает на вопрос «можно ли спокойно заказывать ещё?».
export function AdvisorBanner({
  recipients,
  usdRate,
}: {
  recipients: RecipientExposure[];
  usdRate: number;
}) {
  if (recipients.length === 0) {
    return null;
  }

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

  if (exceeded.length > 0) {
    const r = exceeded[0]!;
    const over = round(r.usedGel - r.limitGel);
    tone = 'red';
    title = `Лимит превышен${named ? ` · ${r.name}` : ''}: ${round(r.usedGel)}/${r.limitGel} GEL`;
    detail =
      `Превышение на ${over} GEL${exceeded.length > 1 ? ` (и ещё у ${exceeded.length - 1})` : ''}. ` +
      'Вероятен НДС 18% и пошлина на всю стоимость — заложите налог в бюджет.';
  } else if (atRisk.length > 0) {
    const r = atRisk[0]!;
    const remGel = Math.max(0, round(r.limitGel - r.usedGel));
    tone = 'amber';
    title = `Есть один риск${named ? ` · ${r.name}` : ''}`;
    detail = r.jointArrival
      ? `Возможно совпадение прибытия — совокупно ≈ ${round(r.usedGel)} GEL из ${r.limitGel}. ` +
        `До лимита ещё ≈ ${remGel} GEL (~$${toUsd(remGel)}). Спланируйте бюджет.`
      : `Близко к лимиту: осталось ≈ ${remGel} GEL (~$${toUsd(remGel)}) до порога. ` +
        'Новую покупку оформляйте аккуратно.';
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

  const Icon = TONE_ICON[tone];

  return (
    <div className={`mb-4 flex items-start gap-3 rounded-xl p-4 shadow-card ${TONE_CLASS[tone]}`}>
      <Icon size={20} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-sm leading-relaxed">{detail}</div>
      </div>
    </div>
  );
}
