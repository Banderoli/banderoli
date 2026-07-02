import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listCarriers, listParcels, listRecipients, listStores } from '@/lib/api';
import { ArchiveView } from '@/components/ArchiveView';

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const userId = session.user.id;
  const [parcels, recipients, stores, carriers] = await Promise.all([
    listParcels(userId).catch(() => []),
    listRecipients(userId).catch(() => []),
    listStores(userId).catch(() => []),
    listCarriers(userId).catch(() => []),
  ]);
  const recipientNameById = Object.fromEntries(recipients.map((r) => [r.id, r.name]));
  // Полные списки для фильтров: зарегистрированные (Настройки) + встречающиеся в посылках.
  const storeNames = Array.from(
    new Set(
      [...stores.map((s) => s.name), ...parcels.map((p) => p.store)].filter(
        (s): s is string => Boolean(s),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, 'ru'));
  const carrierNames = Array.from(
    new Set(
      [...carriers.map((c) => c.name), ...parcels.map((p) => p.carrier)].filter(
        (s): s is string => Boolean(s),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, 'ru'));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-lg font-medium">Архив</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Все отправления: {parcels.length}. Фильтруйте по статусу, получателю, магазину, перевозчику
        или трек-коду.
      </p>

      <ArchiveView
        parcels={parcels}
        recipientNameById={recipientNameById}
        recipients={recipients.map((r) => ({ id: r.id, name: r.name }))}
        storeNames={storeNames}
        carrierNames={carrierNames}
      />
    </div>
  );
}
