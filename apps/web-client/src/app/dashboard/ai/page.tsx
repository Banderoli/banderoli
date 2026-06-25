import { redirect } from 'next/navigation';
import { AI_DAILY_LIMIT } from '@banderoli/contracts';
import { auth } from '@/auth';
import { AiTools } from '@/components/AiTools';

export default async function AiPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-lg font-medium">ИИ функции</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Помощь с выбором товара. Бесплатно — до {AI_DAILY_LIMIT} запросов в день.
      </p>
      <AiTools />
    </div>
  );
}
