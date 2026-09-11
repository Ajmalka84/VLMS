import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsCashflowService } from './reports-cashflow.service';
import { ReportsPartnerShareService } from './reports-partner-share.service';
import { ReportsMachineryService } from './reports-machinery.service';
import { ReportsBalanceSheetService } from './reports-balance-sheet.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsCashflowService,
    ReportsPartnerShareService,
    ReportsMachineryService,
    ReportsBalanceSheetService,
  ],
  exports: [
    ReportsService,
    ReportsCashflowService,
    ReportsPartnerShareService,
    ReportsMachineryService,
    ReportsBalanceSheetService,
  ],
})
export class ReportsModule {}

