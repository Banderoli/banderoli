import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@banderoli/contracts';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.TRACKING },
      { name: QUEUE_NAMES.EXPOSURE },
    ),
  ],
  controllers: [ParcelsController],
  providers: [ParcelsService],
})
export class ParcelsModule {}
