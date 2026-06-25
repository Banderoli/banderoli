import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Sidebar } from '@/components/Sidebar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const name = session.user.name ?? session.user.email ?? 'Пользователь';

  return (
    <div className="flex min-h-screen">
      <Sidebar name={name} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
