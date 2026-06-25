import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  type RefreshParcelJob,
} from '@banderoli/contracts';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_STATUSES = ['PENDING', 'IN_TRANSIT', 'IN_CUSTOMS', 'CUSTOMS_CLEARED'] as const;

@Injectable()
export class TrackingScheduler {
  private readonly logger = new Logger(TrackingScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.TRACKING) private readonly trackingQueue: Queue,
  ) {}

  // Периодически ставит задачи обновления трекинга по всем активным посылкам.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async enqueueActiveRefresh(): Promise<void> {
    const parcels = await this.prisma.db.parcel.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] } },
      select: { id: true },
    });

    await Promise.all(
      parcels.map((parcel) =>
        this.trackingQueue.add(JOB_NAMES.REFRESH_PARCEL, {
          parcelId: parcel.id,
        } satisfies RefreshParcelJob),
      ),
    );

    this.logger.log(`Scheduled tracking refresh for ${parcels.length} active parcels`);
  }
}
