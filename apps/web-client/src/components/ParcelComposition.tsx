import type { ParcelResponse } from '@banderoli/contracts';
import { formatGel, formatMoney } from '@/lib/format';

// Состав посылки: позиции товаров + доставка + итог.
// Суммы — в валюте посылки; declaredValueGel — итог в лари по курсу НБГ.
export function ParcelComposition({ parcel }: { parcel: ParcelResponse }) {
  const hasShipping = parcel.shippingCostUsd !== null && parcel.shippingCostUsd > 0;
  if (parcel.items.length === 0 && !hasShipping) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-hairline bg-canvas p-3">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Состав</div>
      <ul className="space-y-1 text-sm">
        {parcel.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">{item.name}</span>
            <span className="shrink-0 text-muted">{formatMoney(item.priceUsd, parcel.currency)}</span>
          </li>
        ))}
        {hasShipping ? (
          <li className="flex justify-between gap-2 text-muted">
            <span>Доставка</span>
            <span>{formatMoney(parcel.shippingCostUsd, parcel.currency)}</span>
          </li>
        ) : null}
      </ul>
      <div className="mt-1.5 flex justify-between border-t border-hairline pt-1.5 text-sm font-medium">
        <span>Итого</span>
        <span>{formatMoney(parcel.declaredValueUsd, parcel.currency)}</span>
      </div>
      {parcel.currency !== 'GEL' && parcel.declaredValueGel !== null ? (
        <div className="mt-0.5 flex justify-between text-xs text-muted">
          <span>В лари (курс НБГ)</span>
          <span>{formatGel(parcel.declaredValueGel)}</span>
        </div>
      ) : null}
    </div>
  );
}
