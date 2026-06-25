'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { createRecipient, deleteRecipient, updateRecipient } from '@/lib/api';

export interface RecipientFormState {
  error?: string;
  ok?: boolean;
}

function revalidate(): void {
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
}

function strOrNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : null;
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

  const name = strOrNull(formData.get('name'));
  if (!name || name.length > 100) {
    return { error: 'Введите имя получателя (до 100 символов)' };
  }

  try {
    await createRecipient(userId, {
      name,
      email: strOrNull(formData.get('email')),
      telegram: strOrNull(formData.get('telegram')),
    });
  } catch {
    return { error: 'Не удалось добавить получателя' };
  }

  revalidate();
  return { ok: true };
}

export async function editRecipientAction(
  _prev: RecipientFormState,
  formData: FormData,
): Promise<RecipientFormState> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  const name = strOrNull(formData.get('name'));
  if (!userId || !id || !name) {
    return { error: 'Имя обязательно' };
  }

  try {
    await updateRecipient(userId, id, {
      name,
      email: strOrNull(formData.get('email')),
      telegram: strOrNull(formData.get('telegram')),
    });
  } catch {
    return { error: 'Не удалось сохранить' };
  }

  revalidate();
  return { ok: true };
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
