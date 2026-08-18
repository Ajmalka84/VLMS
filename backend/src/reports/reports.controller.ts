import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { QuerySettlementDto } from './dto/query-settlement.dto';
import { QueryContractorSummaryDto } from './dto/query-contractor-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('contractors-summary')
  async getContractorsSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryContractorSummaryDto,
  ) {
    return this.reportsService.getContractorsSummary(user, query);
  }

  @Get('settlement')
  async getSettlementStatement(
    @CurrentUser() user: AuthUser,
    @Query() query: QuerySettlementDto,
  ) {
    return this.reportsService.getSettlementStatement(user, query);
  }
}
