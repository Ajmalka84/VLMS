import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuerySettlementDto } from './dto/query-settlement.dto';
import { QueryContractorSummaryDto } from './dto/query-contractor-summary.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getContractorsSummary(user: AuthUser, query: QueryContractorSummaryDto) {
    let targetUserId = user.id;

    // Super Admin support: allow querying specific customer
    if (user.role === 'SUPER_ADMIN') {
      if (query.customerId) {
        targetUserId = query.customerId;
      } else {
        // Find first active customer to provide a populated default
        const firstCust = await this.prisma.user.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        if (firstCust) {
          targetUserId = firstCust.id;
        }
      }
    }

    // 1. Fetch tenant contractors
    const contractorWhere: any = { userId: targetUserId };
    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      contractorWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
      ];
    }

    const contractors = await this.prisma.contractor.findMany({
      where: contractorWhere,
      orderBy: { name: 'asc' },
    });

    // 2. Fetch matching loads for the period
    const loadWhere: any = {
      site: { userId: targetUserId },
      deletedAt: null,
    };

    if (query.siteId) {
      loadWhere.siteId = query.siteId;
    }

    if (query.startDate || query.endDate) {
      loadWhere.date = {};
      if (query.startDate) {
        loadWhere.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        loadWhere.date.lte = end;
      }
    }

    const loads = await this.prisma.load.findMany({
      where: loadWhere,
      select: {
        contractorId: true,
        amount: true,
        paymentType: true,
        date: true,
      },
      orderBy: { date: 'desc' },
    });

    // 3. Map loads to contractor aggregation map
    const contractorMap = new Map<
      string,
      {
        totalTrips: number;
        totalAmount: number;
        cashTrips: number;
        cashAmount: number;
        creditTrips: number;
        creditAmount: number;
        lastTripDate: string | null;
      }
    >();

    for (const c of contractors) {
      contractorMap.set(c.id, {
        totalTrips: 0,
        totalAmount: 0,
        cashTrips: 0,
        cashAmount: 0,
        creditTrips: 0,
        creditAmount: 0,
        lastTripDate: null,
      });
    }

    let grandTotalTrips = 0;
    let grandTotalAmount = 0;
    let grandCashAmount = 0;
    let grandCreditAmount = 0;

    for (const load of loads) {
      const stats = contractorMap.get(load.contractorId);
      if (!stats) continue;

      const amt = Number(load.amount);
      stats.totalTrips += 1;
      stats.totalAmount += amt;

      grandTotalTrips += 1;
      grandTotalAmount += amt;

      if (load.paymentType === 'CASH') {
        stats.cashTrips += 1;
        stats.cashAmount += amt;
        grandCashAmount += amt;
      } else {
        stats.creditTrips += 1;
        stats.creditAmount += amt;
        grandCreditAmount += amt;
      }

      if (!stats.lastTripDate) {
        stats.lastTripDate = load.date.toISOString();
      }
    }

    const summaries = contractors.map((c) => {
      const stats = contractorMap.get(c.id)!;
      return {
        contractor: {
          id: c.id,
          name: c.name,
          mobile: c.mobile,
          createdAt: c.createdAt,
        },
        stats,
      };
    });

    // Fetch tenant customer profile if Super Admin
    let customerInfo = null;
    if (user.role === 'SUPER_ADMIN') {
      customerInfo = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, businessName: true, mobile: true },
      });
    }

    return {
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      customer: customerInfo,
      grandTotal: {
        contractorCount: contractors.length,
        totalTrips: grandTotalTrips,
        totalAmount: grandTotalAmount,
        cashAmount: grandCashAmount,
        creditAmount: grandCreditAmount,
      },
      contractors: summaries,
    };
  }

  async getSettlementStatement(user: AuthUser, query: QuerySettlementDto) {
    // 1. Verify contractor exists
    const contractor = await this.prisma.contractor.findUnique({
      where: { id: query.contractorId },
    });
    if (!contractor) {
      throw new NotFoundException(`Contractor with ID "${query.contractorId}" not found`);
    }

    // Tenant permission check (Super Admin can access any tenant's contractor)
    if (user.role !== 'SUPER_ADMIN' && contractor.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this contractor');
    }

    const targetUserId = contractor.userId;

    // 2. Build load query condition
    const where: any = {
      contractorId: query.contractorId,
      site: { userId: targetUserId },
      deletedAt: null,
    };

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (query.paymentType) {
      where.paymentType = query.paymentType;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // 3. Fetch loads with relations
    const [loads, quarryOwner] = await Promise.all([
      this.prisma.load.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          site: true,
          vehicle: {
            include: {
              vehicleType: true,
            },
          },
          materialType: true,
          rate: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, businessName: true, mobile: true, gstin: true },
      }),
    ]);

    // 4. Calculate overall financial summary
    let totalTrips = 0;
    let totalAmount = 0;
    let cashTrips = 0;
    let cashAmount = 0;
    let creditTrips = 0;
    let creditAmount = 0;

    const materialMap = new Map<
      string,
      { materialName: string; tripCount: number; totalAmount: number }
    >();
    const vehicleMap = new Map<
      string,
      { vehicleNumber: string; vehicleType: string; tripCount: number; totalAmount: number }
    >();
    const siteMap = new Map<
      string,
      { siteName: string; location: string; tripCount: number; totalAmount: number }
    >();

    for (const load of loads) {
      const amt = Number(load.amount);
      totalTrips += 1;
      totalAmount += amt;

      if (load.paymentType === 'CASH') {
        cashTrips += 1;
        cashAmount += amt;
      } else {
        creditTrips += 1;
        creditAmount += amt;
      }

      // Material Breakdown
      const matKey = load.materialTypeId;
      const mat = materialMap.get(matKey) || {
        materialName: load.materialType.name,
        tripCount: 0,
        totalAmount: 0,
      };
      mat.tripCount += 1;
      mat.totalAmount += amt;
      materialMap.set(matKey, mat);

      // Vehicle Breakdown
      const vehKey = load.vehicleId;
      const veh = vehicleMap.get(vehKey) || {
        vehicleNumber: load.vehicle.vehicleNumber,
        vehicleType: load.vehicle.vehicleType.name,
        tripCount: 0,
        totalAmount: 0,
      };
      veh.tripCount += 1;
      veh.totalAmount += amt;
      vehicleMap.set(vehKey, veh);

      // Site Breakdown
      const sKey = load.siteId;
      const st = siteMap.get(sKey) || {
        siteName: load.site.siteName,
        location: load.site.location,
        tripCount: 0,
        totalAmount: 0,
      };
      st.tripCount += 1;
      st.totalAmount += amt;
      siteMap.set(sKey, st);
    }

    const materialBreakdown = Array.from(materialMap.entries()).map(([id, data]) => ({
      materialTypeId: id,
      materialName: data.materialName,
      tripCount: data.tripCount,
      totalAmount: data.totalAmount,
      percentage: totalAmount > 0 ? Number(((data.totalAmount / totalAmount) * 100).toFixed(1)) : 0,
    }));

    const vehicleBreakdown = Array.from(vehicleMap.entries()).map(([id, data]) => ({
      vehicleId: id,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType,
      tripCount: data.tripCount,
      totalAmount: data.totalAmount,
    }));

    const siteBreakdown = Array.from(siteMap.entries()).map(([id, data]) => ({
      siteId: id,
      siteName: data.siteName,
      location: data.location,
      tripCount: data.tripCount,
      totalAmount: data.totalAmount,
    }));

    return {
      business: quarryOwner,
      contractor: {
        id: contractor.id,
        name: contractor.name,
        mobile: contractor.mobile,
      },
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      summary: {
        totalTrips,
        totalAmount,
        cashTrips,
        cashAmount,
        creditTrips,
        creditAmount, // Net settlement / payable amount
      },
      materialBreakdown,
      vehicleBreakdown,
      siteBreakdown,
      trips: loads.map((l) => ({
        id: l.id,
        date: l.date,
        createdAt: l.createdAt,
        vehicleNumber: l.vehicle.vehicleNumber,
        vehicleType: l.vehicle.vehicleType.name,
        materialName: l.materialType.name,
        siteName: l.site.siteName,
        paymentType: l.paymentType,
        amount: Number(l.amount),
      })),
    };
  }
}
