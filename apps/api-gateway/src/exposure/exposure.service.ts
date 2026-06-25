import { Injectable, NotFoundException } from '@nestjs/common';
import { decimalToNumberOr } from '@banderoli/common';
import type { ExposureResult } from '@banderoli/contracts';
import {
  calculateExposure,
  type ParcelExposureInput,
} from '@banderoli/customs-exposure-engine';
import { PrismaService } from '../prisma/prisma.service';

// Статусы, при которых посылка ещё формирует таможенную экспозицию получателя.
const ACTIVE_STATUSES = [
  'PENDING',
  'IN_TRANSIT',
  'IN_CUSTOMS',
  'CUSTOMS_CLEARED',
] as const;

@Injectable()
export class ExposureService {
  constructor(private readonly prisma: PrismaService) {}

  async forRecipient(userId: string, recipientProfileId: string): Promise<ExposureResult> {
    const recipient = await this.prisma.db.recipientProfile.findFirst({
      where: { id: recipientProfileId, userId },
      select: { id: true },
    });

    if (!recipient) {
      throw new NotFoundException('Получатель не найден');
    }

    const parcels = await this.prisma.db.parcel.findMany({
      where: { recipientProfileId, status: { in: [...ACTIVE_STATUSES] } },
    });

    const inputs: ParcelExposureInput[] = parcels.map((parcel) => ({
      valueGel: decimalToNumberOr(parcel.declaredValueGel, 0),
      weightKg: decimalToNumberOr(parcel.weightKg, 0),
      quantity: parcel.quantity,
      estimatedArrival: parcel.estimatedArrival,
    }));

    return calculateExposure(recipientProfileId, inputs);
  }
}
