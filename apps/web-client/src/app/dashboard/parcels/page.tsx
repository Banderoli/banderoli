import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listParcels, listRecipients } from '@/lib/api';
import { ArchiveView } from '@/components/ArchiveView';

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const userId = session.user.id;
  const [parcels, recipients] = await Promise.all([
    listParcels(userId).catch(() => []),
    listRecipients(userId).catch(() => []),
  ]);
  const recipientNameById = Object.fromEntries(recipients.map((r) => [r.id, r.name]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-lg font-medium">Архив</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Все отправления: {parcels.length}. Фильтруйте по статусу, получателю, магазину или трек-коду.
      </p>

      <ArchiveView parcels={parcels} recipientNameById={recipientNameById} />
    </div>
  );
}
