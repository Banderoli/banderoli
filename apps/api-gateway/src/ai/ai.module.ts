import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiQuotaService } from './ai-quota.service';
import { AI_PROVIDER } from './ai-provider';
import { MockAiProvider } from './mock-ai.provider';

@Module({
  controllers: [AiController],
  providers: [AiService, AiQuotaService, { provide: AI_PROVIDER, useClass: MockAiProvider }],
})
export class AiModule {}
