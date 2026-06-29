import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listParcels, listRecipients } from '@/lib/api';
import { buildAnalytics } from '@/lib/analytics';
import { MetricCard } from '@/components/MetricCard';
import { BarList } from '@/components/BarList';
import { DonutChart } from '@/components/DonutChart';
import { ColumnChart } from '@/components/ColumnChart';
import { WeatherWidget } from '@/components/WeatherWidget';
import { formatGel } from '@/lib/format';

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const [parcels, recipients] = await Promise.all([
    listParcels(session.user.id).catch(() => []),
    listRecipients(session.user.id).catch(() => []),
  ]);

  const analytics = buildAnalytics(parcels, recipients);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-lg font-medium">Аналитика</h1>
      <p className="mt-1 text-sm text-muted">Расходы по перевозчикам, получателям и магазинам.</p>

      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard
          label="Всего потрачено"
          value={formatGel(analytics.totalGel)}
          sub="в лари, по всем валютам"
        />
        <MetricCard label="Посылок" value={String(analytics.totalParcels)} />
        <MetricCard label="Доставлено" value={String(analytics.deliveredCount)} />
        <MetricCard label="Получателей" value={String(analytics.byRecipient.length)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DonutChart title="По получателям" buckets={analytics.byRecipient} />
        <ColumnChart title="По перевозчикам" buckets={analytics.byCarrier} />
        <BarList title="По магазинам" buckets={analytics.byStore} />
      </div>

      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-xl border border-hairline bg-surface p-4 text-sm text-muted shadow-card">
              Загружаем погоду в хабах…
            </div>
          }
        >
          <WeatherWidget />
        </Suspense>
      </div>
    </div>
  );
}
