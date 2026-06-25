import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  USD_TO_GEL_RATE,
  type CreateParcelDto,
  type ParcelDetailResponse,
  type ParcelResponse,
  type RecalculateExposureJob,
  type RefreshParcelJob,
} from '@banderoli/contracts';
import { estimateEta } from '@banderoli/flight-intelligence';
import { PrismaService } from '../prisma/prisma.service';
import { serializeParcel, serializeParcelDetail } from './parcel.serializer';

@Injectable()
export class ParcelsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.TRACKING) private readonly trackingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EXPOSURE) private readonly exposureQueue: Queue,
  ) {}

  async list(userId: string, recipientProfileId?: string): Promise<ParcelResponse[]> {
    const parcels = await this.prisma.db.parcel.findMany({
      where: {
        recipientProfile: { userId },
        ...(recipientProfileId ? { recipientProfileId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return parcels.map(serializeParcel);
  }

  async getOne(userId: string, parcelId: string): Promise<ParcelDetailResponse> {
    const parcel = await this.prisma.db.parcel.findFirst({
      where: { id: parcelId, recipientProfile: { userId } },
      include: { logisticsEvents: { orderBy: { occurredAt: 'asc' } } },
    });

    if (!parcel) {
      throw new NotFoundException('Посылка не найдена');
    }

    return serializeParcelDetail(parcel);
  }

  async create(userId: string, dto: CreateParcelDto): Promise<ParcelResponse> {
    await this.ensureRecipientOwned(userId, dto.recipientProfileId);

    const declaredValueUsd = dto.declaredValueUsd ?? null;
    const declaredValueGel =
      declaredValueUsd === null ? null : round2(declaredValueUsd * USD_TO_GEL_RATE);
    const eta = estimateEta({ carrier: dto.carrier ?? null, shippedAt: null });

    const parcel = await this.prisma.db.parcel.create({
      data: {
        recipientProfileId: dto.recipientProfileId,
        trackingNumber: dto.trackingNumber,
        carrier: dto.carrier ?? null,
        store: dto.store ?? null,
        description: dto.description ?? null,
        declaredValueUsd,
        declaredValueGel,
        weightKg: dto.weightKg ?? null,
        quantity: dto.quantity,
        estimatedArrival: eta.estimatedArrival,
      },
    });

    await this.enqueuePostCreate(parcel.id, parcel.recipientProfileId);

    return serializeParcel(parcel);
  }

  private async enqueuePostCreate(
    parcelId: string,
    recipientProfileId: string,
  ): Promise<void> {
    await this.trackingQueue.add(JOB_NAMES.REFRESH_PARCEL, {
      parcelId,
    } satisfies RefreshParcelJob);

    await this.exposureQueue.add(JOB_NAMES.RECALCULATE_EXPOSURE, {
      recipientProfileId,
    } satisfies RecalculateExposureJob);
  }

  private async ensureRecipientOwned(userId: string, recipientProfileId: string): Promise<void> {
    const recipient = await this.prisma.db.recipientProfile.findFirst({
      where: { id: recipientProfileId, userId },
      select: { id: true },
    });

    if (!recipient) {
      throw new NotFoundException('Получатель не найден');
    }
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
