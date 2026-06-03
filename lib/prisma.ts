// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Добавляем prisma в глобальный объект Node.js
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Экспортируем единственный экземпляр
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// В режиме разработки сохраняем инстанс, чтобы он не пересоздавался при HMR (Hot Reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}