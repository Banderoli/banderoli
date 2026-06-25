import type { ParcelStatus } from '@banderoli/contracts';

export type StatusTone = 'transit' | 'customs' | 'delivered' | 'neutral';

export const PARCEL_STATUS_META: Record<ParcelStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Ожидает', tone: 'neutral' },
  IN_TRANSIT: { label: 'В пути', tone: 'transit' },
  IN_CUSTOMS: { label: 'На таможне', tone: 'customs' },
  CUSTOMS_CLEARED: { label: 'Очищено', tone: 'transit' },
  DELIVERED: { label: 'Доставлено', tone: 'delivered' },
  RETURNED: { label: 'Возврат', tone: 'neutral' },
  EXCEPTION: { label: 'Проблема', tone: 'customs' },
};
