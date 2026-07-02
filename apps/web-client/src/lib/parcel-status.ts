import type { ParcelStatus } from '@banderoli/contracts';

export type StatusTone = 'transit' | 'customs' | 'delivered' | 'neutral';

// key — ключ в словаре status.* (сам текст переводится в UI); tone — цвет бейджа.
export const PARCEL_STATUS_META: Record<ParcelStatus, { key: string; tone: StatusTone }> = {
  PENDING: { key: 'pending', tone: 'neutral' },
  IN_TRANSIT: { key: 'inTransit', tone: 'transit' },
  IN_CUSTOMS: { key: 'inCustoms', tone: 'customs' },
  CUSTOMS_CLEARED: { key: 'customsCleared', tone: 'transit' },
  DELIVERED: { key: 'delivered', tone: 'delivered' },
  RETURNED: { key: 'returned', tone: 'neutral' },
  EXCEPTION: { key: 'exception', tone: 'neutral' },
};
