import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftReconciliationDto } from './dto/create-shift-reconciliation.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { ApproveShiftDto } from './dto/approve-shift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current-drawer')
  @Roles('OWNER', 'CO_PARTNER', 'SITE_BOY', 'SUPER_ADMIN')
  async getCurrentDrawer(
    @CurrentUser() user: AuthUser,
    @Query('siteId') siteId?: string,
    @Query('date') date?: string,
  ) {
    return this.shiftsService.getCurrentDrawer(user, siteId, date);
  }

  @Post('close')
  @Roles('SITE_BOY', 'OWNER', 'SUPER_ADMIN')
  async closeShift(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShiftReconciliationDto,
  ) {
    return this.shiftsService.closeShift(user, dto);
  }

  @Patch(':id/approve')
  @Roles('OWNER', 'SUPER_ADMIN')
  async approveShift(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApproveShiftDto,
  ) {
    return this.shiftsService.approveShift(user, id, dto);
  }

  @Patch(':id/reopen')
  @Roles('OWNER', 'SUPER_ADMIN')
  async reopenShift(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.shiftsService.reopenShift(user, id);
  }

  @Get('history')
  @Roles('OWNER', 'CO_PARTNER', 'SITE_BOY', 'SUPER_ADMIN')
  async listShifts(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryShiftsDto,
  ) {
    return this.shiftsService.listShifts(user, query);
  }
}
