// Форматирование даты «день месяц» напрямую из ISO-строки, без Intl. Так результат
// одинаков на сервере и клиенте (ICU-данные для месяцев могут различаться между
// средами и ломать гидратацию). Короткие названия месяцев берутся из common.months.
export function formatDay(iso: string | null | undefined, months: readonly string[]): string {
  if (!iso) {
    return '—';
  }
  const [, month, day] = iso.slice(0, 10).split('-');
  const name = months[Number(month) - 1] ?? month ?? '';
  return `${Number(day)} ${name}`;
}
