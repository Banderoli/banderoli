import type { ParcelResponse, RecipientResponse } from '@banderoli/contracts';

// Агрегаты считаются в GEL — единой валюте: посылки могут быть в разных валютах,
// и суммировать их корректно можно только после конвертации в лари.
export interface AnalyticsBucket {
  label: string;
  valueGel: number;
  count: number;
}

export interface AnalyticsData {
  totalGel: number;
  totalParcels: number;
  deliveredCount: number;
  byCarrier: AnalyticsBucket[];
  byRecipient: AnalyticsBucket[];
  byStore: AnalyticsBucket[];
}

function bucketize(
  parcels: ParcelResponse[],
  keyOf: (parcel: ParcelResponse) => string,
): AnalyticsBucket[] {
  const map = new Map<string, { valueGel: number; count: number }>();

  for (const parcel of parcels) {
    const key = keyOf(parcel);
    const current = map.get(key) ?? { valueGel: 0, count: 0 };
    current.valueGel += parcel.declaredValueGel ?? 0;
    current.count += 1;
    map.set(key, current);
  }

  return [...map.entries()]
    .map(([label, value]) => ({ label, valueGel: Math.round(value.valueGel), count: value.count }))
    .sort((a, b) => b.valueGel - a.valueGel);
}

export function buildAnalytics(
  parcels: ParcelResponse[],
  recipients: RecipientResponse[],
): AnalyticsData {
  const nameById = new Map(recipients.map((r) => [r.id, r.name]));

  return {
    totalGel: Math.round(parcels.reduce((sum, p) => sum + (p.declaredValueGel ?? 0), 0)),
    totalParcels: parcels.length,
    deliveredCount: parcels.filter((p) => p.status === 'DELIVERED').length,
    byCarrier: bucketize(parcels, (p) => p.carrier ?? 'Без перевозчика'),
    byRecipient: bucketize(parcels, (p) => nameById.get(p.recipientProfileId) ?? 'Неизвестно'),
    byStore: bucketize(parcels, (p) => p.store ?? 'Прочее'),
  };
}
