import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listParcels } from '@/lib/api';
import { ParcelRow } from '@/components/ParcelRow';

export default async function ParcelsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const parcels = await listParcels(session.user.id).catch(() => []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-lg font-medium">Все посылки</h1>
      <p className="mt-1 text-sm text-muted">Всего отправлений: {parcels.length}</p>

      <div className="mt-6 rounded-xl border border-hairline bg-surface p-4">
        {parcels.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Пока нет посылок</p>
        ) : (
          parcels.map((parcel) => <ParcelRow key={parcel.id} parcel={parcel} />)
        )}
      </div>
    </div>
  );
}
