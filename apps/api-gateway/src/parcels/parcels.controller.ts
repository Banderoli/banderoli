import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  CreateParcelSchema,
  type CreateParcelDto,
} from '@banderoli/contracts';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ParcelsService } from './parcels.service';

@Controller('parcels')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('recipientProfileId') recipientProfileId?: string,
  ) {
    return this.parcelsService.list(user.userId, recipientProfileId);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.parcelsService.getOne(user.userId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateParcelSchema)) dto: CreateParcelDto,
  ) {
    return this.parcelsService.create(user.userId, dto);
  }
}
