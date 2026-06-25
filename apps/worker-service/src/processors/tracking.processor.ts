import { Inject, Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  RefreshParcelJobSchema,
  type RecalculateExposureJob,
  type SendTelegramJob,
} from '@banderoli/contracts';
import { Prisma } from '@banderoli/database';
import { PrismaService } from '../prisma/prisma.service';
import { TRACKING_PROVIDER, type TrackingProvider } from '../tracking/tracking-provider';

// Смена на эти статусы достойна уведомления пользователю.
const NOTIFY_ON: ReadonlyArray<string> = ['IN_CUSTOMS', 'DELIVERED'];

@Processor(QUEUE_NAMES.TRACKING)
export class TrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(TRACKING_PROVIDER) private readonly provider: TrackingProvider,
    @InjectQueue(QUEUE_NAMES.EXPOSURE) private readonly exposureQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<{ parcelId: string; status: string; newEvents: number }> {
    const { parcelId } = RefreshParcelJobSchema.parse(job.data);

    const parcel = await this.prisma.db.parcel.findUnique({
      where: { id: parcelId },
      include: {
        recipientProfile: { select: { user: { select: { telegramChatId: true } } } },
      },
    });
    if (!parcel) {
      this.logger.warn(`Parcel ${parcelId} not found — skipping refresh`);
      return { parcelId, status: 'NOT_FOUND', newEvents: 0 };
    }

    const update = await this.provider.fetch({
      trackingNumber: parcel.trackingNumber,
      carrier: parcel.carrier,
      shippedAt: parcel.shippedAt,
      createdAt: parcel.createdAt,
    });

    const newEvents = await this.persistEvents(parcelId, update.events);
    const statusChanged = parcel.status !== update.status;
    await this.applyParcelChanges(parcel, update);

    await this.exposureQueue.add(JOB_NAMES.RECALCULATE_EXPOSURE, {
      recipientProfileId: parcel.recipientProfileId,
    } satisfies RecalculateExposureJob);

    if (statusChanged && NOTIFY_ON.includes(update.status)) {
      await this.notifyStatusChange(
        parcel.recipientProfile.user.telegramChatId,
        parcel.description ?? parcel.trackingNumber,
        update.status,
      );
    }

    this.logger.log(
      `Parcel ${parcelId}: status ${update.status}, +${newEvents} events, ETA ${update.estimatedArrival?.toISOString().slice(0, 10) ?? '—'}`,
    );

    return { parcelId, status: update.status, newEvents };
  }

  private async notifyStatusChange(
    chatId: string | null,
    label: string,
    status: string,
  ): Promise<void> {
    if (!chatId) {
      return;
    }

    const message =
      status === 'IN_CUSTOMS'
        ? `Посылка «${label}» прибыла на таможенное оформление (Тбилиси). При превышении лимита 300 GEL возможен НДС.`
        : `Посылка «${label}» вручена получателю.`;

    await this.notificationsQueue.add(JOB_NAMES.SEND_TELEGRAM, {
      telegramChatId: chatId,
      message,
    } satisfies SendTelegramJob);
  }

  private async persistEvents(
    parcelId: string,
    events: Array<{ status: string; description: string | null; location: string | null; occurredAt: Date }>,
  ): Promise<number> {
    const existing = await this.prisma.db.logisticsEvent.findMany({
      where: { parcelId },
      select: { status: true, occurredAt: true },
    });
    const seen = new Set(existing.map((e) => `${e.status}@${e.occurredAt.toISOString()}`));

    const fresh = events.filter((e) => !seen.has(`${e.status}@${e.occurredAt.toISOString()}`));
    if (fresh.length === 0) {
      return 0;
    }

    await this.prisma.db.logisticsEvent.createMany({
      data: fresh.map((e) => ({
        parcelId,
        status: e.status,
        description: e.description,
        location: e.location,
        occurredAt: e.occurredAt,
      })),
    });

    return fresh.length;
  }

  private async applyParcelChanges(
    parcel: { id: string; status: string; estimatedArrival: Date | null; deliveredAt: Date | null },
    update: { status: string; estimatedArrival: Date | null; events: Array<{ status: string; occurredAt: Date }> },
  ): Promise<void> {
    const data: Prisma.ParcelUpdateInput = {};

    if (parcel.status !== update.status) {
      data.status = update.status as Prisma.ParcelUpdateInput['status'];
    }

    if (
      update.estimatedArrival &&
      parcel.estimatedArrival?.getTime() !== update.estimatedArrival.getTime()
    ) {
      data.estimatedArrival = update.estimatedArrival;
    }

    if (update.status === 'DELIVERED' && !parcel.deliveredAt) {
      const deliveredEvent = update.events.find((e) => e.status === 'DELIVERED');
      data.deliveredAt = deliveredEvent?.occurredAt ?? new Date();
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.db.parcel.update({ where: { id: parcel.id }, data });
    }
  }
}
