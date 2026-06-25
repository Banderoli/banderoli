import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@banderoli/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // Используем единый экземпляр клиента из @banderoli/database (один пул соединений).
  readonly db = prisma;

  async onModuleInit(): Promise<void> {
    await this.db.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.$disconnect();
  }
}
