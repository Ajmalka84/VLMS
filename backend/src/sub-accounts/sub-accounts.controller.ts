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
@Roles('OWNER')
export class SubAccountsController {
  constructor(private readonly subAccountsService: SubAccountsService) {}

  @Get()
  async listSubAccounts(@CurrentUser() user: AuthUser) {
    return this.subAccountsService.listSubAccounts(user.ownerId);
  }

  @Post('co-partners')
  async createCoPartner(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCoPartnerDto,
  ) {
    return this.subAccountsService.createCoPartner(user.ownerId, dto);
  }

  @Patch('co-partners/:id')
  async updateCoPartner(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCoPartnerDto,
  ) {
    return this.subAccountsService.updateCoPartner(user.ownerId, id, dto);
  }

  @Post('site-boys')
  async createSiteBoy(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSiteBoyDto,
  ) {
    return this.subAccountsService.createSiteBoy(user.ownerId, dto);
  }

  @Patch('site-boys/:id')
  async updateSiteBoy(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSiteBoyDto,
  ) {
    return this.subAccountsService.updateSiteBoy(user.ownerId, id, dto);
  }

  @Delete(':id')
  async deleteSubAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.subAccountsService.deleteSubAccount(user.ownerId, id);
  }
}
