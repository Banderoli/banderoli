'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { loginAction, registerAction, type AuthFormState } from '@/app/auth-actions';
import { Logo } from '@/components/Logo';

const INITIAL: AuthFormState = {};

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const t = useTranslations('auth');
  const isLogin = mode === 'login';
  const [state, formAction, pending] = useActionState(
    isLogin ? loginAction : registerAction,
    INITIAL,
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-hairline bg-surface shadow-card p-6">
        <div className="mb-5">
          <Logo className="text-2xl" />
        </div>

        <h1 className="mb-1 text-base font-medium">
          {isLogin ? t('loginTitle') : t('registerTitle')}
        </h1>
        <p className="mb-5 text-sm text-muted">
          {isLogin ? t('loginSubtitle') : t('registerSubtitle')}
        </p>

        <form action={formAction} className="space-y-2">
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            name="password"
            type="password"
            required
            placeholder={t('passwordPlaceholder')}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-brand"
          />
          {state.error ? <p className="text-xs text-high">{state.error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? t('wait') : isLogin ? t('signIn') : t('signUp')}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-muted">
          {isLogin ? (
            <>
              {t('noAccount')}{' '}
              <Link href="/register" className="text-brand-dark underline">
                {t('signUp')}
              </Link>
            </>
          ) : (
            <>
              {t('haveAccount')}{' '}
              <Link href="/login" className="text-brand-dark underline">
                {t('signIn')}
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
