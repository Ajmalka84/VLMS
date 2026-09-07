import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubAccountsService } from './sub-accounts.service';
import { CreateCoPartnerDto } from './dto/create-co-partner.dto';
import { UpdateCoPartnerDto } from './dto/update-co-partner.dto';
import { CreateSiteBoyDto } from './dto/create-site-boy.dto';
import { UpdateSiteBoyDto } from './dto/update-site-boy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('sub-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'SUPER_ADMIN')
export class SubAccountsController {
  constructor(private readonly subAccountsService: SubAccountsService) {}

  @Get()
  async listSubAccounts(@CurrentUser() user: AuthUser) {
    const ownerId = user.ownerId || user.id;
    return this.subAccountsService.listSubAccounts(ownerId);
  }

  @Post('co-partners')
  async createCoPartner(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCoPartnerDto,
  ) {
    const ownerId = user.ownerId || user.id;
    return this.subAccountsService.createCoPartner(ownerId, dto);
  }

  @Patch('co-partners/:id')
  async updateCoPartner(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCoPartnerDto,
  ) {
    const ownerId = user.ownerId || user.id;
    return this.subAccountsService.updateCoPartner(ownerId, id, dto);
  }

  @Post('site-boys')
  async createSiteBoy(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSiteBoyDto,
  ) {
    const ownerId = user.ownerId || user.id;
    return this.subAccountsService.createSiteBoy(ownerId, dto);
  }

  @Patch('site-boys/:id')
  async updateSiteBoy(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSiteBoyDto,
  ) {
    const ownerId = user.ownerId || user.id;
    return this.subAccountsService.updateSiteBoy(ownerId, id, dto);
  }

  @Delete(':id')
  async deleteSubAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const ownerId = user.ownerId || user.id;
    return this.subAccountsService.deleteSubAccount(ownerId, id);
  }
}
