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
            advancesDeducted: 0,
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

      // Query Loads and Expenses aggregates within overlap window via PostgreSQL SQL
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

    const advancesDeducted = 0; // mid-month partner drawings if tracked
    const netDividendPayable = grandGrossDividend - advancesDeducted;

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
        totalRevenue: grandRevenue,
        totalExpenses: grandExpenses,
        totalNetMargin: grandNetMargin,
        grossDividendPayable: grandGrossDividend,
        advancesDeducted,
        netDividendPayable,
      },
      slices,
    };
  }
}
