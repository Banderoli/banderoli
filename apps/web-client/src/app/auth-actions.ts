'use server';

import { AuthError } from 'next-auth';
import { prisma } from '@banderoli/database';
import { signIn, signOut } from '@/auth';
import { LoginSchema, RegisterSchema } from '@/lib/auth-schemas';
import { hashPassword } from '@/lib/password';

export interface AuthFormState {
  error?: string;
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Введите корректный email и пароль' };
  }

  try {
    await signIn('password', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Неверный email или пароль' };
    }
    throw error;
  }

  return {};
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Проверьте email и пароль' };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return { error: 'Пользователь с такой почтой уже зарегистрирован' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  if (existing) {
    // Аккаунт уже есть (например, через Google) — привязываем пароль.
    await prisma.user.update({ where: { email }, data: { passwordHash } });
  } else {
    await prisma.user.create({
      data: { email, passwordHash, name: email.split('@')[0] ?? email },
    });
  }

  try {
    await signIn('password', {
      email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Регистрация прошла, но войти не удалось. Попробуйте на странице входа.' };
    }
    throw error;
  }

  return {};
}
