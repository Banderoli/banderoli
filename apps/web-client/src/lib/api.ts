// Vercel-native слой данных: прямые запросы к Postgres (Prisma) + движок экспозиции
// как библиотека. Заменяет HTTP-вызовы к NestJS-шлюзу. Всё здесь — серверное.
import {
  AI_DAILY_LIMIT,
  type AiQuota,
  type ExposureResult,
  type ParcelDetailResponse,
  type ParcelResponse,
  type ProductSearchResponse,
  type ProductSuggestion,
  type RecipientResponse,
  type ReviewResponse,
  type ReviewSummary,
  type StoreResponse,
  type CarrierResponse,
} from '@banderoli/contracts';
import { Prisma, prisma } from '@banderoli/database';
import type {
  Carrier,
  LogisticsEvent,
  Parcel,
  ParcelItem,
  RecipientProfile,
  Store,
} from '@banderoli/database';
import {
  calculateExposure,
  type ParcelExposureInput,
} from '@banderoli/customs-exposure-engine';
import { estimateEta } from '@banderoli/flight-intelligence';
import { extractCartFromImage, type CartExtraction } from './cart-vision';
import { getUsdToGelRate } from './nbg-rate';

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
    email: r.email,
    telegram: r.telegram,
    isDefault: r.isDefault,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function serializeParcel(p: Parcel & { items?: ParcelItem[] }): ParcelResponse {
  return {
    id: p.id,
    recipientProfileId: p.recipientProfileId,
    name: p.name,
    trackingNumber: p.trackingNumber,
    carrier: p.carrier,
    store: p.store,
    description: p.description,
    items: (p.items ?? []).map((it) => ({
      id: it.id,
      name: it.name,
      priceUsd: it.priceUsd.toNumber(),
    })),
    declaredValueUsd: toNumber(p.declaredValueUsd),
    declaredValueGel: toNumber(p.declaredValueGel),
    shippingCostUsd: toNumber(p.shippingCostUsd),
    weightKg: toNumber(p.weightKg),
    quantity: p.quantity,
    status: p.status,
    currentExposureScore: p.currentExposureScore,
    purchasedAt: p.purchasedAt ? p.purchasedAt.toISOString() : null,
    estimatedArrival: p.estimatedArrival ? p.estimatedArrival.toISOString() : null,
    deliveredAt: p.deliveredAt ? p.deliveredAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeParcelDetail(
  p: Parcel & { logisticsEvents: LogisticsEvent[]; items?: ParcelItem[] },
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

export interface RecipientInput {
  name?: string;
  email?: string | null;
  telegram?: string | null;
  isDefault?: boolean;
}

export async function createRecipient(
  userId: string,
  body: RecipientInput & { name: string },
): Promise<RecipientResponse> {
  if (body.isDefault) {
    await clearDefault(userId);
  }
  const created = await prisma.recipientProfile.create({
    data: {
      userId,
      name: body.name,
      email: body.email ?? null,
      telegram: body.telegram ?? null,
      isDefault: body.isDefault ?? false,
    },
  });
  return serializeRecipient(created);
}

export async function updateRecipient(
  userId: string,
  recipientId: string,
  body: RecipientInput,
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

// ─── Магазины ─────────────────────────────────────────────────────────────────

function serializeStore(s: Store): StoreResponse {
  return { id: s.id, userId: s.userId, name: s.name, url: s.url, createdAt: s.createdAt.toISOString() };
}

export async function listStores(userId: string): Promise<StoreResponse[]> {
  const rows = await prisma.store.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  return rows.map(serializeStore);
}

export async function createStore(
  userId: string,
  body: { name: string; url?: string | null },
): Promise<StoreResponse> {
  const created = await prisma.store.create({
    data: { userId, name: body.name, url: body.url ?? null },
  });
  return serializeStore(created);
}

export async function deleteStore(userId: string, storeId: string): Promise<void> {
  await prisma.store.deleteMany({ where: { id: storeId, userId } });
}

// ─── Перевозчики ──────────────────────────────────────────────────────────────

function serializeCarrier(c: Carrier): CarrierResponse {
  return { id: c.id, userId: c.userId, name: c.name, createdAt: c.createdAt.toISOString() };
}

export async function listCarriers(userId: string): Promise<CarrierResponse[]> {
  const rows = await prisma.carrier.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  return rows.map(serializeCarrier);
}

export async function createCarrier(
  userId: string,
  body: { name: string },
): Promise<CarrierResponse> {
  const created = await prisma.carrier.create({ data: { userId, name: body.name } });
  return serializeCarrier(created);
}

export async function deleteCarrier(userId: string, carrierId: string): Promise<void> {
  await prisma.carrier.deleteMany({ where: { id: carrierId, userId } });
}

// ─── Посылки ──────────────────────────────────────────────────────────────────

export interface ParcelItemBody {
  name: string;
  priceUsd: number;
}

export interface CreateParcelBody {
  recipientProfileId: string;
  name?: string;
  trackingNumber?: string;
  carrier?: string;
  store?: string;
  description?: string;
  items?: ParcelItemBody[];
  shippingCostUsd?: number;
  declaredValueUsd?: number;
  weightKg?: number;
  quantity?: number;
  purchasedAt?: string;
  estimatedArrival?: string;
}

// Итог посылки = Σ цен позиций (или legacy-цена) + стоимость доставки.
// Доставка тоже входит в таможенный лимит, поэтому добавляется к declaredValue.
function computeDeclaredUsd(
  items: ParcelItemBody[],
  shippingCostUsd: number | null,
  legacyDeclaredUsd: number | null,
): number | null {
  const itemsTotal = items.reduce((sum, it) => sum + it.priceUsd, 0);
  const hasAny = items.length > 0 || legacyDeclaredUsd !== null || shippingCostUsd !== null;
  if (!hasAny) {
    return null;
  }
  const base = items.length > 0 ? itemsTotal : (legacyDeclaredUsd ?? 0);
  return round2(base + (shippingCostUsd ?? 0));
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
    include: { items: { orderBy: { createdAt: 'asc' } } },
  });
  return rows.map(serializeParcel);
}

export async function getParcel(
  userId: string,
  parcelId: string,
): Promise<ParcelDetailResponse> {
  const parcel = await prisma.parcel.findFirst({
    where: { id: parcelId, recipientProfile: { userId } },
    include: {
      logisticsEvents: { orderBy: { occurredAt: 'asc' } },
      items: { orderBy: { createdAt: 'asc' } },
    },
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

  const items = body.items ?? [];
  const shippingCostUsd = body.shippingCostUsd ?? null;
  const declaredValueUsd = computeDeclaredUsd(items, shippingCostUsd, body.declaredValueUsd ?? null);
  const rate = await getUsdToGelRate();
  const declaredValueGel =
    declaredValueUsd === null ? null : round2(declaredValueUsd * rate);
  // Кол-во позиций — маркер однородности для движка экспозиции.
  const quantity = items.length > 0 ? items.length : (body.quantity ?? 1);
  // Ожидаемую доставку движок экспозиции группирует по дням — берём ручную дату,
  // если указана; иначе оцениваем по перевозчику.
  const estimatedArrival = body.estimatedArrival
    ? new Date(body.estimatedArrival)
    : estimateEta({ carrier: body.carrier ?? null, shippedAt: null }).estimatedArrival;

  const parcel = await prisma.parcel.create({
    data: {
      recipientProfileId: body.recipientProfileId,
      name: body.name ?? null,
      trackingNumber: body.trackingNumber ?? null,
      carrier: body.carrier ?? null,
      store: body.store ?? null,
      description: body.description ?? null,
      declaredValueUsd,
      declaredValueGel,
      shippingCostUsd,
      weightKg: body.weightKg ?? null,
      quantity,
      purchasedAt: body.purchasedAt ? new Date(body.purchasedAt) : null,
      estimatedArrival,
      items:
        items.length > 0
          ? { create: items.map((it) => ({ name: it.name, priceUsd: it.priceUsd })) }
          : undefined,
    },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  });

  await recomputeExposure(body.recipientProfileId);
  return serializeParcel(parcel);
}

export async function updateParcelStatus(
  userId: string,
  parcelId: string,
  status: ParcelResponse['status'],
): Promise<void> {
  const parcel = await prisma.parcel.findFirst({
    where: { id: parcelId, recipientProfile: { userId } },
    select: { id: true, recipientProfileId: true },
  });
  if (!parcel) {
    throw new Error('Посылка не найдена');
  }

  await prisma.parcel.update({
    where: { id: parcelId },
    data: { status, deliveredAt: status === 'DELIVERED' ? undefined : null },
  });
  await recomputeExposure(parcel.recipientProfileId);
}

export async function deleteParcel(userId: string, parcelId: string): Promise<void> {
  const parcel = await prisma.parcel.findFirst({
    where: { id: parcelId, recipientProfile: { userId } },
    select: { id: true, recipientProfileId: true },
  });
  if (!parcel) {
    throw new Error('Посылка не найдена');
  }
  await prisma.parcel.delete({ where: { id: parcelId } });
  await recomputeExposure(parcel.recipientProfileId);
}

export interface UpdateParcelBody {
  name?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  store?: string | null;
  description?: string | null;
  items?: ParcelItemBody[];
  shippingCostUsd?: number | null;
  declaredValueUsd?: number | null;
  weightKg?: number | null;
  quantity?: number;
  purchasedAt?: string | null;
  estimatedArrival?: string | null;
}

export async function updateParcel(
  userId: string,
  parcelId: string,
  body: UpdateParcelBody,
): Promise<ParcelResponse> {
  const existing = await prisma.parcel.findFirst({
    where: { id: parcelId, recipientProfile: { userId } },
    include: { items: true },
  });
  if (!existing) {
    throw new Error('Посылка не найдена');
  }

  const data: Prisma.ParcelUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber;
  if (body.carrier !== undefined) data.carrier = body.carrier;
  if (body.store !== undefined) data.store = body.store;
  if (body.description !== undefined) data.description = body.description;
  if (body.weightKg !== undefined) data.weightKg = body.weightKg;
  if (body.quantity !== undefined) data.quantity = body.quantity;
  if (body.shippingCostUsd !== undefined) data.shippingCostUsd = body.shippingCostUsd;
  if (body.purchasedAt !== undefined) {
    data.purchasedAt = body.purchasedAt ? new Date(body.purchasedAt) : null;
  }
  if (body.estimatedArrival !== undefined) {
    data.estimatedArrival = body.estimatedArrival ? new Date(body.estimatedArrival) : null;
  }

  // Пересчёт итога, если изменились позиции, доставка или legacy-цена.
  if (
    body.items !== undefined ||
    body.shippingCostUsd !== undefined ||
    body.declaredValueUsd !== undefined
  ) {
    const finalItems =
      body.items ?? existing.items.map((it) => ({ name: it.name, priceUsd: it.priceUsd.toNumber() }));
    const finalShipping =
      body.shippingCostUsd !== undefined ? body.shippingCostUsd : toNumber(existing.shippingCostUsd);
    const declaredValueUsd = computeDeclaredUsd(
      finalItems,
      finalShipping,
      body.declaredValueUsd ?? toNumber(existing.declaredValueUsd),
    );
    data.declaredValueUsd = declaredValueUsd;
    const rate = await getUsdToGelRate();
    data.declaredValueGel =
      declaredValueUsd === null ? null : round2(declaredValueUsd * rate);
    if (body.items !== undefined && finalItems.length > 0) {
      data.quantity = finalItems.length;
    }
  }

  await prisma.$transaction(async (tx) => {
    if (body.items !== undefined) {
      await tx.parcelItem.deleteMany({ where: { parcelId } });
      if (body.items.length > 0) {
        await tx.parcelItem.createMany({
          data: body.items.map((it) => ({ parcelId, name: it.name, priceUsd: it.priceUsd })),
        });
      }
    }
    await tx.parcel.update({ where: { id: parcelId }, data });
  });

  await recomputeExposure(existing.recipientProfileId);
  const updated = await prisma.parcel.findUniqueOrThrow({
    where: { id: parcelId },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  });
  return serializeParcel(updated);
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

export interface RecipientExposure {
  id: string;
  name: string;
  usedGel: number;
  limitGel: number;
  ratio: number;
  level: ExposureResult['level'];
  score: number;
  jointArrival: boolean;
  exceeded: boolean;
}

// Экспозиция по каждому получателю — для подсказок «на кого выписывать».
export async function loadRecipientsExposure(userId: string): Promise<RecipientExposure[]> {
  const recipients = await prisma.recipientProfile.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  const result: RecipientExposure[] = [];
  for (const recipient of recipients) {
    const parcels = await prisma.parcel.findMany({
      where: { recipientProfileId: recipient.id, status: { in: ACTIVE_STATUSES } },
    });
    const inputs: ParcelExposureInput[] = parcels.map((p) => ({
      valueGel: toNumberOr(p.declaredValueGel, 0),
      weightKg: toNumberOr(p.weightKg, 0),
      quantity: p.quantity,
      estimatedArrival: p.estimatedArrival,
    }));
    const exposure = calculateExposure(recipient.id, inputs);
    result.push({
      id: recipient.id,
      name: recipient.name,
      usedGel: exposure.totalValueGel,
      limitGel: exposure.limitGel,
      ratio: exposure.limitGel > 0 ? exposure.totalValueGel / exposure.limitGel : 0,
      level: exposure.level,
      score: exposure.score,
      jointArrival: exposure.alerts.some((a) => a.code === 'JOINT_ARRIVAL'),
      exceeded: exposure.totalValueGel > exposure.limitGel,
    });
  }

  return result;
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

export interface CartExtractionResponse {
  data: CartExtraction;
  quota: AiQuota;
}

// Распознавание скриншота корзины через Claude vision — расходует общий дневной
// ИИ-лимит (как поиск отзывов/товара). Квота списывается только при успехе.
export async function aiExtractCart(
  userId: string,
  base64: string,
  mediaType: string,
): Promise<CartExtractionResponse> {
  await ensureAiQuota(userId);
  const result = await extractCartFromImage(base64, mediaType);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? 'Не удалось распознать корзину');
  }
  const quota = await consumeAiQuota(userId);
  return { data: result.data, quota };
}
