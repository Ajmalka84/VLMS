import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsCashflowService } from './reports-cashflow.service';
import { ReportsPartnerShareService } from './reports-partner-share.service';
import { ReportsMachineryService } from './reports-machinery.service';
import { ReportsBalanceSheetService } from './reports-balance-sheet.service';
import { QuerySettlementDto } from './dto/query-settlement.dto';
import { QueryContractorSummaryDto } from './dto/query-contractor-summary.dto';
import { QueryCashflowDto } from './dto/query-cashflow.dto';
import { QueryPartnerSettlementDto } from './dto/query-partner-settlement.dto';
import { QueryMachinerySettlementDto } from './dto/query-machinery-settlement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsCashflowService: ReportsCashflowService,
    private readonly reportsPartnerShareService: ReportsPartnerShareService,
    private readonly reportsMachineryService: ReportsMachineryService,
    private readonly reportsBalanceSheetService: ReportsBalanceSheetService,
  ) {}

  @Get('contractors-summary')
  @Roles('OWNER', 'CO_PARTNER', 'SITE_BOY', 'SUPER_ADMIN')
  async getContractorsSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryContractorSummaryDto,
  ) {
    return this.reportsService.getContractorsSummary(user, query);
  }

  @Get('settlement')
  @Roles('OWNER', 'CO_PARTNER', 'SITE_BOY', 'SUPER_ADMIN')
  async getSettlementStatement(
    @CurrentUser() user: AuthUser,
    @Query() query: QuerySettlementDto,
  ) {
    return this.reportsService.getSettlementStatement(user, query);
  }

  @Get('cashflow')
  @Roles('OWNER', 'CO_PARTNER', 'SITE_BOY', 'SUPER_ADMIN')
  async getCashflowReport(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryCashflowDto,
  ) {
    return this.reportsCashflowService.getCashflowReport(user, query);
  }

  @Get('partner-settlement')
  @Roles('OWNER', 'CO_PARTNER', 'SUPER_ADMIN')
  async getPartnerSettlement(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryPartnerSettlementDto,
  ) {
    return this.reportsPartnerShareService.getPartnerSettlement(user, query);
  }

  @Get('partner-rebalance')
  @Roles('OWNER', 'CO_PARTNER', 'SUPER_ADMIN')
  async getPartnerRebalance(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryPartnerSettlementDto,
  ) {
    return this.reportsPartnerShareService.getMultiPartnerRebalanceReport(user, query);
  }

  @Get('machinery-settlement')
  @Roles('OWNER', 'CO_PARTNER', 'SUPER_ADMIN')
  async getMachinerySettlement(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryMachinerySettlementDto,
  ) {
    return this.reportsMachineryService.getMachinerySettlement(user, query);
  }

  @Get('balance-sheet')
  @Roles('OWNER', 'CO_PARTNER', 'SUPER_ADMIN')
  async getSiteBalanceSheet(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryCashflowDto,
  ) {
    return this.reportsBalanceSheetService.getSiteBalanceSheet(user, query);
  }
}
