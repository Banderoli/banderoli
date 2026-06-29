import { Info, Receipt, Users, Weight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MetricCard } from '@/components/MetricCard';
import { DashboardParcels } from '@/components/DashboardParcels';
import { ExposureGauge } from '@/components/ExposureGauge';
import { LimitBar } from '@/components/LimitBar';
import { AddParcelForm } from '@/components/AddParcelForm';
import { AdvisorBanner } from '@/components/AdvisorBanner';
import { RecipientSwitcher } from '@/components/RecipientSwitcher';
import { loadDashboard } from '@/lib/dashboard';
import { listCarriers, listParcels, listStores, loadRecipientsExposure } from '@/lib/api';
import { getGelRates } from '@/lib/nbg-rate';
import { formatGel } from '@/lib/format';

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
  const [{ data, demo }, allParcels, stores, carriers, recipientsExposure, rates] =
    await Promise.all([
      loadDashboard(session.user.id, recipient),
      listParcels(session.user.id),
      listStores(session.user.id),
      listCarriers(session.user.id),
      loadRecipientsExposure(session.user.id),
      getGelRates(),
    ]);
  const { exposure } = data;
  // Список на дашборде показывает посылки всех получателей; в демо-режиме — мок-данные.
  const parcelsForList = demo ? data.parcels : allParcels;
  const atRiskRecipients = recipientsExposure.filter((r) => r.ratio >= 0.85 || r.jointArrival);
  const exposureAccent =
    exposure.level === 'HIGH' ? 'high' : exposure.level === 'MEDIUM' ? 'medium' : undefined;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-6">
        <AdvisorBanner recipients={recipientsExposure} usdRate={rates.USD} />

        {demo ? (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-medium-soft px-3 py-2 text-xs text-medium">
            <Info size={14} aria-hidden />
            Показаны демо-данные: API-шлюз недоступен или у вас ещё нет получателей.
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-medium">Мои посылки</h1>
          <AddParcelForm
            recipients={recipientsExposure}
            selectedRecipientId={data.selectedRecipientId}
            stores={stores}
            carriers={carriers}
            rates={rates}
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
            value={formatGel(data.metrics.spentGel)}
            sub="в лари, по всем валютам"
          />
          <MetricCard label="Экспозиция" value={exposure.level} sub="по получателю" accent={exposureAccent} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <section className="rounded-xl border border-hairline bg-surface shadow-card p-4">
            <h2 className="mb-3 text-sm font-medium">Активные отправления</h2>
            <DashboardParcels
              parcels={parcelsForList}
              recipients={data.recipients}
              stores={stores}
              carriers={carriers}
            />
          </section>

          <section className="rounded-xl border border-hairline bg-surface shadow-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Экспозиция · {data.recipientName}</h2>
              {data.recipients.length > 1 ? (
                <RecipientSwitcher recipients={data.recipients} selectedId={data.selectedRecipientId} />
              ) : null}
            </div>

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

            {atRiskRecipients.length > 0 ? (
              <div className="mt-4 rounded-md bg-medium-soft p-3 text-xs leading-relaxed text-medium">
                <div className="mb-1 flex items-center gap-1.5 font-medium">
                  <Users size={13} aria-hidden />
                  Получатели у лимита
                </div>
                <ul className="space-y-0.5">
                  {atRiskRecipients.map((r) => (
                    <li key={r.id}>
                      {r.name}: {Math.round(r.usedGel)}/{r.limitGel} GEL
                      {r.exceeded
                        ? ' — лимит превышен'
                        : r.ratio >= 0.85
                          ? ' — близко к лимиту'
                          : ''}
                      {r.jointArrival ? ' · возможно совпадение прибытия' : ''}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-muted">
                  Новую посылку лучше оформить на получателя с запасом по лимиту.
                </p>
              </div>
            ) : null}
          </section>
        </div>
    </main>
  );
}
