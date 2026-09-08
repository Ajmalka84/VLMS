import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryMachinerySettlementDto } from './dto/query-machinery-settlement.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { buildDateRangeFilter, resolveTargetUserId } from '../common/utils/query-builder.util';

@Injectable()
export class ReportsMachineryService {
  constructor(private readonly prisma: PrismaService) {}

  async getMachinerySettlement(user: AuthUser, query: QueryMachinerySettlementDto) {
    const targetUserId = await resolveTargetUserId(this.prisma, user, query.customerId);

    const business = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, businessName: true, mobile: true, gstin: true },
    });

    if (!business) {
      throw new NotFoundException('Business account not found');
    }

    // 1. Fetch all registered heavy machinery for this business
    const allMachinery = await this.prisma.machinery.findMany({
      where: { userId: targetUserId, isActive: true },
      orderBy: { name: 'asc' },
    });

    // Determine site filter
    const siteWhere: any = { userId: targetUserId, isActive: true };
    if (user.role === 'SITE_BOY') {
      siteWhere.id = user.assignedSiteId;
    } else if (user.role === 'CO_PARTNER') {
      siteWhere.id = { in: user.assignedSiteIds || [] };
    }

    if (query.siteId) {
      if (user.role === 'SITE_BOY' && query.siteId !== user.assignedSiteId) {
        throw new ForbiddenException('You cannot access reports outside your assigned site');
      }
      if (user.role === 'CO_PARTNER' && (!user.assignedSiteIds || !user.assignedSiteIds.includes(query.siteId))) {
        throw new ForbiddenException('You do not have access to reports for this site');
      }
      siteWhere.id = query.siteId;
    }

    const allowedSites = await this.prisma.site.findMany({
      where: siteWhere,
      select: { id: true, siteName: true, location: true },
    });
    const allowedSiteIds = allowedSites.map((s) => s.id);

    // 2. Build Expense Query for Machinery Rentals
    const expenseWhere: any = {
      siteId: { in: allowedSiteIds },
      machineryId: { not: null },
      deletedAt: null,
    };

    if (query.machineryId) {
      expenseWhere.machineryId = query.machineryId;
    }

    const dateFilter = buildDateRangeFilter(query.startDate, query.endDate);
    if (dateFilter) {
      expenseWhere.date = dateFilter;
    }

    const logs = await this.prisma.expense.findMany({
      where: expenseWhere,
      include: {
        machinery: true,
        site: { select: { id: true, siteName: true, location: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    // 3. Aggregate per-machinery data
    const machineryStatsMap = new Map<
      string,
      {
        machineryId: string;
        name: string;
        code: string | null;
        vendorName: string | null;
        vendorMobile: string | null;
        defaultRentPerHour: number;
        totalHours: number;
        totalGrossRent: number;
        totalAdvancesPaid: number;
        balancePayable: number;
        logsCount: number;
      }
    >();

    // Initialize all machines or filtered machine
    const machinesToInclude = query.machineryId
      ? allMachinery.filter((m) => m.id === query.machineryId)
      : allMachinery;

    for (const m of machinesToInclude) {
      machineryStatsMap.set(m.id, {
        machineryId: m.id,
        name: m.name,
        code: m.code,
        vendorName: m.vendorName,
        vendorMobile: m.vendorMobile,
        defaultRentPerHour: Number(m.defaultRentPerHour),
        totalHours: 0,
        totalGrossRent: 0,
        totalAdvancesPaid: 0,
        balancePayable: 0,
        logsCount: 0,
      });
    }

    let grandTotalHours = 0;
    let grandGrossRent = 0;
    let grandAdvancesPaid = 0;

    const logItems = logs.map((log) => {
      const hours = log.totalHours ? Number(log.totalHours) : 0;
      const grossAmt = Number(log.amount);
      const advAmt = log.advanceAmount ? Number(log.advanceAmount) : 0;
      const rentPerHour = log.rentPerHour ? Number(log.rentPerHour) : (log.machinery ? Number(log.machinery.defaultRentPerHour) : 0);

      grandTotalHours += hours;
      grandGrossRent += grossAmt;
      grandAdvancesPaid += advAmt;

      if (log.machineryId && machineryStatsMap.has(log.machineryId)) {
        const stat = machineryStatsMap.get(log.machineryId)!;
        stat.totalHours += hours;
        stat.totalGrossRent += grossAmt;
        stat.totalAdvancesPaid += advAmt;
        stat.balancePayable += (grossAmt - advAmt);
        stat.logsCount += 1;
      }

      return {
        id: log.id,
        date: new Date(log.date).toISOString().split('T')[0],
        machineryName: log.machinery?.name || 'Unknown Machine',
        machineryCode: log.machinery?.code || null,
        vendorName: log.machinery?.vendorName || null,
        siteName: log.site?.siteName || '',
        startTime: log.startTime || null,
        closingTime: log.closingTime || null,
        totalHours: hours,
        rentPerHour,
        grossAmount: grossAmt,
        paymentMode: log.paymentMode,
        advanceAmount: advAmt,
        operatorPaidTo: log.paidTo || null,
        remarks: log.remarks || null,
      };
    });

    const grandBalancePayable = grandGrossRent - grandAdvancesPaid;

    return {
      business,
      machineryList: allMachinery.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        vendorName: m.vendorName,
      })),
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      grandTotal: {
        totalMachines: machineryStatsMap.size,
        totalLogs: logs.length,
        totalHours: grandTotalHours,
        totalGrossRent: grandGrossRent,
        totalAdvancesPaid: grandAdvancesPaid,
        balancePayable: grandBalancePayable,
      },
      machinesSummary: Array.from(machineryStatsMap.values()),
      logs: logItems,
    };
  }
}
