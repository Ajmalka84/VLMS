import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryCashflowDto } from './dto/query-cashflow.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ReportsCashflowService {
  constructor(private readonly prisma: PrismaService) {}

  async getCashflowReport(user: AuthUser, query: QueryCashflowDto) {
    let targetUserId = user.ownerId || user.id;

    if (user.role === 'SUPER_ADMIN') {
      if (query.customerId) {
        targetUserId = query.customerId;
      } else {
        const firstCust = await this.prisma.user.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        if (firstCust) {
          targetUserId = firstCust.id;
        }
      }
    }

    const business = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, businessName: true, mobile: true, gstin: true },
    });

    if (!business) {
      throw new NotFoundException('Business account not found');
    }

    // Determine site filter
    const siteWhere: any = { userId: targetUserId, isActive: true };
    if (user.role === 'SITE_BOY') {
      if (!user.assignedSiteId) {
        throw new ForbiddenException('Site supervisor is not assigned to any quarry site');
      }
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

    const sites = await this.prisma.site.findMany({
      where: siteWhere,
      select: { id: true, siteName: true, location: true },
    });
    const allowedSiteIds = sites.map((s) => s.id);

    // Date range filter
    const dateFilter: any = {};
    if (query.startDate) {
      dateFilter.gte = new Date(`${query.startDate}T00:00:00.000Z`);
    }
    if (query.endDate) {
      dateFilter.lte = new Date(`${query.endDate}T23:59:59.999Z`);
    }

    // 1. Fetch Cash Loads (Inflows)
    const loadWhere: any = {
      siteId: { in: allowedSiteIds },
      paymentType: 'CASH',
      deletedAt: null,
    };
    if (query.startDate || query.endDate) {
      loadWhere.date = dateFilter;
    }

    const cashLoads = await this.prisma.load.findMany({
      where: loadWhere,
      select: {
        id: true,
        amount: true,
        date: true,
        siteId: true,
      },
      orderBy: { date: 'asc' },
    });

    // 2. Fetch Cash Drawer Expenses & Machine Advances (Outflows)
    const expenseWhere: any = {
      siteId: { in: allowedSiteIds },
      paymentMode: 'CASH_DRAWER',
      deletedAt: null,
    };
    if (query.startDate || query.endDate) {
      expenseWhere.date = dateFilter;
    }

    const cashExpenses = await this.prisma.expense.findMany({
      where: expenseWhere,
      include: {
        category: { select: { id: true, name: true } },
        machinery: { select: { id: true, name: true } },
        site: { select: { id: true, siteName: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregations
    let totalInflows = 0;
    let totalOutflows = 0;
    let machineryAdvancesTotal = 0;

    const timelineMap = new Map<
      string,
      {
        date: string;
        inflows: number;
        outflows: number;
        netCashflow: number;
        loadsCount: number;
        expensesCount: number;
      }
    >();

    const siteMap = new Map<
      string,
      {
        siteId: string;
        siteName: string;
        location: string;
        inflows: number;
        outflows: number;
        netCashflow: number;
      }
    >();

    for (const site of sites) {
      siteMap.set(site.id, {
        siteId: site.id,
        siteName: site.siteName,
        location: site.location,
        inflows: 0,
        outflows: 0,
        netCashflow: 0,
      });
    }

    // Process Inflows
    for (const load of cashLoads) {
      const amt = Number(load.amount);
      totalInflows += amt;

      const dateStr = new Date(load.date).toISOString().split('T')[0];
      if (!timelineMap.has(dateStr)) {
        timelineMap.set(dateStr, {
          date: dateStr,
          inflows: 0,
          outflows: 0,
          netCashflow: 0,
          loadsCount: 0,
          expensesCount: 0,
        });
      }
      const day = timelineMap.get(dateStr)!;
      day.inflows += amt;
      day.loadsCount += 1;
      day.netCashflow += amt;

      if (siteMap.has(load.siteId)) {
        const s = siteMap.get(load.siteId)!;
        s.inflows += amt;
        s.netCashflow += amt;
      }
    }

    // Process Outflows & Categories
    const categoryMap = new Map<
      string,
      { categoryId: string; categoryName: string; amount: number; count: number }
    >();

    for (const exp of cashExpenses) {
      const expAmt = Number(exp.amount);
      const advAmt = exp.advanceAmount ? Number(exp.advanceAmount) : 0;
      const totalExpOutflow = expAmt + advAmt;

      totalOutflows += totalExpOutflow;
      machineryAdvancesTotal += advAmt;

      const dateStr = new Date(exp.date).toISOString().split('T')[0];
      if (!timelineMap.has(dateStr)) {
        timelineMap.set(dateStr, {
          date: dateStr,
          inflows: 0,
          outflows: 0,
          netCashflow: 0,
          loadsCount: 0,
          expensesCount: 0,
        });
      }
      const day = timelineMap.get(dateStr)!;
      day.outflows += totalExpOutflow;
      day.expensesCount += 1;
      day.netCashflow -= totalExpOutflow;

      if (siteMap.has(exp.siteId)) {
        const s = siteMap.get(exp.siteId)!;
        s.outflows += totalExpOutflow;
        s.netCashflow -= totalExpOutflow;
      }

      const catId = exp.categoryId || 'uncategorized';
      const catName = exp.category?.name || (exp.machinery ? `Machinery: ${exp.machinery.name}` : 'General Expense');
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          categoryId: catId,
          categoryName: catName,
          amount: 0,
          count: 0,
        });
      }
      const cat = categoryMap.get(catId)!;
      cat.amount += totalExpOutflow;
      cat.count += 1;
    }

    const categoryBreakdown = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      percentage: totalOutflows > 0 ? Number(((c.amount / totalOutflows) * 100).toFixed(1)) : 0,
    }));

    const timeline = Array.from(timelineMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    const siteBreakdown = Array.from(siteMap.values());

    return {
      business,
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      summary: {
        totalInflows,
        totalOutflows,
        netCashflow: totalInflows - totalOutflows,
        cashLoadsCount: cashLoads.length,
        cashExpensesCount: cashExpenses.length,
        machineryAdvancesTotal,
      },
      categoryBreakdown,
      siteBreakdown,
      timeline,
    };
  }
}
