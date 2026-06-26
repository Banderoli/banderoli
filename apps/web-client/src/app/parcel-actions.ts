'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  createParcel,
  createRecipient,
  listRecipients,
  updateParcelStatus,
  type CreateParcelBody,
} from '@/lib/api';

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

export async function createParcelAction(
  _prev: ParcelFormState,
  formData: FormData,
): Promise<ParcelFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Сессия истекла, войдите снова' };
  }

  const trackingNumber = optionalString(formData.get('trackingNumber'));
  if (!trackingNumber) {
    return { error: 'Укажите трек-номер' };
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
      trackingNumber,
      carrier: optionalString(formData.get('carrier')),
      store: optionalString(formData.get('store')),
      description: optionalString(formData.get('description')),
      declaredValueUsd: optionalNumber(formData.get('declaredValueUsd')),
      weightKg: optionalNumber(formData.get('weightKg')),
      quantity: optionalNumber(formData.get('quantity')),
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
