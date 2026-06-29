import type { ExposureResult, ParcelResponse } from '@banderoli/contracts';

export interface DashboardMetrics {
  inTransit: number;
  inCustoms: number;
  spentUsd: number;
  spentGel: number;
}

export interface RecipientOption {
  id: string;
  name: string;
}

export interface DashboardData {
  recipientName: string;
  plan: string;
  city: string;
  metrics: DashboardMetrics;
  weightUsedKg: number;
  weightLimitKg: number;
  parcels: ParcelResponse[];
  exposure: ExposureResult;
  recipients: RecipientOption[];
  selectedRecipientId: string;
}

const CREATED = '2026-06-15T10:00:00.000Z';
const UPDATED = '2026-06-21T08:30:00.000Z';

const parcels: ParcelResponse[] = [
  {
    id: 'p_nike',
    recipientProfileId: 'rec_demo',
    currency: 'USD',
    trackingNumber: '9400111899223',
    carrier: 'USPS',
    store: 'ASOS',
    description: 'Nike Air Max 270 · ASOS',
    name: 'Кроссовки',
    items: [{ id: 'it_nike', name: 'Nike Air Max 270', priceUsd: 40 }],
    shippingCostUsd: 4,
    declaredValueUsd: 44,
    declaredValueGel: 119,
    weightKg: 1.2,
    quantity: 1,
    status: 'IN_CUSTOMS',
    currentExposureScore: 50,
    purchasedAt: null,
    estimatedArrival: '2026-06-23T00:00:00.000Z',
    deliveredAt: null,
    createdAt: CREATED,
    updatedAt: UPDATED,
  },
  {
    id: 'p_fenty',
    recipientProfileId: 'rec_demo',
    currency: 'USD',
    trackingNumber: '7749003311',
    carrier: 'FedEx',
    store: 'Sephora',
    description: 'Косметика Fenty Beauty · Sephora',
    name: 'Косметика',
    items: [{ id: 'it_fenty', name: 'Fenty Beauty набор', priceUsd: 30 }],
    shippingCostUsd: 3,
    declaredValueUsd: 33,
    declaredValueGel: 88,
    weightKg: 0.6,
    quantity: 1,
    status: 'IN_TRANSIT',
    currentExposureScore: 50,
    purchasedAt: null,
    estimatedArrival: '2026-06-23T00:00:00.000Z',
    deliveredAt: null,
    createdAt: CREATED,
    updatedAt: UPDATED,
  },
  {
    id: 'p_books',
    recipientProfileId: 'rec_demo',
    currency: 'USD',
    trackingNumber: '1234556677',
    carrier: 'DHL',
    store: 'Book Depository',
    description: 'Книги × 3 · Book Depository',
    name: 'Книги',
    items: [
      { id: 'it_book1', name: 'Книга 1', priceUsd: 10 },
      { id: 'it_book2', name: 'Книга 2', priceUsd: 10 },
      { id: 'it_book3', name: 'Книга 3', priceUsd: 10 },
    ],
    shippingCostUsd: 4,
    declaredValueUsd: 34,
    declaredValueGel: 92,
    weightKg: 1.4,
    quantity: 3,
    status: 'IN_TRANSIT',
    currentExposureScore: 0,
    purchasedAt: null,
    estimatedArrival: '2026-06-26T00:00:00.000Z',
    deliveredAt: null,
    createdAt: CREATED,
    updatedAt: UPDATED,
  },
  {
    id: 'p_sony',
    recipientProfileId: 'rec_demo',
    currency: 'USD',
    trackingNumber: '1Z999AA10123',
    carrier: 'UPS',
    store: 'Amazon',
    description: 'Наушники Sony WH-1000XM5',
    name: 'Наушники',
    items: [{ id: 'it_sony', name: 'Sony WH-1000XM5', priceUsd: 270 }],
    shippingCostUsd: 9,
    declaredValueUsd: 279,
    declaredValueGel: 753,
    weightKg: 0.5,
    quantity: 1,
    status: 'DELIVERED',
    currentExposureScore: 0,
    purchasedAt: null,
    estimatedArrival: '2026-06-18T00:00:00.000Z',
    deliveredAt: '2026-06-18T14:20:00.000Z',
    createdAt: CREATED,
    updatedAt: UPDATED,
  },
];

const exposure: ExposureResult = {
  recipientProfileId: 'rec_demo',
  score: 50,
  level: 'MEDIUM',
  totalValueGel: 207,
  limitGel: 300,
  remainingGel: 93,
  alerts: [
    {
      code: 'JOINT_ARRIVAL',
      message:
        'Совместное прибытие 2 посылок (23 июня): совокупная стоимость ≈207 GEL. ' +
        'При превышении 300 GEL НДС 18% начисляется на всю сумму.',
    },
  ],
};

export const MOCK_DASHBOARD: DashboardData = {
  recipientName: 'Алия М.',
  plan: 'Pro',
  city: 'Тбилиси',
  metrics: { inTransit: 2, inCustoms: 1, spentUsd: 390, spentGel: 1053 },
  weightUsedKg: 6.2,
  weightLimitKg: 30,
  parcels,
  exposure,
  recipients: [{ id: 'rec_demo', name: 'Алия М.' }],
  selectedRecipientId: 'rec_demo',
};
