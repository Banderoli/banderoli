'use client';

import { useRouter } from 'next/navigation';
import type { RecipientOption } from '@/lib/mock-data';

export function RecipientSwitcher({
  recipients,
  selectedId,
}: {
  recipients: RecipientOption[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/dashboard?recipient=${encodeURIComponent(e.target.value)}`)}
      aria-label="Получатель"
      className="rounded-md border border-brand bg-brand-soft px-3 py-2 text-sm text-brand-dark shadow-card outline-none transition focus:border-brand-dark"
    >
      {recipients.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
