'use client';

import { useActionState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import type { RecipientResponse } from '@banderoli/contracts';
import {
  createRecipientAction,
  deleteRecipientAction,
  renameRecipientAction,
  setDefaultRecipientAction,
  type RecipientFormState,
} from '@/app/recipient-actions';

const INITIAL: RecipientFormState = {};
const inputClass =
  'rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function RecipientsManager({ recipients }: { recipients: RecipientResponse[] }) {
  const [state, addAction, pending] = useActionState(createRecipientAction, INITIAL);

  return (
    <div>
      <form action={addAction} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Имя получателя (реальное физлицо)"
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? 'Добавление…' : 'Добавить'}
        </button>
      </form>
      {state.error ? <p className="mt-2 text-xs text-high">{state.error}</p> : null}

      <div className="mt-5 space-y-2">
        {recipients.length === 0 ? (
          <p className="text-sm text-muted">Пока нет получателей</p>
        ) : (
          recipients.map((recipient) => (
            <div
              key={recipient.id}
              className="flex items-center gap-2 rounded-xl border border-hairline bg-surface p-3"
            >
              <form action={renameRecipientAction} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={recipient.id} />
                <input name="name" defaultValue={recipient.name} className={`${inputClass} flex-1`} />
                <button
                  type="submit"
                  className="rounded-md border border-hairline px-3 py-2 text-xs transition hover:bg-canvas"
                >
                  Сохранить
                </button>
              </form>

              {recipient.isDefault ? (
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-dark">
                  Основной
                </span>
              ) : (
                <form action={setDefaultRecipientAction}>
                  <input type="hidden" name="id" value={recipient.id} />
                  <button
                    type="submit"
                    title="Сделать основным"
                    aria-label="Сделать основным"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    <Star size={15} aria-hidden />
                  </button>
                </form>
              )}

              <form
                action={deleteRecipientAction}
                onSubmit={(e) => {
                  if (!confirm(`Удалить получателя «${recipient.name}» и все его посылки?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={recipient.id} />
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
