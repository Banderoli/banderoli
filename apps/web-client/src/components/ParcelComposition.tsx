import type { ParcelResponse } from '@banderoli/contracts';
import { formatUsd } from '@/lib/format';

// Состав посылки: позиции товаров + доставка + итог.
// Итог (declaredValueUsd) = Σ цен позиций + стоимость доставки.
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
            <span className="shrink-0 text-muted">{formatUsd(item.priceUsd)}</span>
          </li>
        ))}
        {hasShipping ? (
          <li className="flex justify-between gap-2 text-muted">
            <span>Доставка</span>
            <span>{formatUsd(parcel.shippingCostUsd)}</span>
          </li>
        ) : null}
      </ul>
      <div className="mt-1.5 flex justify-between border-t border-hairline pt-1.5 text-sm font-medium">
        <span>Итого</span>
        <span>{formatUsd(parcel.declaredValueUsd)}</span>
      </div>
    </div>
  );
}
