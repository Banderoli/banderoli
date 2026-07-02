import type { ParcelResponse } from '@banderoli/contracts';

// Умные уведомления о таможенном риске: считаем не «худший день одного получателя»,
// а конкретные события по каждому получателю и явно называем посылки. Логика привязана
// к датам прибытия — это соответствует правилу консолидации по операционному дню.
//
//   exceeded — одна посылка сама по себе превышает лимит 300 GEL;
//   sameDay  — 2+ посылки выписаны на один день (их стоимость суммируется таможней);
//   nearDay  — даты прибытия в пределах 1–2 дней: при сдвиге рейсов посылки могут
//              прийти вместе и превысить лимит.

export type RiskNoticeKind = 'exceeded' | 'sameDay' | 'nearDay';

export interface RiskNotice {
  kind: RiskNoticeKind;
  tone: 'red' | 'amber';
  recipientName: string;
  parcels: string[];
  valueGel: number;
  limitGel: number;
  exceeded: boolean;
  // ISO-даты (YYYY-MM-DD) участвующих дней прибытия, по возрастанию.
  days: string[];
}

const ACTIVE_STATUSES: ReadonlyArray<ParcelResponse['status']> = [
  'PENDING',
  'IN_TRANSIT',
  'IN_CUSTOMS',
  'CUSTOMS_CLEARED',
];

// Разница дат прибытия (в днях), при которой посылки считаем «рядом» — риск слияния.
const NEAR_ARRIVAL_DAYS = 2;
// Порог, ниже которого совпадение в один день не показываем (до лимита ещё много места).
const SAME_DAY_NOTICE_RATIO = 0.5;

function round(value: number): number {
  return Math.round(value);
}

function parcelLabel(p: ParcelResponse): string {
  return p.name ?? p.description ?? p.trackingNumber ?? 'Посылка';
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

interface DayGroup {
  day: string;
  parcels: ParcelResponse[];
  sum: number;
}

export function buildRiskNotices(
  parcels: ParcelResponse[],
  recipientNameById: Record<string, string>,
  limitGel: number,
): RiskNotice[] {
  const notices: RiskNotice[] = [];

  // Активные датированные посылки с положительной стоимостью, сгруппированные по получателю.
  const byRecipient = new Map<string, ParcelResponse[]>();
  for (const p of parcels) {
    if (!ACTIVE_STATUSES.includes(p.status)) continue;
    if (!p.estimatedArrival) continue;
    if ((p.declaredValueGel ?? 0) <= 0) continue;
    const list = byRecipient.get(p.recipientProfileId) ?? [];
    list.push(p);
    byRecipient.set(p.recipientProfileId, list);
  }

  for (const [recipientId, list] of byRecipient) {
    const name = recipientNameById[recipientId] ?? '—';

    // 1) Посылки, которые сами по себе превышают лимит.
    for (const p of list.filter((x) => (x.declaredValueGel ?? 0) > limitGel)) {
      notices.push({
        kind: 'exceeded',
        tone: 'red',
        recipientName: name,
        parcels: [parcelLabel(p)],
        valueGel: round(p.declaredValueGel ?? 0),
        limitGel,
        exceeded: true,
        days: [dayKey(p.estimatedArrival as string)],
      });
    }

    // Остальные (каждая в пределах лимита) — участвуют в дневных и «соседних» сценариях.
    const rest = list.filter((x) => (x.declaredValueGel ?? 0) <= limitGel);

    const groupByDay = new Map<string, ParcelResponse[]>();
    for (const p of rest) {
      const key = dayKey(p.estimatedArrival as string);
      const group = groupByDay.get(key) ?? [];
      group.push(p);
      groupByDay.set(key, group);
    }
    const days: DayGroup[] = [...groupByDay.entries()]
      .map(([day, ps]) => ({
        day,
        parcels: ps,
        sum: ps.reduce((s, p) => s + (p.declaredValueGel ?? 0), 0),
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // 2) Совпадение прибытия в один день (2+ посылки).
    for (const group of days) {
      if (group.parcels.length >= 2 && group.sum >= limitGel * SAME_DAY_NOTICE_RATIO) {
        notices.push({
          kind: 'sameDay',
          tone: group.sum > limitGel ? 'red' : 'amber',
          recipientName: name,
          parcels: group.parcels.map(parcelLabel),
          valueGel: round(group.sum),
          limitGel,
          exceeded: group.sum > limitGel,
          days: [group.day],
        });
      }
    }

    // 3) Соседние дни (в пределах 1–2 дней): риск объединения при сдвиге рейсов.
    let i = 0;
    while (i < days.length) {
      let j = i;
      while (j + 1 < days.length && daysBetween(days[j]!.day, days[j + 1]!.day) <= NEAR_ARRIVAL_DAYS) {
        j += 1;
      }
      if (j > i) {
        const cluster = days.slice(i, j + 1);
        const sum = round(cluster.reduce((s, d) => s + d.sum, 0));
        if (sum > limitGel) {
          notices.push({
            kind: 'nearDay',
            tone: 'amber',
            recipientName: name,
            parcels: cluster.flatMap((d) => d.parcels.map(parcelLabel)),
            valueGel: sum,
            limitGel,
            exceeded: false,
            days: cluster.map((d) => d.day),
          });
        }
      }
      i = j + 1;
    }
  }

  // Красные (уже нарушенные) — выше жёлтых (условных); внутри — по типу события.
  const kindOrder: Record<RiskNoticeKind, number> = { exceeded: 0, sameDay: 1, nearDay: 2 };
  return notices.sort((a, b) => {
    if (a.tone !== b.tone) return a.tone === 'red' ? -1 : 1;
    return kindOrder[a.kind] - kindOrder[b.kind];
  });
}
