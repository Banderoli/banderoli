'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  createParcel,
  createRecipient,
  deleteParcel,
  listRecipients,
  updateParcel,
  updateParcelStatus,
  type CreateParcelBody,
  type ParcelItemBody,
} from '@/lib/api';
import { checkParcelTracking } from '@/lib/ship24';

export interface ParcelFormState {
  ok?: boolean;
  error?: string;
}

function optionalString(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length === 0) {
    return undefined;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

// Стоимость доставки/цена позиции может быть 0, поэтому отдельный неотрицательный парсер.
function nonNegNumber(value: FormDataEntryValue | null): number | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length === 0) {
    return undefined;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : undefined;
}

// Позиции приходят из формы как JSON-массив [{ name, price }].
function parseItems(value: FormDataEntryValue | null): ParcelItemBody[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((raw) => {
        const row = raw as { name?: unknown; price?: unknown; priceUsd?: unknown };
        const name = typeof row.name === 'string' ? row.name.trim() : '';
        const price = Number(row.price ?? row.priceUsd ?? 0);
        return { name, priceUsd: Number.isFinite(price) && price >= 0 ? price : 0 };
      })
      .filter((it) => it.name.length > 0)
      .slice(0, 50)
      .map((it) => ({ name: it.name.slice(0, 120), priceUsd: Math.round(it.priceUsd * 100) / 100 }));
  } catch {
    return [];
  }
}

export async function createParcelAction(
  _prev: ParcelFormState,
  formData: FormData,
): Promise<ParcelFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Сессия истекла, войдите снова' };
  }

  const name = optionalString(formData.get('name'));
  if (!name) {
    return { error: 'Укажите название посылки' };
  }

  const items = parseItems(formData.get('itemsJson'));
  if (items.length === 0) {
    return { error: 'Добавьте хотя бы один товар' };
  }

  const userId = session.user.id;
  const submittedRecipientId = optionalString(formData.get('recipientProfileId'));

  try {
    const recipients = await listRecipients(userId);
    // Берём выбранного получателя (если он принадлежит пользователю);
    // иначе — первого, иначе создаём получателя по умолчанию.
    const recipientId =
      (submittedRecipientId && recipients.some((r) => r.id === submittedRecipientId)
        ? submittedRecipientId
        : recipients[0]?.id) ??
      (await createRecipient(userId, { name: 'Я', isDefault: true })).id;

    const body: CreateParcelBody = {
      recipientProfileId: recipientId,
      name,
      trackingNumber: optionalString(formData.get('trackingNumber')),
      carrier: optionalString(formData.get('carrier')),
      store: optionalString(formData.get('store')),
      description: optionalString(formData.get('description')),
      items,
      shippingCostUsd: nonNegNumber(formData.get('shippingCostUsd')),
      weightKg: optionalNumber(formData.get('weightKg')),
      purchasedAt: optionalString(formData.get('purchasedAt')),
      estimatedArrival: optionalString(formData.get('estimatedArrival')),
    };

    await createParcel(userId, body);
  } catch {
    return { error: 'Не удалось добавить посылку. Попробуйте ещё раз.' };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

export async function restoreParcelAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    return;
  }
  const id = String(formData.get('id') ?? '');
  if (!id) {
    return;
  }
  await updateParcelStatus(session.user.id, id, 'IN_TRANSIT');
  revalidatePath('/dashboard/parcels');
  revalidatePath('/dashboard');
}

export async function setParcelStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    return;
  }
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || (status !== 'DELIVERED' && status !== 'EXCEPTION')) {
    return;
  }
  await updateParcelStatus(session.user.id, id, status);
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/parcels');
}

export async function deleteParcelAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    return;
  }
  const id = String(formData.get('id') ?? '');
  if (!id) {
    return;
  }
  await deleteParcel(session.user.id, id);
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/parcels');
}

export async function updateParcelAction(
  _prev: ParcelFormState,
  formData: FormData,
): Promise<ParcelFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Сессия истекла, войдите снова' };
  }

  const id = String(formData.get('id') ?? '');
  const name = optionalString(formData.get('name'));
  if (!id || !name) {
    return { error: 'Укажите название посылки' };
  }

  try {
    await updateParcel(session.user.id, id, {
      name,
      trackingNumber: optionalString(formData.get('trackingNumber')) ?? null,
      carrier: optionalString(formData.get('carrier')) ?? null,
      store: optionalString(formData.get('store')) ?? null,
      description: optionalString(formData.get('description')) ?? null,
      items: parseItems(formData.get('itemsJson')),
      shippingCostUsd: nonNegNumber(formData.get('shippingCostUsd')) ?? null,
      weightKg: optionalNumber(formData.get('weightKg')) ?? null,
      purchasedAt: optionalString(formData.get('purchasedAt')) ?? null,
      estimatedArrival: optionalString(formData.get('estimatedArrival')) ?? null,
    });
  } catch {
    return { error: 'Не удалось сохранить изменения' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/parcels');
  return { ok: true };
}

export interface TrackingCheckState {
  text?: string;
}

export async function checkTrackingAction(
  _prev: TrackingCheckState,
  formData: FormData,
): Promise<TrackingCheckState> {
  const session = await auth();
  if (!session?.user) {
    return { text: 'Сессия истекла' };
  }
  const tracking = String(formData.get('tracking') ?? '');
  const result = await checkParcelTracking(tracking);
  return { text: result.text };
}
