import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  RecalculateExposureJobSchema,
  type SendTelegramJob,
} from '@banderoli/contracts';
import { decimalToNumberOr } from '@banderoli/common';
import {
  calculateExposure,
  type ParcelExposureInput,
} from '@banderoli/customs-exposure-engine';
import { PrismaService } from '../prisma/prisma.service';

// Статусы, при которых посылка ещё формирует таможенную экспозицию получателя.
const ACTIVE_STATUSES = ['PENDING', 'IN_TRANSIT', 'IN_CUSTOMS', 'CUSTOMS_CLEARED'] as const;
const HIGH_THRESHOLD = 61;

@Processor(QUEUE_NAMES.EXPOSURE)
export class ExposureProcessor extends WorkerHost {
  private readonly logger = new Logger(ExposureProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<{ recipientProfileId: string; score: number }> {
    const { recipientProfileId } = RecalculateExposureJobSchema.parse(job.data);

    const parcels = await this.prisma.db.parcel.findMany({
      where: { recipientProfileId, status: { in: [...ACTIVE_STATUSES] } },
    });

    const previousScore = parcels.reduce((max, p) => Math.max(max, p.currentExposureScore), 0);

    const inputs: ParcelExposureInput[] = parcels.map((parcel) => ({
      valueGel: decimalToNumberOr(parcel.declaredValueGel, 0),
      weightKg: decimalToNumberOr(parcel.weightKg, 0),
      quantity: parcel.quantity,
      estimatedArrival: parcel.estimatedArrival,
    }));

    const result = calculateExposure(recipientProfileId, inputs);

    await this.prisma.db.parcel.updateMany({
      where: { recipientProfileId, status: { in: [...ACTIVE_STATUSES] } },
      data: { currentExposureScore: result.score },
    });

    // Уведомляем только при пересечении в HIGH (а не на каждом пересчёте).
    if (previousScore < HIGH_THRESHOLD && result.score >= HIGH_THRESHOLD) {
      await this.notifyHighExposure(recipientProfileId, result.alerts[0]?.message);
    }

    this.logger.log(
      `Recipient ${recipientProfileId}: exposure ${result.score} (${result.level}), parcels=${parcels.length}`,
    );

    return { recipientProfileId, score: result.score };
  }

  private async notifyHighExposure(
    recipientProfileId: string,
    alertMessage: string | undefined,
  ): Promise<void> {
    const recipient = await this.prisma.db.recipientProfile.findUnique({
      where: { id: recipientProfileId },
      select: { name: true, user: { select: { telegramChatId: true } } },
    });

    const chatId = recipient?.user.telegramChatId;
    if (!chatId) {
      return;
    }

    const message =
      alertMessage ??
      `Таможенная экспозиция получателя «${recipient?.name}» достигла высокого уровня. Рекомендуется заложить НДС/пошлину в бюджет.`;

    await this.notificationsQueue.add(JOB_NAMES.SEND_TELEGRAM, {
      telegramChatId: chatId,
      message,
    } satisfies SendTelegramJob);
  }
}
