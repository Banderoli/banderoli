'use client';

import { useActionState } from 'react';
import type { RecipientResponse } from '@banderoli/contracts';
import { editRecipientAction, type RecipientFormState } from '@/app/recipient-actions';

const INIT: RecipientFormState = {};
const inputClass =
  'rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function ProfileEditor({ recipient }: { recipient: RecipientResponse }) {
  const [state, action, pending] = useActionState(editRecipientAction, INIT);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={recipient.id} />
      <div className="grid gap-2 sm:grid-cols-3">
        <input name="name" defaultValue={recipient.name} required placeholder="Имя" className={inputClass} />
        <input
          name="email"
          type="email"
          defaultValue={recipient.email ?? ''}
          placeholder="Почта"
          className={inputClass}
        />
        <input
          name="telegram"
          defaultValue={recipient.telegram ?? ''}
          placeholder="Telegram (@username)"
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? 'Сохранение…' : 'Сохранить профиль'}
        </button>
        {state.ok ? <span className="text-xs text-low">Сохранено</span> : null}
        {state.error ? <span className="text-xs text-high">{state.error}</span> : null}
      </div>
    </form>
  );
}
