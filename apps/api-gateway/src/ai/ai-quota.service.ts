import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AI_DAILY_LIMIT, type AiQuota } from '@banderoli/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // Бросает 429, если дневной лимит уже исчерпан (до выполнения запроса).
  async ensureAvailable(userId: string): Promise<void> {
    const usage = await this.prisma.db.aiUsage.findUnique({
      where: { userId_day: { userId, day: this.today() } },
    });

    if ((usage?.count ?? 0) >= AI_DAILY_LIMIT) {
      throw new HttpException(
        `Дневной лимит ИИ-запросов исчерпан (${AI_DAILY_LIMIT}/день). Попробуйте завтра.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // Списывает один запрос и возвращает актуальную квоту.
  async consume(userId: string): Promise<AiQuota> {
    const day = this.today();
    const usage = await this.prisma.db.aiUsage.upsert({
      where: { userId_day: { userId, day } },
      update: { count: { increment: 1 } },
      create: { userId, day, count: 1 },
    });

    return {
      used: usage.count,
      limit: AI_DAILY_LIMIT,
      remaining: Math.max(0, AI_DAILY_LIMIT - usage.count),
    };
  }
}
