import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { redisConnectionFromUrl } from '@banderoli/common';
import { QUEUE_NAMES } from '@banderoli/contracts';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { TrackingProcessor } from './processors/tracking.processor';
import { ExposureProcessor } from './processors/exposure.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { SimulationTrackingProvider } from './tracking/simulation-tracking.provider';
import { TRACKING_PROVIDER } from './tracking/tracking-provider';
import { TelegramClient } from './notifications/telegram.client';
import { TrackingScheduler } from './scheduling/tracking-scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnectionFromUrl(config.getOrThrow<string>('REDIS_URL')),
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.TRACKING },
      { name: QUEUE_NAMES.EXPOSURE },
      { name: QUEUE_NAMES.NOTIFICATIONS },
    ),
    PrismaModule,
  ],
  providers: [
    TrackingProcessor,
    ExposureProcessor,
    NotificationsProcessor,
    TelegramClient,
    TrackingScheduler,
    { provide: TRACKING_PROVIDER, useClass: SimulationTrackingProvider },
  ],
})
export class WorkerModule {}
