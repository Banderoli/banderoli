// Список поддерживаемых языков. Чтобы добавить новый язык — допишите код сюда
// и создайте messages/<code>.json. Больше ничего менять не нужно.
export const locales = ['ru', 'en', 'ka'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ka';

// Названия языков на самих языках (для переключателя).
export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  ka: 'ქართული',
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}
