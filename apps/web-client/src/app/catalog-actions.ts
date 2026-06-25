'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  createCarrier,
  createStore,
  deleteCarrier,
  deleteStore,
} from '@/lib/api';

export interface CatalogFormState {
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

export async function createStoreAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const userId = await requireUserId();
  if (!userId) {
    return { error: 'Сессия истекла' };
  }
  const name = strOrNull(formData.get('name'));
  if (!name) {
    return { error: 'Введите название магазина' };
  }
  try {
    await createStore(userId, { name, url: strOrNull(formData.get('url')) });
  } catch {
    return { error: 'Не удалось добавить магазин' };
  }
  revalidate();
  return { ok: true };
}

export async function deleteStoreAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  if (!userId || !id) {
    return;
  }
  await deleteStore(userId, id);
  revalidate();
}

export async function createCarrierAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const userId = await requireUserId();
  if (!userId) {
    return { error: 'Сессия истекла' };
  }
  const name = strOrNull(formData.get('name'));
  if (!name) {
    return { error: 'Введите название перевозчика' };
  }
  try {
    await createCarrier(userId, { name });
  } catch {
    return { error: 'Не удалось добавить перевозчика' };
  }
  revalidate();
  return { ok: true };
}

export async function deleteCarrierAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  if (!userId || !id) {
    return;
  }
  await deleteCarrier(userId, id);
  revalidate();
}
