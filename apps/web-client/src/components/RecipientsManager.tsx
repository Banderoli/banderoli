'use client';

import { useActionState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import type { RecipientResponse } from '@banderoli/contracts';
import {
  createRecipientAction,
  deleteRecipientAction,
  setDefaultRecipientAction,
  type RecipientFormState,
} from '@/app/recipient-actions';

const INIT: RecipientFormState = {};
const inputClass =
  'rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function RecipientsManager({ recipients }: { recipients: RecipientResponse[] }) {
  const [state, action, pending] = useActionState(createRecipientAction, INIT);

  return (
    <div>
      <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input name="name" required placeholder="Имя" className={inputClass} />
        <input name="email" type="email" placeholder="Почта" className={inputClass} />
        <input name="telegram" placeholder="Telegram" className={inputClass} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? '…' : 'Добавить'}
        </button>
      </form>
      {state.error ? <p className="mt-2 text-xs text-high">{state.error}</p> : null}

      <div className="mt-4 space-y-2">
        {recipients.length === 0 ? (
          <p className="text-sm text-muted">Других получателей пока нет</p>
        ) : (
          recipients.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-xl border border-hairline bg-surface shadow-card p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{r.name}</div>
                <div className="truncate text-xs text-muted">
                  {[r.email, r.telegram].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <form action={setDefaultRecipientAction}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  title="Сделать основным"
                  aria-label="Сделать основным"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
                >
                  <Star size={15} aria-hidden />
                </button>
              </form>
              <form
                action={deleteRecipientAction}
                onSubmit={(e) => {
                  if (!confirm(`Удалить получателя «${r.name}» и все его посылки?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  title="Удалить"
                  aria-label="Удалить"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-high-soft hover:text-high"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
