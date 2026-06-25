// Vercel-native слой данных: прямые запросы к Postgres (Prisma) + движок экспозиции
// как библиотека. Заменяет HTTP-вызовы к NestJS-шлюзу. Всё здесь — серверное.
import {
  AI_DAILY_LIMIT,
  USD_TO_GEL_RATE,
  type AiQuota,
  type ExposureResult,
  type ParcelDetailResponse,
  type ParcelResponse,
  type ProductSearchResponse,
  type ProductSuggestion,
  type RecipientResponse,
  type ReviewResponse,
  type ReviewSummary,
} from '@banderoli/contracts';
import { Prisma, prisma } from '@banderoli/database';
import type { LogisticsEvent, Parcel, RecipientProfile } from '@banderoli/database';
import {
  calculateExposure,
  type ParcelExposureInput,
} from '@banderoli/customs-exposure-engine';
import { estimateEta } from '@banderoli/flight-intelligence';

const ACTIVE_STATUSES: Parcel['status'][] = [
  'PENDING',
  'IN_TRANSIT',
  'IN_CUSTOMS',
  'CUSTOMS_CLEARED',
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function toNumberOr(value: Prisma.Decimal | null, fallback: number): number {
  return value === null ? fallback : value.toNumber();
}

// ─── Сериализаторы ────────────────────────────────────────────────────────────

function serializeRecipient(r: RecipientProfile): RecipientResponse {
  return {
    id: r.id,
    userId: r.userId,
    name: r.name,
    isDefault: r.isDefault,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function serializeParcel(p: Parcel): ParcelResponse {
  return {
    id: p.id,
    recipientProfileId: p.recipientProfileId,
    trackingNumber: p.trackingNumber,
    carrier: p.carrier,
    description: p.description,
    declaredValueUsd: toNumber(p.declaredValueUsd),
    declaredValueGel: toNumber(p.declaredValueGel),
    weightKg: toNumber(p.weightKg),
    quantity: p.quantity,
    status: p.status,
    currentExposureScore: p.currentExposureScore,
    estimatedArrival: p.estimatedArrival ? p.estimatedArrival.toISOString() : null,
    deliveredAt: p.deliveredAt ? p.deliveredAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeParcelDetail(
  p: Parcel & { logisticsEvents: LogisticsEvent[] },
): ParcelDetailResponse {
  return {
    ...serializeParcel(p),
    events: p.logisticsEvents.map((e) => ({
      id: e.id,
      status: e.status,
      description: e.description,
      location: e.location,
      occurredAt: e.occurredAt.toISOString(),
    })),
  };
}

// ─── Получатели ───────────────────────────────────────────────────────────────

async function ensureRecipientOwned(userId: string, recipientId: string): Promise<void> {
  const found = await prisma.recipientProfile.findFirst({
    where: { id: recipientId, userId },
    select: { id: true },
  });
  if (!found) {
    throw new Error('Получатель не найден');
  }
}

async function clearDefault(userId: string): Promise<void> {
  await prisma.recipientProfile.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  });
}

export async function listRecipients(userId: string): Promise<RecipientResponse[]> {
  const rows = await prisma.recipientProfile.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(serializeRecipient);
}

export async function createRecipient(
  userId: string,
  body: { name: string; isDefault?: boolean },
): Promise<RecipientResponse> {
  if (body.isDefault) {
    await clearDefault(userId);
  }
  const created = await prisma.recipientProfile.create({
    data: { userId, name: body.name, isDefault: body.isDefault ?? false },
  });
  return serializeRecipient(created);
}

export async function updateRecipient(
  userId: string,
  recipientId: string,
  body: { name?: string; isDefault?: boolean },
): Promise<RecipientResponse> {
  await ensureRecipientOwned(userId, recipientId);
  if (body.isDefault) {
    await clearDefault(userId);
  }
  const updated = await prisma.recipientProfile.update({
    where: { id: recipientId },
    data: body,
  });
  return serializeRecipient(updated);
}

export async function deleteRecipient(userId: string, recipientId: string): Promise<void> {
  await ensureRecipientOwned(userId, recipientId);
  await prisma.recipientProfile.delete({ where: { id: recipientId } });
}

// ─── Посылки ──────────────────────────────────────────────────────────────────

export interface CreateParcelBody {
  recipientProfileId: string;
  trackingNumber: string;
  carrier?: string;
  description?: string;
  declaredValueUsd?: number;
  weightKg?: number;
  quantity?: number;
}

export async function listParcels(
  userId: string,
  recipientId?: string,
): Promise<ParcelResponse[]> {
  const rows = await prisma.parcel.findMany({
    where: {
      recipientProfile: { userId },
      ...(recipientId ? { recipientProfileId: recipientId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeParcel);
}

export async function getParcel(
  userId: string,
  parcelId: string,
): Promise<ParcelDetailResponse> {
  const parcel = await prisma.parcel.findFirst({
    where: { id: parcelId, recipientProfile: { userId } },
    include: { logisticsEvents: { orderBy: { occurredAt: 'asc' } } },
  });
  if (!parcel) {
    throw new Error('Посылка не найдена');
  }
  return serializeParcelDetail(parcel);
}

// Пересчёт и персист экспозиции получателя (замена воркера в Vercel-native).
async function recomputeExposure(recipientProfileId: string): Promise<void> {
  const parcels = await prisma.parcel.findMany({
    where: { recipientProfileId, status: { in: ACTIVE_STATUSES } },
  });
  const inputs: ParcelExposureInput[] = parcels.map((p) => ({
    valueGel: toNumberOr(p.declaredValueGel, 0),
    weightKg: toNumberOr(p.weightKg, 0),
    quantity: p.quantity,
    estimatedArrival: p.estimatedArrival,
  }));
  const result = calculateExposure(recipientProfileId, inputs);
  await prisma.parcel.updateMany({
    where: { recipientProfileId, status: { in: ACTIVE_STATUSES } },
    data: { currentExposureScore: result.score },
  });
}

export async function createParcel(
  userId: string,
  body: CreateParcelBody,
): Promise<ParcelResponse> {
  await ensureRecipientOwned(userId, body.recipientProfileId);

  const declaredValueUsd = body.declaredValueUsd ?? null;
  const declaredValueGel =
    declaredValueUsd === null ? null : round2(declaredValueUsd * USD_TO_GEL_RATE);
  const eta = estimateEta({ carrier: body.carrier ?? null, shippedAt: null });

  const parcel = await prisma.parcel.create({
    data: {
      recipientProfileId: body.recipientProfileId,
      trackingNumber: body.trackingNumber,
      carrier: body.carrier ?? null,
      description: body.description ?? null,
      declaredValueUsd,
      declaredValueGel,
      weightKg: body.weightKg ?? null,
      quantity: body.quantity ?? 1,
      estimatedArrival: eta.estimatedArrival,
    },
  });

  await recomputeExposure(body.recipientProfileId);
  return serializeParcel(parcel);
}

// ─── Экспозиция ───────────────────────────────────────────────────────────────

export async function getExposure(
  userId: string,
  recipientId: string,
): Promise<ExposureResult> {
  await ensureRecipientOwned(userId, recipientId);

  const parcels = await prisma.parcel.findMany({
    where: { recipientProfileId: recipientId, status: { in: ACTIVE_STATUSES } },
  });
  const inputs: ParcelExposureInput[] = parcels.map((p) => ({
    valueGel: toNumberOr(p.declaredValueGel, 0),
    weightKg: toNumberOr(p.weightKg, 0),
    quantity: p.quantity,
    estimatedArrival: p.estimatedArrival,
  }));

  return calculateExposure(recipientId, inputs);
}

// ─── ИИ-функции (мок-движок + дневная квота) ─────────────────────────────────

function aiToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function ensureAiQuota(userId: string): Promise<void> {
  const usage = await prisma.aiUsage.findUnique({
    where: { userId_day: { userId, day: aiToday() } },
  });
  if ((usage?.count ?? 0) >= AI_DAILY_LIMIT) {
    throw new Error('AI_QUOTA_EXCEEDED_429');
  }
}

async function consumeAiQuota(userId: string): Promise<AiQuota> {
  const day = aiToday();
  const usage = await prisma.aiUsage.upsert({
    where: { userId_day: { userId, day } },
    update: { count: { increment: 1 } },
    create: { userId, day, count: 1 },
  });
  return {
    used: usage.count,
    limit: AI_DAILY_LIMIT,
    remaining: Math.max(0, AI_DAILY_LIMIT - usage.count),
  };
}

function titleFromUrl(url: string): { title: string; host: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const segment = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
    const cleaned = decodeURIComponent(segment)
      .replace(/\.\w+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    return { title: cleaned.length > 0 ? cleaned : host, host };
  } catch {
    return { title: 'Товар', host: 'источник' };
  }
}

function mockReview(url: string): ReviewSummary {
  const { title, host } = titleFromUrl(url);
  return {
    productTitle: title,
    sourceUrl: url,
    rating: 4.2,
    sentiment: 'positive',
    pros: ['Соответствует описанию', 'Хорошее соотношение цена/качество', 'Быстрая доставка у большинства'],
    cons: ['Встречаются жалобы на упаковку', 'Размер может отличаться'],
    summary:
      'Демонстрационная сводка отзывов (реальный ИИ-движок ещё не подключён). ' +
      'После подключения Claude здесь будет агрегированный анализ отзывов с разных площадок.',
    sources: [{ title: `Страница товара (${host})`, url }],
    generatedByAi: false,
  };
}

function mockSuggestions(description: string): ProductSuggestion[] {
  const query = description.trim();
  return [
    { title: `Вариант по запросу: «${query}»`, reason: 'Наиболее близкое совпадение по ключевым словам описания.', exampleQuery: query },
    { title: `Бюджетная альтернатива: «${query}»`, reason: 'Похожие характеристики при меньшей цене (демо-подбор).', exampleQuery: `${query} cheap` },
    { title: `Премиум-вариант: «${query}»`, reason: 'Выше качество/бренд (демо-подбор).', exampleQuery: `${query} premium` },
  ];
}

export async function aiReviews(userId: string, url: string): Promise<ReviewResponse> {
  await ensureAiQuota(userId);
  const summary = mockReview(url);
  const quota = await consumeAiQuota(userId);
  return { summary, quota };
}

export async function aiProductSearch(
  userId: string,
  description: string,
): Promise<ProductSearchResponse> {
  await ensureAiQuota(userId);
  const suggestions = mockSuggestions(description);
  const quota = await consumeAiQuota(userId);
  return { suggestions, generatedByAi: false, quota };
}
