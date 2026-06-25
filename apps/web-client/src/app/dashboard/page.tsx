import { Info, Receipt, Weight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MetricCard } from '@/components/MetricCard';
import { ParcelRow } from '@/components/ParcelRow';
import { ExposureGauge } from '@/components/ExposureGauge';
import { LimitBar } from '@/components/LimitBar';
import { AddParcelForm } from '@/components/AddParcelForm';
import { RecipientSwitcher } from '@/components/RecipientSwitcher';
import { loadDashboard } from '@/lib/dashboard';
import { listCarriers, listStores } from '@/lib/api';
import { formatGel, formatUsd } from '@/lib/format';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ recipient?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { recipient } = await searchParams;
  const [{ data, demo }, stores, carriers] = await Promise.all([
    loadDashboard(session.user.id, recipient),
    listStores(session.user.id),
    listCarriers(session.user.id),
  ]);
  const { exposure } = data;
  const exposureAccent =
    exposure.level === 'HIGH' ? 'high' : exposure.level === 'MEDIUM' ? 'medium' : undefined;

  return (
    <main className="px-6 py-6">
        {demo ? (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-medium-soft px-3 py-2 text-xs text-medium">
            <Info size={14} aria-hidden />
            Показаны демо-данные: API-шлюз недоступен или у вас ещё нет получателей.
          </div>
        ) : null}

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-medium">Мои посылки</h1>
            {data.recipients.length > 1 ? (
              <RecipientSwitcher
                recipients={data.recipients}
                selectedId={data.selectedRecipientId}
              />
            ) : null}
          </div>
          <AddParcelForm
            recipients={data.recipients}
            selectedRecipientId={data.selectedRecipientId}
            stores={stores}
            carriers={carriers}
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <MetricCard label="В пути" value={String(data.metrics.inTransit)} sub="активных отправлений" />
          <MetricCard
            label="На таможне"
            value={String(data.metrics.inCustoms)}
            sub="ожидает оформления"
            accent="medium"
          />
          <MetricCard
            label="Потрачено в этом месяце"
            value={formatUsd(data.metrics.spentUsd)}
            sub={`≈ ${formatGel(data.metrics.spentGel)}`}
          />
          <MetricCard label="Экспозиция" value={exposure.level} sub="по получателю" accent={exposureAccent} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <section className="rounded-xl border border-hairline bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Активные отправления</h2>
              <span className="text-xs text-muted">сортировка: ETA</span>
            </div>
            {data.parcels.length > 0 ? (
              data.parcels.map((parcel) => <ParcelRow key={parcel.id} parcel={parcel} />)
            ) : (
              <p className="py-6 text-center text-sm text-muted">Пока нет отправлений</p>
            )}
          </section>

          <section className="rounded-xl border border-hairline bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium">Экспозиция · {data.recipientName}</h2>

            <ExposureGauge score={exposure.score} level={exposure.level} />

            <div className="mt-4 space-y-3">
              <LimitBar
                icon={<Receipt size={13} aria-hidden />}
                label={`Лимит ${exposure.limitGel} GEL`}
                used={exposure.totalValueGel}
                total={exposure.limitGel}
                valueText={`${Math.round(exposure.totalValueGel)} / ${exposure.limitGel}`}
              />
              <LimitBar
                icon={<Weight size={13} aria-hidden />}
                label="Вес"
                used={data.weightUsedKg}
                total={data.weightLimitKg}
                valueText={`${data.weightUsedKg} / ${data.weightLimitKg} кг`}
              />
            </div>

            {exposure.alerts.map((alert) => (
              <div
                key={alert.code}
                className="mt-4 flex gap-2 rounded-md bg-medium-soft p-3 text-xs leading-relaxed text-medium"
              >
                <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
                <span>{alert.message}</span>
              </div>
            ))}
          </section>
        </div>
    </main>
  );
}
