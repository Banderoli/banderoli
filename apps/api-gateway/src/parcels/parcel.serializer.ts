import { decimalToNumber } from '@banderoli/common';
import type { ParcelDetailResponse, ParcelResponse } from '@banderoli/contracts';
import type { LogisticsEvent, Parcel, ParcelItem } from '@banderoli/database';

export function serializeParcel(parcel: Parcel & { items?: ParcelItem[] }): ParcelResponse {
  return {
    id: parcel.id,
    recipientProfileId: parcel.recipientProfileId,
    name: parcel.name,
    trackingNumber: parcel.trackingNumber,
    carrier: parcel.carrier,
    store: parcel.store,
    description: parcel.description,
    currency: parcel.currency ?? 'USD',
    items: (parcel.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      priceUsd: decimalToNumber(item.priceUsd) ?? 0,
    })),
    declaredValueUsd: decimalToNumber(parcel.declaredValueUsd),
    declaredValueGel: decimalToNumber(parcel.declaredValueGel),
    shippingCostUsd: decimalToNumber(parcel.shippingCostUsd),
    weightKg: decimalToNumber(parcel.weightKg),
    quantity: parcel.quantity,
    status: parcel.status,
    currentExposureScore: parcel.currentExposureScore,
    purchasedAt: parcel.purchasedAt ? parcel.purchasedAt.toISOString() : null,
    estimatedArrival: parcel.estimatedArrival
      ? parcel.estimatedArrival.toISOString()
      : null,
    deliveredAt: parcel.deliveredAt ? parcel.deliveredAt.toISOString() : null,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
  };
}

export function serializeParcelDetail(
  parcel: Parcel & { logisticsEvents: LogisticsEvent[]; items?: ParcelItem[] },
): ParcelDetailResponse {
  return {
    ...serializeParcel(parcel),
    events: parcel.logisticsEvents.map((event) => ({
      id: event.id,
      status: event.status,
      description: event.description,
      location: event.location,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}
