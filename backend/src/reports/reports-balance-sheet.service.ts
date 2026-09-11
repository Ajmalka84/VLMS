import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { resolveTargetUserId } from '../common/utils/query-builder.util';
import { QueryCashflowDto } from './dto/query-cashflow.dto';

@Injectable()
export class ReportsBalanceSheetService {
  constructor(private readonly prisma: PrismaService) {}

  async getSiteBalanceSheet(user: AuthUser, query: QueryCashflowDto) {
    const targetUserId = await resolveTargetUserId(this.prisma, user, query.customerId);

    const business = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, businessName: true, mobile: true, gstin: true },
    });

    if (!business) {
      throw new NotFoundException('Business account not found');
    }

    // Resolve Site
    let site: { id: string; siteName: string; location: string } | null = null;
    if (query.siteId) {
      site = await this.prisma.site.findUnique({
        where: { id: query.siteId },
        select: { id: true, siteName: true, location: true },
      });
      if (!site) throw new NotFoundException('Site not found');
    } else {
      const firstSite = await this.prisma.site.findFirst({
        where: { userId: targetUserId, isActive: true },
        select: { id: true, siteName: true, location: true },
      });
      if (firstSite) site = firstSite;
    }

    const reportStart = query.startDate ? new Date(`${query.startDate}T00:00:00.000Z`) : null;
    const reportEnd = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : null;

    const dateFilter: any = {};
    if (reportStart) dateFilter.gte = reportStart;
    if (reportEnd) dateFilter.lte = reportEnd;

    const siteWhere = site ? { siteId: site.id } : { site: { userId: targetUserId } };

    // ==========================================
    // 1. RAW DATA AGGREGATIONS
    // ==========================================
    const [
      spotCashLoadsAgg,
      creditLoadsAgg,
      totalRevenueAgg,
      allExpenses,
      allContractorPayments,
      allPartnerPayouts,
      activeContractorsCount,
      allMachinery,
    ] = await Promise.all([
      // Spot Cash Inflows
      this.prisma.load.aggregate({
        where: {
          ...siteWhere,
          paymentType: 'CASH',
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Credit Inflows
      this.prisma.load.aggregate({
        where: {
          ...siteWhere,
          paymentType: 'CREDIT',
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Total Revenue
      this.prisma.load.aggregate({
        where: {
          ...siteWhere,
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // All Active Expenses with detailed mode, amount, and advanceAmount
      this.prisma.expense.findMany({
        where: {
          ...siteWhere,
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        select: {
          id: true,
          amount: true,
          advanceAmount: true,
          paymentMode: true,
          machineryId: true,
        },
      }),
      // All Active Contractor Payments
      this.prisma.contractorPayment.findMany({
        where: {
          ...siteWhere,
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        select: {
          id: true,
          amount: true,
          paymentMode: true,
        },
      }),
      // All Partner Payouts / Drawings
      this.prisma.partnerPayout.findMany({
        where: {
          ...siteWhere,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        select: {
          id: true,
          amount: true,
          paymentMode: true,
        },
      }),
      // Contractor count
      this.prisma.contractor.count({
        where: { userId: targetUserId },
      }),
      // Heavy Machinery inventory
      this.prisma.machinery.findMany({
        where: { userId: targetUserId, isActive: true },
        select: { id: true, name: true, code: true, vendorName: true, defaultRentPerHour: true },
      }),
    ]);

    // ==========================================
    // 2. REVENUE & CONTRACTOR POSITION
    // ==========================================
    const spotCashRevenue = Number(spotCashLoadsAgg._sum?.amount || 0);
    const totalCreditBilled = Number(creditLoadsAgg._sum?.amount || 0);
    const totalRevenue = Number(totalRevenueAgg._sum?.amount || 0);

    let drawerContractorPayments = 0;
    let directContractorPayments = 0;
    for (const p of allContractorPayments) {
      const amt = Number(p.amount);
      if (p.paymentMode === 'CASH_DRAWER') {
        drawerContractorPayments += amt;
      } else {
        directContractorPayments += amt;
      }
    }
    const totalPaymentsReceived = drawerContractorPayments + directContractorPayments;

    const netContractorPosition = Number((totalCreditBilled - totalPaymentsReceived).toFixed(2));
    const accountsReceivable = netContractorPosition >= 0 ? netContractorPosition : 0;
    const customerAdvancesLiability = netContractorPosition < 0 ? Math.abs(netContractorPosition) : 0;

    // ==========================================
    // 3. EXPENSES PARTITION & LIABILITIES
    // ==========================================
    let totalExpenses = 0;
    let expenseDrawerCashOutflow = 0;
    let totalDirectExpensesFunded = 0;
    let vendorPayables = 0;

    for (const exp of allExpenses) {
      const grossAmt = Number(exp.amount);
      const advAmt = exp.advanceAmount != null ? Number(exp.advanceAmount) : null;
      totalExpenses += grossAmt;

      if (exp.machineryId) {
        // Heavy Machinery Rental Entry
        const advancePaid = advAmt != null ? advAmt : (exp.paymentMode === 'VENDOR_CREDIT' ? 0 : grossAmt);
        const unpaidRent = Math.max(0, grossAmt - advancePaid);
        vendorPayables += unpaidRent;

        if (advancePaid > 0) {
          if (exp.paymentMode === 'CASH_DRAWER') {
            expenseDrawerCashOutflow += advancePaid;
          } else if (['CO_PARTNER_DIRECT', 'OWNER_DIRECT'].includes(exp.paymentMode)) {
            totalDirectExpensesFunded += advancePaid;
          } else {
            vendorPayables += advancePaid;
          }
        }
      } else {
        // General Operational Expense
        if (exp.paymentMode === 'CASH_DRAWER') {
          expenseDrawerCashOutflow += grossAmt;
        } else if (['CO_PARTNER_DIRECT', 'OWNER_DIRECT'].includes(exp.paymentMode)) {
          totalDirectExpensesFunded += grossAmt;
        } else if (exp.paymentMode === 'VENDOR_CREDIT') {
          vendorPayables += grossAmt;
        } else {
          totalDirectExpensesFunded += grossAmt;
        }
      }
    }

    // ==========================================
    // 4. DRAWINGS & CASH IN HAND
    // ==========================================
    let drawerDrawings = 0;
    let totalDrawingsDrawn = 0;
    for (const d of allPartnerPayouts) {
      const amt = Number(d.amount);
      totalDrawingsDrawn += amt;
      if (d.paymentMode === 'CASH_DRAWER') {
        drawerDrawings += amt;
      }
    }

    const cashInHand = Number(
      (spotCashRevenue + drawerContractorPayments - expenseDrawerCashOutflow - drawerDrawings).toFixed(2),
    );

    const totalCurrentAssets = Number((cashInHand + accountsReceivable).toFixed(2));
    const totalFixedAssets = 0;
    const totalAssets = Number((totalCurrentAssets + totalFixedAssets).toFixed(2));

    const accruedOverheads = 0;
    const totalCurrentLiabilities = Number(
      (vendorPayables + customerAdvancesLiability + accruedOverheads).toFixed(2),
    );
    const totalLiabilities = totalCurrentLiabilities;

    // ==========================================
    // 5. PARTNER EQUITY & RETAINED EARNINGS
    // ==========================================
    const cumulativeNetProfit = Number((totalRevenue - totalExpenses).toFixed(2));
    const totalDirectCollectionsRetained = Number(directContractorPayments.toFixed(2));

    const retainedEarnings = Number(
      (cumulativeNetProfit + totalDirectExpensesFunded - totalDirectCollectionsRetained - totalDrawingsDrawn).toFixed(2),
    );
    const totalPartnerEquity = retainedEarnings;
    const totalLiabilitiesAndEquity = Number((totalLiabilities + totalPartnerEquity).toFixed(2));

    const balanceVariance = Number((totalAssets - totalLiabilitiesAndEquity).toFixed(2));
    const isBalanced = Math.abs(balanceVariance) < 0.05;

    // ==========================================
    // 6. FINANCIAL HEALTH & SOLVENCY METRICS
    // ==========================================
    const netWorkingCapital = Number((totalCurrentAssets - totalCurrentLiabilities).toFixed(2));
    const currentRatio = totalCurrentLiabilities > 0
      ? Number((totalCurrentAssets / totalCurrentLiabilities).toFixed(2))
      : totalCurrentAssets !== 0 ? 1.0 : 1.0;
    const quickRatio = totalCurrentLiabilities > 0
      ? Number((cashInHand / totalCurrentLiabilities).toFixed(2))
      : 1.0;
    const receivablesExposurePct = totalCurrentAssets !== 0
      ? Number(((accountsReceivable / Math.abs(totalCurrentAssets)) * 100).toFixed(1))
      : 0;

    const totalLoadsCount = Number(totalRevenueAgg._count?.id || 0);
    const cashLoadsCount = Number(spotCashLoadsAgg._count?.id || 0);
    const creditLoadsCount = Number(creditLoadsAgg._count?.id || 0);

    return {
      business,
      site: site ? { id: site.id, siteName: site.siteName, location: site.location } : null,
      asOfDate: query.endDate || new Date().toISOString().split('T')[0],
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      balanceSheet: {
        assets: {
          currentAssets: {
            cashInHand,
            accountsReceivable,
            total: totalCurrentAssets,
          },
          fixedAssets: {
            equipmentAndMachinery: totalFixedAssets,
            total: totalFixedAssets,
          },
          totalAssets,
        },
        liabilities: {
          currentLiabilities: {
            vendorMachineryPayables: Number(vendorPayables.toFixed(2)),
            customerAdvances: Number(customerAdvancesLiability.toFixed(2)),
            accruedOverheads,
            total: totalCurrentLiabilities,
          },
          totalLiabilities,
        },
        equity: {
          cumulativeNetProfit,
          totalDirectExpensesFunded: Number(totalDirectExpensesFunded.toFixed(2)),
          totalDirectCollectionsRetained,
          totalDrawingsDrawn,
          retainedEarnings,
          totalPartnerEquity,
        },
        totalLiabilitiesAndEquity,
        balanceVariance,
        isBalanced,
      },
      financialHealth: {
        netWorkingCapital,
        currentRatio,
        quickRatio,
        receivablesExposurePct,
        revenueMix: {
          totalRevenue,
          spotCashRevenue,
          creditRevenue: totalCreditBilled,
          cashLoadsCount,
          creditLoadsCount,
          totalLoadsCount,
        },
        activeContractorsCount,
        activeMachineryCount: allMachinery.length,
      },
    };
  }
}
