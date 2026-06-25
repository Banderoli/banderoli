import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateRecipientDto, UpdateRecipientDto } from '@banderoli/contracts';
import type { RecipientProfile } from '@banderoli/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<RecipientProfile[]> {
    return this.prisma.db.recipientProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateRecipientDto): Promise<RecipientProfile> {
    if (dto.isDefault) {
      await this.clearDefault(userId);
    }

    return this.prisma.db.recipientProfile.create({
      data: { userId, name: dto.name, isDefault: dto.isDefault },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecipientDto,
  ): Promise<RecipientProfile> {
    await this.ensureOwned(userId, id);

    if (dto.isDefault) {
      await this.clearDefault(userId);
    }

    return this.prisma.db.recipientProfile.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ensureOwned(userId, id);
    await this.prisma.db.recipientProfile.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string): Promise<void> {
    const found = await this.prisma.db.recipientProfile.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException('Получатель не найден');
    }
  }

  private async clearDefault(userId: string): Promise<void> {
    await this.prisma.db.recipientProfile.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
