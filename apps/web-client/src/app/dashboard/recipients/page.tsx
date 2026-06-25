import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listRecipients } from '@/lib/api';
import { RecipientsManager } from '@/components/RecipientsManager';

export default async function RecipientsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const recipients = await listRecipients(session.user.id).catch(() => []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-lg font-medium">Получатели</h1>
      <p className="mt-1 text-sm text-muted">
        Бенефициары — реальные физлица. У каждого свой беспошлинный лимит 300 GEL и своя
        таможенная экспозиция.
      </p>

      <div className="mt-6">
        <RecipientsManager recipients={recipients} />
      </div>
    </div>
  );
}
