'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ItemRow {
  name: string;
  price: string;
}

const rowInput =
  'rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

// Динамический список позиций товара. Кладёт в форму скрытое поле itemsJson
// с массивом [{ name, price }]; сервер пересчитает итог (Σ позиций + доставка).
export function ParcelItemsEditor({
  defaultItems,
}: {
  defaultItems?: { name: string; priceUsd: number }[];
}) {
  const [rows, setRows] = useState<ItemRow[]>(
    defaultItems && defaultItems.length > 0
      ? defaultItems.map((it) => ({ name: it.name, price: String(it.priceUsd) }))
      : [{ name: '', price: '' }],
  );

  const update = (index: number, patch: Partial<ItemRow>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const add = () => setRows((prev) => [...prev, { name: '', price: '' }]);
  const remove = (index: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const itemsJson = JSON.stringify(
    rows
      .map((r) => ({ name: r.name.trim(), price: Number(r.price) || 0 }))
      .filter((r) => r.name.length > 0),
  );
  const itemsTotal = rows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  return (
    <div className="space-y-2 rounded-md border border-hairline bg-surface p-3">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">Товары в посылке</span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-md bg-brand-soft px-2 py-1 text-xs font-medium text-brand-dark transition hover:bg-brand hover:text-white"
        >
          <Plus size={13} aria-hidden />
          продукция
        </button>
      </div>

      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={row.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Товар (напр. Кроссовки Nike)"
            aria-label="Название товара"
            className={`min-w-0 flex-1 ${rowInput}`}
          />
          <input
            value={row.price}
            onChange={(e) => update(i, { price: e.target.value })}
            type="number"
            min="0"
            step="0.01"
            placeholder="$ цена"
            aria-label="Цена товара"
            className={`w-24 ${rowInput}`}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="Удалить позицию"
            disabled={rows.length === 1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-high-soft hover:text-high disabled:opacity-40"
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      ))}

      <div className="flex justify-end text-xs text-muted">
        Сумма товаров: <span className="ml-1 font-medium text-ink">${itemsTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
