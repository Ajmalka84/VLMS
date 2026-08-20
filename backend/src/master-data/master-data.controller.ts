import { Controller, Get, UseGuards } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('master-data')
@UseGuards(JwtAuthGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('bundle')
  async getBundle(@CurrentUser() user: AuthUser) {
    return this.masterDataService.getBundle(user.id);
  }
}
