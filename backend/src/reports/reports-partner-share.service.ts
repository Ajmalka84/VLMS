import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryPartnerSettlementDto } from './dto/query-partner-settlement.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { resolveTargetUserId } from '../common/utils/query-builder.util';

@Injectable()
export class ReportsPartnerShareService {
  constructor(private readonly prisma: PrismaService) {}

  async getPartnerSettlement(user: AuthUser, query: QueryPartnerSettlementDto) {
    const targetUserId = await resolveTargetUserId(this.prisma, user, query.customerId);

    const business = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, businessName: true, mobile: true, gstin: true },
    });

    if (!business) {
      throw new NotFoundException('Business account not found');
    }

    // 1. Fetch available Co-Partners for this owner
    const allPartners = await this.prisma.user.findMany({
      where: {
        ownerId: targetUserId,
        role: 'CO_PARTNER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        partnerShares: {
          where: { isActive: true },
          include: { site: { select: { id: true, siteName: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Determine target partner
    let partnerId = query.partnerId;
    if (user.role === 'CO_PARTNER') {
      partnerId = user.id;
    } else if (!partnerId) {
      if (allPartners.length > 0) {
        partnerId = allPartners[0].id;
      } else {
        return {
          business,
          partnersList: [],
          selectedPartner: null,
          period: { startDate: query.startDate || null, endDate: query.endDate || null },
          summary: {
            totalRevenue: 0,
            totalExpenses: 0,
            totalNetMargin: 0,
            grossDividendPayable: 0,
            directExpensesFunded: 0,
            contractorPaymentsCollected: 0,
            advancesDeducted: 0,
            netCashRetained: 0,
            netDividendPayable: 0,
          },
          slices: [],
        };
      }
    }

    const selectedPartner = await this.prisma.user.findUnique({
      where: { id: partnerId },
      include: {
        partnerShares: {
          include: { site: { select: { id: true, siteName: true, location: true } } },
          orderBy: { effectiveFrom: 'asc' },
        },
      },
    });

    if (!selectedPartner || selectedPartner.ownerId !== targetUserId || selectedPartner.role !== 'CO_PARTNER') {
      throw new NotFoundException('Co-partner not found or does not belong to this business');
    }

    // Date range boundaries
    const reportStart = query.startDate ? new Date(`${query.startDate}T00:00:00.000Z`) : null;
    const reportEnd = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : null;

    const slices: Array<{
      siteId: string;
      siteName: string;
      location: string;
      sharePercentage: number;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      windowStart: string;
      windowEnd: string;
      revenue: number;
      expenses: number;
      netMargin: number;
      grossDividend: number;
      loadsCount: number;
      expensesCount: number;
      isActive: boolean;
    }> = [];

    let grandRevenue = 0;
    let grandExpenses = 0;
    let grandNetMargin = 0;
    let grandGrossDividend = 0;

    for (const share of selectedPartner.partnerShares) {
      if (query.siteId && share.siteId !== query.siteId) {
        continue;
      }

      const sliceStart = new Date(share.effectiveFrom);
      const sliceEnd = share.effectiveTo ? new Date(share.effectiveTo) : new Date('9999-12-31T23:59:59.999Z');

      // Calculate overlap with report period
      const overlapStart = reportStart ? (sliceStart > reportStart ? sliceStart : reportStart) : sliceStart;
      const overlapEnd = reportEnd ? (sliceEnd < reportEnd ? sliceEnd : reportEnd) : sliceEnd;

      if (overlapStart > overlapEnd) {
        continue; // No overlap
      }

      // Query Loads and Expenses aggregates within overlap window
      const [loadAgg, expenseAgg] = await Promise.all([
        this.prisma.load.aggregate({
          where: {
            siteId: share.siteId,
            date: { gte: overlapStart, lte: overlapEnd },
            deletedAt: null,
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            siteId: share.siteId,
            date: { gte: overlapStart, lte: overlapEnd },
            deletedAt: null,
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      const sliceRevenue = Number(loadAgg._sum?.amount || 0);
      const sliceExpenses = Number(expenseAgg._sum?.amount || 0);
      const sliceNetMargin = sliceRevenue - sliceExpenses;
      const pct = Number(share.sharePercentage);
      const sliceGrossDividend = Number(((sliceNetMargin * pct) / 100).toFixed(2));
      const loadsCount = Number(loadAgg._count?.id || 0);
      const expensesCount = Number(expenseAgg._count?.id || 0);

      grandRevenue += sliceRevenue;
      grandExpenses += sliceExpenses;
      grandNetMargin += sliceNetMargin;
      grandGrossDividend += sliceGrossDividend;

      slices.push({
        siteId: share.siteId,
        siteName: share.site.siteName,
        location: share.site.location,
        sharePercentage: pct,
        effectiveFrom: share.effectiveFrom,
        effectiveTo: share.effectiveTo,
        windowStart: overlapStart.toISOString().split('T')[0],
        windowEnd: overlapEnd.getFullYear() === 9999 ? (query.endDate || new Date().toISOString().split('T')[0]) : overlapEnd.toISOString().split('T')[0],
        revenue: sliceRevenue,
        expenses: sliceExpenses,
        netMargin: sliceNetMargin,
        grossDividend: sliceGrossDividend,
        loadsCount,
        expensesCount,
        isActive: share.isActive,
      });
    }

    // Hurdle 15: Partner Direct Funding & Collections
    const [fundedExpensesAgg, collectionsAgg, payoutsAgg] = await Promise.all([
      // Direct expenses funded by this partner from personal account
      this.prisma.expense.aggregate({
        where: {
          site: { userId: targetUserId },
          ...(query.siteId ? { siteId: query.siteId } : {}),
          payerPartnerUserId: partnerId,
          ...(reportStart || reportEnd ? { date: { ...(reportStart ? { gte: reportStart } : {}), ...(reportEnd ? { lte: reportEnd } : {}) } } : {}),
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      // Contractor payments collected directly into partner's personal account
      this.prisma.contractorPayment.aggregate({
        where: {
          site: { userId: targetUserId },
          ...(query.siteId ? { siteId: query.siteId } : {}),
          collectedByUserId: partnerId,
          paymentMode: { in: ['CO_PARTNER_DIRECT', 'OWNER_DIRECT'] },
          ...(reportStart || reportEnd ? { date: { ...(reportStart ? { gte: reportStart } : {}), ...(reportEnd ? { lte: reportEnd } : {}) } } : {}),
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      // Drawings / Payouts taken by this partner
      this.prisma.partnerPayout.aggregate({
        where: {
          site: { userId: targetUserId },
          ...(query.siteId ? { siteId: query.siteId } : {}),
          partnerUserId: partnerId,
          ...(reportStart || reportEnd ? { date: { ...(reportStart ? { gte: reportStart } : {}), ...(reportEnd ? { lte: reportEnd } : {}) } } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const directExpensesFunded = Number(fundedExpensesAgg._sum?.amount || 0);
    const contractorPaymentsCollected = Number(collectionsAgg._sum?.amount || 0);
    const advancesDeducted = Number(payoutsAgg._sum?.amount || 0);
    const netCashRetained = contractorPaymentsCollected + advancesDeducted;

    // Net settlement = Gross dividend + funded expenses - cash retained
    const netDividendPayable = Number((grandGrossDividend + directExpensesFunded - netCashRetained).toFixed(2));

    return {
      business,
      partnersList: allPartners.map((p) => ({
        id: p.id,
        name: p.name || p.mobile,
        mobile: p.mobile,
        sites: p.partnerShares.map((ps) => ps.site.siteName),
      })),
      selectedPartner: {
        id: selectedPartner.id,
        name: selectedPartner.name || selectedPartner.mobile,
        mobile: selectedPartner.mobile,
      },
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      summary: {
        totalRevenue: Number(grandRevenue.toFixed(2)),
        totalExpenses: Number(grandExpenses.toFixed(2)),
        totalNetMargin: Number(grandNetMargin.toFixed(2)),
        grossDividendPayable: Number(grandGrossDividend.toFixed(2)),
        directExpensesFunded: Number(directExpensesFunded.toFixed(2)),
        contractorPaymentsCollected: Number(contractorPaymentsCollected.toFixed(2)),
        advancesDeducted: Number(advancesDeducted.toFixed(2)),
        netCashRetained: Number(netCashRetained.toFixed(2)),
        netDividendPayable,
      },
      slices,
    };
  }

  // ==========================================
  // MULTI-PARTNER REBALANCING ENGINE (HURDLE 15)
  // ==========================================

  async getMultiPartnerRebalanceReport(user: AuthUser, query: QueryPartnerSettlementDto) {
    const targetUserId = await resolveTargetUserId(this.prisma, user, query.customerId);

    const business = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, businessName: true, mobile: true, gstin: true },
    });

    if (!business) {
      throw new NotFoundException('Business account not found');
    }

    // Resolve site
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

    // 1. Calculate Site Operations & Financial Totals
    const [loadAgg, expenseAgg, spotCashLoadsAgg, cashExpensesAgg] = await Promise.all([
      this.prisma.load.aggregate({
        where: {
          ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.load.aggregate({
        where: {
          ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
          paymentType: 'CASH',
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
          paymentMode: 'CASH_DRAWER',
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(loadAgg._sum?.amount || 0);
    const totalExpenses = Number(expenseAgg._sum?.amount || 0);
    const netProfit = totalRevenue - totalExpenses;
    const spotCashRevenue = Number(spotCashLoadsAgg._sum?.amount || 0);
    const cashDrawerExpenses = Number(cashExpensesAgg._sum?.amount || 0);
    const cashDrawerBalance = spotCashRevenue - cashDrawerExpenses;

    // 2. Fetch Active Co-Partners on this site
    const coPartners = await this.prisma.user.findMany({
      where: {
        ownerId: targetUserId,
        role: 'CO_PARTNER',
        isActive: true,
        ...(site
          ? { partnerShares: { some: { siteId: site.id, isActive: true } } }
          : { partnerShares: { some: { isActive: true } } }),
      },
      include: {
        partnerShares: {
          where: {
            isActive: true,
            ...(site ? { siteId: site.id } : {}),
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate Partner Shares
    let coPartnerTotalShare = 0;
    const partnerMetrics: Array<{
      partner: { id: string; name: string; mobile: string; role: string };
      sharePercentage: number;
      equityDividend: number;
      directExpensesFunded: number;
      contractorPaymentsCollected: number;
      drawingsDrawn: number;
      netCashHeld: number;
      closingBalance: number;
      status: 'CREDITOR' | 'DEBTOR' | 'SETTLED';
    }> = [];

    for (const cp of coPartners) {
      const sharePct = cp.partnerShares.reduce((sum, s) => sum + Number(s.sharePercentage), 0);
      coPartnerTotalShare += sharePct;

      const [cpExpenses, cpCollections, cpPayouts] = await Promise.all([
        this.prisma.expense.aggregate({
          where: {
            ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
            payerPartnerUserId: cp.id,
            deletedAt: null,
            ...(reportStart || reportEnd ? { date: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
        this.prisma.contractorPayment.aggregate({
          where: {
            ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
            collectedByUserId: cp.id,
            paymentMode: { in: ['CO_PARTNER_DIRECT', 'OWNER_DIRECT'] },
            deletedAt: null,
            ...(reportStart || reportEnd ? { date: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
        this.prisma.partnerPayout.aggregate({
          where: {
            ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
            partnerUserId: cp.id,
            ...(reportStart || reportEnd ? { date: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
      ]);

      const equityDividend = Number(((netProfit * sharePct) / 100).toFixed(2));
      const directExpensesFunded = Number(cpExpenses._sum?.amount || 0);
      const contractorPaymentsCollected = Number(cpCollections._sum?.amount || 0);
      const drawingsDrawn = Number(cpPayouts._sum?.amount || 0);
      const netCashHeld = contractorPaymentsCollected + drawingsDrawn;
      const closingBalance = Number((equityDividend + directExpensesFunded - netCashHeld).toFixed(2));

      partnerMetrics.push({
        partner: {
          id: cp.id,
          name: cp.name || cp.mobile,
          mobile: cp.mobile,
          role: 'CO_PARTNER',
        },
        sharePercentage: Number(sharePct.toFixed(2)),
        equityDividend,
        directExpensesFunded,
        contractorPaymentsCollected,
        drawingsDrawn,
        netCashHeld,
        closingBalance,
        status: closingBalance > 0.01 ? 'CREDITOR' : closingBalance < -0.01 ? 'DEBTOR' : 'SETTLED',
      });
    }

    // Owner Equity Share (Remaining balance up to 100%)
    const ownerSharePct = Math.max(0, 100 - coPartnerTotalShare);
    const [ownerExpenses, ownerCollections, ownerPayouts] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
          OR: [
            { payerPartnerUserId: targetUserId },
            { paymentMode: 'OWNER_DIRECT' },
          ],
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.contractorPayment.aggregate({
        where: {
          ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
          collectedByUserId: targetUserId,
          paymentMode: { in: ['OWNER_DIRECT', 'CO_PARTNER_DIRECT'] },
          deletedAt: null,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.partnerPayout.aggregate({
        where: {
          ...(site ? { siteId: site.id } : { site: { userId: targetUserId } }),
          partnerUserId: targetUserId,
          ...(reportStart || reportEnd ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const ownerEquityDividend = Number(((netProfit * ownerSharePct) / 100).toFixed(2));
    const ownerDirectExpenses = Number(ownerExpenses._sum?.amount || 0);
    const ownerCollectionsAmt = Number(ownerCollections._sum?.amount || 0);
    const ownerDrawingsAmt = Number(ownerPayouts._sum?.amount || 0);
    const ownerNetCashHeld = ownerCollectionsAmt + ownerDrawingsAmt;
    const ownerClosingBalance = Number((ownerEquityDividend + ownerDirectExpenses - ownerNetCashHeld).toFixed(2));

    const allPartnerMetrics = [
      {
        partner: {
          id: business.id,
          name: `${business.name || business.businessName} (Owner)`,
          mobile: business.mobile,
          role: 'OWNER',
        },
        sharePercentage: Number(ownerSharePct.toFixed(2)),
        equityDividend: ownerEquityDividend,
        directExpensesFunded: ownerDirectExpenses,
        contractorPaymentsCollected: ownerCollectionsAmt,
        drawingsDrawn: ownerDrawingsAmt,
        netCashHeld: ownerNetCashHeld,
        closingBalance: ownerClosingBalance,
        status: (ownerClosingBalance > 0.01 ? 'CREDITOR' : ownerClosingBalance < -0.01 ? 'DEBTOR' : 'SETTLED') as 'CREDITOR' | 'DEBTOR' | 'SETTLED',
      },
      ...partnerMetrics,
    ];

    // 3. Compute Minimal Peer-to-Peer Inter-Account Transfers
    const debtors = allPartnerMetrics
      .filter((p) => p.closingBalance < -0.01)
      .map((p) => ({ ...p, remainingBalance: Math.abs(p.closingBalance) }));

    const creditors = allPartnerMetrics
      .filter((p) => p.closingBalance > 0.01)
      .map((p) => ({ ...p, remainingBalance: p.closingBalance }));

    const rebalanceTransfers: Array<{
      fromPartner: { id: string; name: string; mobile: string; role: string };
      toPartner: { id: string; name: string; mobile: string; role: string };
      amount: number;
      reason: string;
    }> = [];

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const settleAmt = Math.min(debtor.remainingBalance, creditor.remainingBalance);
      if (settleAmt > 0.01) {
        rebalanceTransfers.push({
          fromPartner: debtor.partner,
          toPartner: creditor.partner,
          amount: Number(settleAmt.toFixed(2)),
          reason: 'Inter-account profit dividend & personal direct funding equalisation',
        });

        debtor.remainingBalance = Number((debtor.remainingBalance - settleAmt).toFixed(2));
        creditor.remainingBalance = Number((creditor.remainingBalance - settleAmt).toFixed(2));
      }

      if (debtor.remainingBalance <= 0.01) dIdx++;
      if (creditor.remainingBalance <= 0.01) cIdx++;
    }

    return {
      business,
      site: site ? { id: site.id, siteName: site.siteName, location: site.location } : null,
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      siteSummary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        spotCashRevenue: Number(spotCashRevenue.toFixed(2)),
        cashDrawerExpenses: Number(cashDrawerExpenses.toFixed(2)),
        cashDrawerBalance: Number(cashDrawerBalance.toFixed(2)),
      },
      partners: allPartnerMetrics,
      rebalanceTransfers,
    };
  }
}
