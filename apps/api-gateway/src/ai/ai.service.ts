import { Inject, Injectable } from '@nestjs/common';
import type { ProductSearchResponse, ReviewResponse } from '@banderoli/contracts';
import { AI_PROVIDER, type AiProvider } from './ai-provider';
import { AiQuotaService } from './ai-quota.service';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly quota: AiQuotaService,
  ) {}

  async reviews(userId: string, url: string): Promise<ReviewResponse> {
    await this.quota.ensureAvailable(userId);
    const summary = await this.provider.reviewsForUrl(url);
    const quota = await this.quota.consume(userId);
    return { summary, quota };
  }

  async productSearch(userId: string, description: string): Promise<ProductSearchResponse> {
    await this.quota.ensureAvailable(userId);
    const suggestions = await this.provider.productsForDescription(description);
    const quota = await this.quota.consume(userId);
    return { suggestions, generatedByAi: this.provider.usesRealAi, quota };
  }
}
