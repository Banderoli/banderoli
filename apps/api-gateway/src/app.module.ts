import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { redisConnectionFromUrl } from '@banderoli/common';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RecipientsModule } from './recipients/recipients.module';
import { ParcelsModule } from './parcels/parcels.module';
import { ExposureModule } from './exposure/exposure.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnectionFromUrl(config.getOrThrow<string>('REDIS_URL')),
      }),
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    RecipientsModule,
    ParcelsModule,
    ExposureModule,
    AiModule,
  ],
})
export class AppModule {}
