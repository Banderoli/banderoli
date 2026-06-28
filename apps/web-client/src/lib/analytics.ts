import type { ParcelResponse, RecipientResponse } from '@banderoli/contracts';

export interface AnalyticsBucket {
  label: string;
  valueUsd: number;
  count: number;
}

export interface AnalyticsData {
  totalUsd: number;
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
  const map = new Map<string, { valueUsd: number; count: number }>();

  for (const parcel of parcels) {
    const key = keyOf(parcel);
    const current = map.get(key) ?? { valueUsd: 0, count: 0 };
    current.valueUsd += parcel.declaredValueUsd ?? 0;
    current.count += 1;
    map.set(key, current);
  }

  return [...map.entries()]
    .map(([label, value]) => ({ label, valueUsd: Math.round(value.valueUsd), count: value.count }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

export function buildAnalytics(
  parcels: ParcelResponse[],
  recipients: RecipientResponse[],
): AnalyticsData {
  const nameById = new Map(recipients.map((r) => [r.id, r.name]));

  return {
    totalUsd: Math.round(parcels.reduce((sum, p) => sum + (p.declaredValueUsd ?? 0), 0)),
    totalGel: Math.round(parcels.reduce((sum, p) => sum + (p.declaredValueGel ?? 0), 0)),
    totalParcels: parcels.length,
    deliveredCount: parcels.filter((p) => p.status === 'DELIVERED').length,
    byCarrier: bucketize(parcels, (p) => p.carrier ?? 'Без перевозчика'),
    byRecipient: bucketize(parcels, (p) => nameById.get(p.recipientProfileId) ?? 'Неизвестно'),
    byStore: bucketize(parcels, (p) => p.store ?? 'Прочее'),
  };
}
