import { Body, Controller, Post } from '@nestjs/common';
import {
  ProductSearchRequestSchema,
  ReviewRequestSchema,
  type ProductSearchRequestDto,
  type ReviewRequestDto,
} from '@banderoli/contracts';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('reviews')
  reviews(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ReviewRequestSchema)) dto: ReviewRequestDto,
  ) {
    return this.aiService.reviews(user.userId, dto.url);
  }

  @Post('product-search')
  productSearch(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ProductSearchRequestSchema)) dto: ProductSearchRequestDto,
  ) {
    return this.aiService.productSearch(user.userId, dto.description);
  }
}
