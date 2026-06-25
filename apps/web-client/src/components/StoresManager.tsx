'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import type { StoreResponse } from '@banderoli/contracts';
import {
  createStoreAction,
  deleteStoreAction,
  type CatalogFormState,
} from '@/app/catalog-actions';

const INIT: CatalogFormState = {};
const inputClass =
  'rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand';

export function StoresManager({ stores }: { stores: StoreResponse[] }) {
  const [state, action, pending] = useActionState(createStoreAction, INIT);

  return (
    <div>
      <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input name="name" required placeholder="Название магазина" className={inputClass} />
        <input name="url" placeholder="https://… (сайт)" className={inputClass} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? '…' : 'Добавить'}
        </button>
      </form>
      {state.error ? <p className="mt-2 text-xs text-high">{state.error}</p> : null}

      <ul className="mt-3 space-y-1.5">
        {stores.length === 0 ? (
          <li className="text-sm text-muted">Пока нет магазинов</li>
        ) : (
          stores.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{s.name}</div>
                {s.url ? <div className="truncate text-xs text-muted">{s.url}</div> : null}
              </div>
              <form action={deleteStoreAction}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  aria-label="Удалить"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-high-soft hover:text-high"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
