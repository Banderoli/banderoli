'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { createRecipient, deleteRecipient, updateRecipient } from '@/lib/api';

export interface RecipientFormState {
  error?: string;
}

function revalidate(): void {
  revalidatePath('/dashboard/recipients');
  revalidatePath('/dashboard');
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createRecipientAction(
  _prev: RecipientFormState,
  formData: FormData,
): Promise<RecipientFormState> {
  const userId = await requireUserId();
  if (!userId) {
    return { error: 'Сессия истекла, войдите снова' };
  }

  const name = String(formData.get('name') ?? '').trim();
  if (name.length === 0 || name.length > 100) {
    return { error: 'Введите имя получателя (до 100 символов)' };
  }

  try {
    await createRecipient(userId, { name });
  } catch {
    return { error: 'Не удалось добавить получателя' };
  }

  revalidate();
  return {};
}

export async function renameRecipientAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!userId || !id || name.length === 0 || name.length > 100) {
    return;
  }

  await updateRecipient(userId, id, { name });
  revalidate();
}

export async function setDefaultRecipientAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  if (!userId || !id) {
    return;
  }

  await updateRecipient(userId, id, { isDefault: true });
  revalidate();
}

export async function deleteRecipientAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  if (!userId || !id) {
    return;
  }

  await deleteRecipient(userId, id);
  revalidate();
}
