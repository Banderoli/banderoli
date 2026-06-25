import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@banderoli/database';
import { verifyPassword } from './lib/password';
import { verifyTelegramAuth } from './lib/telegram';

const providers: Provider[] = [
  Google,

  // Вход по email + паролю.
  Credentials({
    id: 'password',
    name: 'Email и пароль',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Пароль', type: 'password' },
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? '')
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? '');
      if (!email || !password) {
        return null;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) {
        return null;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return null;
      }

      return { id: user.id, email: user.email, name: user.name };
    },
  }),

  // Вход через Telegram Login Widget (проверка HMAC-подписи бота).
  Credentials({
    id: 'telegram',
    name: 'Telegram',
    credentials: {},
    authorize: async (raw) => {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return null;
      }

      const data = verifyTelegramAuth(raw, botToken);
      if (!data) {
        return null;
      }

      const telegramChatId = String(data.id);
      const user = await prisma.user.upsert({
        where: { telegramChatId },
        update: { name: data.name, image: data.photoUrl ?? undefined },
        create: {
          telegramChatId,
          email: `tg_${telegramChatId}@telegram.local`,
          name: data.name,
          image: data.photoUrl,
        },
      });

      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  // За dev-прокси приходит x-forwarded-proto=https; не выставляем Secure-cookie,
  // иначе браузер на http://localhost её отклоняет и сессия не сохраняется.
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers,
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
