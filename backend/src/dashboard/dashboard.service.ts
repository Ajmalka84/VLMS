import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { buildDateRangeFilter, resolveTargetUserId, buildTenantSiteScope } from '../common/utils/query-builder.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthUser, query: QueryDashboardDto) {
    const targetUserId = await resolveTargetUserId(this.prisma, user, query.customerId);
    const requestedSiteId = query.siteId && query.siteId !== 'all' ? query.siteId : undefined;

    // 1. Determine site scope
    const { whereSiteClause, siteIdFilter } = buildTenantSiteScope(user, requestedSiteId, targetUserId);

    // 2. Determine date filter (default to today if omitted)
    const todayStr = new Date().toISOString().split('T')[0];
    const startDateStr = query.startDate || todayStr;
    const endDateStr = query.endDate || todayStr;
    const dateFilter = buildDateRangeFilter(startDateStr, endDateStr);

    // Common WHERE clauses
    const loadWhere: any = {
      site: whereSiteClause,
      deletedAt: null,
    };
    if (siteIdFilter) {
      loadWhere.siteId = siteIdFilter;
    }
    if (dateFilter) {
      loadWhere.date = dateFilter;
    }

    const expenseWhere: any = {
      site: whereSiteClause,
      deletedAt: null,
    };
    if (siteIdFilter) {
      expenseWhere.siteId = siteIdFilter;
    }
    if (dateFilter) {
      expenseWhere.date = dateFilter;
    }

    // 3. Parallel Single-Pass Database Queries
    const [
      loadOverallAgg,
      loadPaymentGroups,
      recentLoads,
      expenseOverallAgg,
      expensePaymentGroups,
      expenseMachineAgg,
      totalSitesCount,
    ] = await Promise.all([
      // Loads overall sum & count
      this.prisma.load.aggregate({
        where: loadWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Loads grouped by paymentType (CASH vs CREDIT)
      this.prisma.load.groupBy({
        by: ['paymentType'],
        where: loadWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      // 5 Most recent dispatches
      this.prisma.load.findMany({
        where: loadWhere,
        take: 5,
        orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
        include: {
          site: { select: { id: true, siteName: true, location: true } },
          vehicle: {
            select: {
              id: true,
              vehicleNumber: true,
              vehicleType: { select: { id: true, name: true } },
            },
          },
          materialType: { select: { id: true, name: true } },
          contractor: { select: { id: true, name: true, mobile: true } },
        },
      }),
      // Expenses overall sum & count
      this.prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true, advanceAmount: true },
        _count: { id: true },
      }),
      // Expenses grouped by paymentMode
      this.prisma.expense.groupBy({
        by: ['paymentMode'],
        where: expenseWhere,
        _sum: { amount: true, advanceAmount: true },
      }),
      // Machine rental expenses
      this.prisma.expense.aggregate({
        where: {
          ...expenseWhere,
          machineryId: { not: null },
        },
        _sum: { amount: true, totalHours: true },
      }),
      // Active sites count
      this.prisma.site.count({
        where: { userId: targetUserId, isActive: true },
      }),
    ]);

    // Format Loads Summary
    let cashAmount = 0;
    let cashCount = 0;
    let creditAmount = 0;
    let creditCount = 0;

    for (const group of loadPaymentGroups) {
      const amt = Number(group._sum?.amount || 0);
      const count = Number(group._count?.id || 0);
      if (group.paymentType === 'CASH') {
        cashAmount = amt;
        cashCount = count;
      } else if (group.paymentType === 'CREDIT') {
        creditAmount = amt;
        creditCount = count;
      }
    }

    const totalTurnover = Number(loadOverallAgg._sum?.amount || 0);
    const totalLoads = Number(loadOverallAgg._count?.id || 0);

    // Format Expenses Summary
    let totalCashDrawerExpenses = 0;
    let totalPendingSettlement = 0;
    for (const group of expensePaymentGroups) {
      const grpAmount = Number(group._sum?.amount || 0);
      const grpAdvance = Number(group._sum?.advanceAmount || 0);
      if (group.paymentMode === 'CASH_DRAWER') {
        totalCashDrawerExpenses = grpAmount;
      } else if (group.paymentMode === 'VENDOR_CREDIT') {
        totalPendingSettlement = Math.max(0, grpAmount - grpAdvance);
      }
    }

    const totalExpenses = Number(expenseOverallAgg._sum?.amount || 0);
    const totalAdvancesPaid = Number(expenseOverallAgg._sum?.advanceAmount || 0);
    const totalMachineRent = Number(expenseMachineAgg._sum?.amount || 0);
    const totalMachineHours = Number(expenseMachineAgg._sum?.totalHours || 0);
    const expensesCount = Number(expenseOverallAgg._count?.id || 0);

    // Live Drawer Calculation for single site if specified
    let drawer: any = null;
    if (requestedSiteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: requestedSiteId },
        select: { id: true, siteName: true, location: true },
      });

      if (site) {
        const targetDateObj = new Date(`${startDateStr}T00:00:00.000Z`);
        const previousShift = await this.prisma.shiftReconciliation.findFirst({
          where: {
            siteId: requestedSiteId,
            date: { lt: targetDateObj },
          },
          orderBy: { date: 'desc' },
          select: { actualHandoverCash: true },
        });

        const openingCash = previousShift ? Number(previousShift.actualHandoverCash) : 0;
        const expectedCash = openingCash + cashAmount - (totalCashDrawerExpenses + totalAdvancesPaid);

        const existingShift = await this.prisma.shiftReconciliation.findFirst({
          where: {
            siteId: requestedSiteId,
            date: targetDateObj,
          },
          include: {
            supervisor: { select: { id: true, name: true, mobile: true } },
            approvedBy: { select: { id: true, name: true, mobile: true } },
          },
        });

        drawer = {
          siteId: site.id,
          siteName: site.siteName,
          openingCash,
          cashInflows: cashAmount,
          cashLoadsCount: cashCount,
          cashOutflows: totalCashDrawerExpenses + totalAdvancesPaid,
          expensesCount,
          expectedCash: Math.round(expectedCash * 100) / 100,
          existingShift: existingShift
            ? {
                id: existingShift.id,
                shiftType: existingShift.shiftType,
                openingCash: Number(existingShift.openingCash),
                actualHandoverCash: Number(existingShift.actualHandoverCash),
                discrepancy: Number(existingShift.discrepancy),
                remarks: existingShift.remarks,
                isApproved: existingShift.isApproved,
                supervisorName: existingShift.supervisor.name || existingShift.supervisor.mobile,
                approvedByName: existingShift.approvedBy
                  ? existingShift.approvedBy.name || existingShift.approvedBy.mobile
                  : null,
              }
            : null,
        };
      }
    }

    return {
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
      siteScope: {
        selectedSiteId: requestedSiteId || 'all',
        totalActiveSites: totalSitesCount,
      },
      loads: {
        totalLoads,
        totalTurnover: Math.round(totalTurnover * 100) / 100,
        cashAmount: Math.round(cashAmount * 100) / 100,
        creditAmount: Math.round(creditAmount * 100) / 100,
        cashCount,
        creditCount,
        recentLoads,
        summary: {
          totalLoads,
          totalTurnover: Math.round(totalTurnover * 100) / 100,
          cashAmount: Math.round(cashAmount * 100) / 100,
          creditAmount: Math.round(creditAmount * 100) / 100,
          cashCount,
          creditCount,
        },
      },
      expenses: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalCashDrawerExpenses: Math.round(totalCashDrawerExpenses * 100) / 100,
        totalMachineRent: Math.round(totalMachineRent * 100) / 100,
        totalAdvancesPaid: Math.round(totalAdvancesPaid * 100) / 100,
        totalPendingSettlement: Math.round(totalPendingSettlement * 100) / 100,
        totalMachineHours: Math.round(totalMachineHours * 100) / 100,
        count: expensesCount,
        summary: {
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          totalCashDrawerExpenses: Math.round(totalCashDrawerExpenses * 100) / 100,
          totalMachineRent: Math.round(totalMachineRent * 100) / 100,
          totalAdvancesPaid: Math.round(totalAdvancesPaid * 100) / 100,
          totalPendingSettlement: Math.round(totalPendingSettlement * 100) / 100,
          totalMachineHours: Math.round(totalMachineHours * 100) / 100,
          count: expensesCount,
        },
      },
      drawer,
    };
  }
}
