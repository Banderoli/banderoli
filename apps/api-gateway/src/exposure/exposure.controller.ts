import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ExposureService } from './exposure.service';

@Controller('exposure')
export class ExposureController {
  constructor(private readonly exposureService: ExposureService) {}

  @Get('recipient/:id')
  forRecipient(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.exposureService.forRecipient(user.userId, id);
  }
}
