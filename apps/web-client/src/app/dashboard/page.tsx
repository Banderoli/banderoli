import { Info, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MetricCard } from '@/components/MetricCard';
import { DashboardParcels } from '@/components/DashboardParcels';
import { AddParcelForm } from '@/components/AddParcelForm';
import { AdvisorBanner } from '@/components/AdvisorBanner';
import { loadDashboard } from '@/lib/dashboard';
import { listCarriers, listParcels, listStores, loadRecipientsExposure } from '@/lib/api';
import { getGelRates } from '@/lib/nbg-rate';
import { formatGel, formatShortDate } from '@/lib/format';

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
  const recipientNameById = Object.fromEntries(data.recipients.map((r) => [r.id, r.name]));
  // Все магазины/перевозчики для выпадающих списков: сохранённые + встречающиеся в посылках.
  const storeNames = Array.from(
    new Set(
      [...stores.map((s) => s.name), ...parcelsForList.map((p) => p.store)].filter(
        (s): s is string => Boolean(s),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, 'ru'));
  const carrierNames = Array.from(
    new Set(
      [...carriers.map((c) => c.name), ...parcelsForList.map((p) => p.carrier)].filter(
        (s): s is string => Boolean(s),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, 'ru'));
  // Ближайшая ожидаемая доставка среди активных посылок выбранного получателя.
  const nearestArrival =
    [...data.parcels]
      .filter(
        (p) => p.status !== 'DELIVERED' && p.status !== 'EXCEPTION' && p.estimatedArrival,
      )
      .map((p) => p.estimatedArrival as string)
      .sort()[0] ?? null;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-4">
          <h1 className="text-lg font-medium">Дашборд</h1>
        </div>

        {demo ? (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-medium-soft px-3 py-2 text-xs text-medium">
            <Info size={14} aria-hidden />
            Показаны демо-данные: API-шлюз недоступен или у вас ещё нет получателей.
          </div>
        ) : null}

        <AdvisorBanner
          recipients={recipientsExposure}
          usdRate={rates.USD}
          exposure={exposure}
          recipientName={data.recipientName}
          weightUsedKg={data.weightUsedKg}
          weightLimitKg={data.weightLimitKg}
          switcherRecipients={data.recipients}
          selectedRecipientId={data.selectedRecipientId}
          parcels={parcelsForList}
          recipientNameById={recipientNameById}
        />

        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <MetricCard label="В пути" value={String(data.metrics.inTransit)} sub="активных отправлений" />
          <MetricCard
            label="На таможне"
            value={String(data.metrics.inCustoms)}
            sub="ожидает оформления"
            accent="medium"
          />
          <MetricCard
            label="Стоимость посылок"
            value={formatGel(data.metrics.spentGel)}
            sub="всего заявлено, в лари"
          />
          <MetricCard
            label="Ближайшее прибытие"
            value={formatShortDate(nearestArrival)}
            sub="ожидаемая доставка"
          />
        </div>

        <div className="mb-4">
          <AddParcelForm
            recipients={recipientsExposure}
            selectedRecipientId={data.selectedRecipientId}
            storeNames={storeNames}
            carrierNames={carrierNames}
            rates={rates}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <section className="rounded-xl border border-hairline bg-surface shadow-card p-4">
            <h2 className="mb-3 text-sm font-medium">Активные отправления</h2>
            <DashboardParcels
              parcels={parcelsForList}
              recipients={data.recipients}
              storeNames={storeNames}
              carrierNames={carrierNames}
            />
          </section>

          <section className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-hairline bg-surface p-6 text-center shadow-card">
            <div className="max-w-xs">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
                <Sparkles size={18} aria-hidden />
              </span>
              <p className="text-sm leading-relaxed text-muted">
                Скоро на этом месте будет виден интеллектуальный прогноз возможных задержек ваших
                посылок, авиарейсов, перегрузок складов и другая полезная информация. А также появятся
                полезные рекомендации. Искусственный интеллект Banderoli.AI уже работает над сбором
                требуемой для этого статистики.
              </p>
            </div>
          </section>
        </div>
    </main>
  );
}
