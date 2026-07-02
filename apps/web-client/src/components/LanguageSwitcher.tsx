'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { localeNames, locales, type Locale } from '@/i18n/config';
import { setLocale } from '@/i18n/locale-actions';

// Переключатель языка: пишет выбор в cookie (server action) и обновляет серверные
// компоненты через router.refresh(). Список языков берётся из i18n/config.
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('sidebar');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted">
      <Languages size={16} aria-hidden />
      <select
        value={locale}
        disabled={pending}
        aria-label={t('language')}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(async () => {
            await setLocale(next);
            router.refresh();
          });
        }}
        className="flex-1 cursor-pointer rounded-md border border-hairline bg-canvas px-2 py-1.5 text-sm text-ink outline-none transition focus:border-brand disabled:opacity-60"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
