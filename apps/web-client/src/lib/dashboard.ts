import type { ParcelResponse } from '@banderoli/contracts';
import { getExposure, listParcels, listRecipients } from './api';
import { MOCK_DASHBOARD, type DashboardData, type DashboardMetrics } from './mock-data';

const ACTIVE_STATUSES: ReadonlyArray<ParcelResponse['status']> = [
  'PENDING',
  'IN_TRANSIT',
  'IN_CUSTOMS',
  'CUSTOMS_CLEARED',
];

function sum(values: Array<number | null>): number {
  return values.reduce<number>((acc, value) => acc + (value ?? 0), 0);
}

function computeMetrics(parcels: ParcelResponse[]): DashboardMetrics {
  return {
    inTransit: parcels.filter((p) => p.status === 'IN_TRANSIT').length,
    inCustoms: parcels.filter((p) => p.status === 'IN_CUSTOMS').length,
    spentUsd: Math.round(sum(parcels.map((p) => p.declaredValueUsd))),
    spentGel: Math.round(sum(parcels.map((p) => p.declaredValueGel))),
  };
}

function activeWeightKg(parcels: ParcelResponse[]): number {
  const active = parcels.filter((p) => ACTIVE_STATUSES.includes(p.status));
  return Math.round(sum(active.map((p) => p.weightKg)) * 10) / 10;
}

export interface DashboardResult {
  data: DashboardData;
  demo: boolean;
}

// Тянет реальные данные из api-gateway. Если получателей нет или шлюз недоступен —
// показываем демо-данные с пометкой, чтобы страница оставалась рабочей.
export async function loadDashboard(
  userId: string,
  recipientId?: string,
): Promise<DashboardResult> {
  try {
    const recipients = await listRecipients(userId);
    const selected = recipients.find((r) => r.id === recipientId) ?? recipients[0];
    if (!selected) {
      throw new Error('no recipient yet');
    }

    const [parcels, exposure] = await Promise.all([
      listParcels(userId, selected.id),
      getExposure(userId, selected.id),
    ]);

    return {
      demo: false,
      data: {
        recipientName: selected.name,
        plan: 'Pro',
        city: 'Тбилиси',
        metrics: computeMetrics(parcels),
        weightUsedKg: activeWeightKg(parcels),
        weightLimitKg: 30,
        parcels,
        exposure,
        recipients: recipients.map((r) => ({ id: r.id, name: r.name })),
        selectedRecipientId: selected.id,
      },
    };
  } catch {
    return { data: MOCK_DASHBOARD, demo: true };
  }
}
