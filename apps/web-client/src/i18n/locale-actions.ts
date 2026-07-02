'use server';

import { cookies } from 'next/headers';
import { isLocale, type Locale } from './config';

// Сохраняет выбранный язык в cookie на год. После вызова клиент делает router.refresh().
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }
  const store = await cookies();
  store.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
