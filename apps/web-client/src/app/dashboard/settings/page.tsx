import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Send } from 'lucide-react';
import { auth } from '@/auth';
import { listCarriers, listRecipients, listStores } from '@/lib/api';
import { ProfileEditor } from '@/components/ProfileEditor';
import { RecipientsManager } from '@/components/RecipientsManager';
import { StoresManager } from '@/components/StoresManager';
import { CarriersManager } from '@/components/CarriersManager';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-hairline bg-surface p-5">
      <h2 className="text-sm font-medium">{title}</h2>
      {description ? <p className="mt-0.5 mb-3 text-sm text-muted">{description}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const userId = session.user.id;
  const [recipients, stores, carriers] = await Promise.all([
    listRecipients(userId),
    listStores(userId),
    listCarriers(userId),
  ]);

  const main = recipients.find((r) => r.isDefault) ?? recipients[0] ?? null;
  const others = recipients.filter((r) => r.id !== main?.id);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '';

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
      <h1 className="text-lg font-medium">Настройки</h1>

      {main ? (
        <Section title="Профиль" description="Основной получатель — это вы.">
          <ProfileEditor recipient={main} />
        </Section>
      ) : null}

      <Section title="Telegram-бот" description="Уведомления о таможенной экспозиции в Telegram.">
        <div className="space-y-2 text-sm">
          {botUsername ? (
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-2 font-medium transition hover:bg-canvas"
            >
              <Send size={14} aria-hidden />
              Открыть @{botUsername}
            </a>
          ) : (
            <p className="text-muted">Бот пока не настроен.</p>
          )}
          <p className="text-muted">
            Telegram основного получателя: {main?.telegram ? <span className="text-ink">{main.telegram}</span> : '—'} (меняется в профиле выше).
          </p>
        </div>
      </Section>

      <Section
        title="Получатели"
        description="Бенефициары — реальные физлица. У каждого свой беспошлинный лимит 300 GEL."
      >
        <RecipientsManager recipients={others} />
      </Section>

      <Section title="Магазины" description="Список магазинов для выбора при добавлении посылки.">
        <StoresManager stores={stores} />
      </Section>

      <Section title="Перевозчики" description="Список перевозчиков для выбора при добавлении посылки.">
        <CarriersManager carriers={carriers} />
      </Section>
    </div>
  );
}
