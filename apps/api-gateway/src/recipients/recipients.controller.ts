import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateRecipientSchema,
  UpdateRecipientSchema,
  type CreateRecipientDto,
  type UpdateRecipientDto,
} from '@banderoli/contracts';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { RecipientsService } from './recipients.service';

@Controller('recipients')
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.recipientsService.list(user.userId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateRecipientSchema)) dto: CreateRecipientDto,
  ) {
    return this.recipientsService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRecipientSchema)) dto: UpdateRecipientDto,
  ) {
    return this.recipientsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.recipientsService.remove(user.userId, id);
  }
}
