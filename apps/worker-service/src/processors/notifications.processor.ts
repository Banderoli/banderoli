import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, SendTelegramJobSchema } from '@banderoli/contracts';
import { TelegramClient } from '../notifications/telegram.client';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly telegram: TelegramClient) {
    super();
  }

  async process(job: Job): Promise<{ delivered: boolean }> {
    const data = SendTelegramJobSchema.parse(job.data);
    const delivered = await this.telegram.sendMessage(data.telegramChatId, data.message);

    this.logger.log(
      `Telegram notification for chat ${data.telegramChatId}: ${delivered ? 'sent' : 'skipped'}`,
    );

    return { delivered };
  }
}
