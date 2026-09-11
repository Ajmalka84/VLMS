import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { CreateContractorPaymentDto } from './dto/create-contractor-payment.dto';
import { QueryContractorPaymentsDto } from './dto/query-contractor-payments.dto';
import { QueryContractorLedgerDto } from './dto/query-contractor-ledger.dto';
import { MasterCacheService } from '../common/cache/master-cache.service';
import { PaymentMode } from '@prisma/client';

@Injectable()
export class ContractorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MasterCacheService,
  ) {}

  async create(userId: string, dto: CreateContractorDto) {
    const cleanMobile = dto.mobile?.trim() || '';
    const cleanName = dto.name.trim();

    if (cleanMobile) {
      const existing = await this.prisma.contractor.findFirst({
        where: {
          userId,
          mobile: cleanMobile,
        },
      });

      if (existing) {
        throw new ConflictException(
          `A contractor with mobile number "${cleanMobile}" already exists (${existing.name})`,
        );
      }
    }

    const created = await this.prisma.contractor.create({
      data: {
        userId,
        name: cleanName,
        mobile: cleanMobile,
      },
    });

    this.cacheService.invalidateTenant(userId);
    return created;
  }

  async findAll(userId: string) {
    const cacheKey = `contractors:${userId}`;
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const list = await this.prisma.contractor.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            loads: true,
          },
        },
      },
    });

    this.cacheService.set(cacheKey, list);
    return list;
  }

  async findOne(userId: string, id: string) {
    const contractor = await this.prisma.contractor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loads: true,
          },
        },
      },
    });

    if (!contractor) {
      throw new NotFoundException(`Contractor with ID "${id}" not found`);
    }

    if (contractor.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this contractor',
      );
    }

    return contractor;
  }

  async update(userId: string, id: string, dto: UpdateContractorDto) {
    const current = await this.findOne(userId, id);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.mobile !== undefined) {
      const cleanMobile = dto.mobile.trim();
      if (cleanMobile && cleanMobile !== current.mobile) {
        const existing = await this.prisma.contractor.findFirst({
          where: {
            userId,
            mobile: cleanMobile,
            id: { not: id },
          },
        });
        if (existing) {
          throw new ConflictException(
            `A contractor with mobile number "${cleanMobile}" already exists (${existing.name})`,
          );
        }
      }
      updateData.mobile = cleanMobile;
    }

    const updated = await this.prisma.contractor.update({
      where: { id },
      data: updateData,
    });

    this.cacheService.invalidateTenant(userId);
    return updated;
  }

  async remove(userId: string, id: string) {
    const contractor = await this.findOne(userId, id);

    const linkedLoadsCount = await this.prisma.load.count({
      where: { contractorId: id, deletedAt: null },
    });

    if (linkedLoadsCount > 0) {
      throw new BadRequestException(
        `Cannot delete contractor "${contractor.name}" because they have ${linkedLoadsCount} dispatch load(s) on record. Reassign or delete those load entries first.`,
      );
    }

    const linkedPaymentsCount = await this.prisma.contractorPayment.count({
      where: { contractorId: id, deletedAt: null },
    });

    if (linkedPaymentsCount > 0) {
      throw new BadRequestException(
        `Cannot delete contractor "${contractor.name}" because they have ${linkedPaymentsCount} payment collection record(s). Delete payments first.`,
      );
    }

    const deleted = await this.prisma.contractor.delete({
      where: { id },
    });

    this.cacheService.invalidateTenant(userId);
    return deleted;
  }

  // ==========================================
  // CONTRACTOR PAYMENTS (COLLECTIONS)
  // ==========================================

  async createPayment(
    ownerId: string,
    currentUserId: string,
    currentUserRole: string,
    dto: CreateContractorPaymentDto,
  ) {
    // 1. Verify Site belongs to tenant
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site || site.userId !== ownerId) {
      throw new NotFoundException(`Site with ID "${dto.siteId}" not found or unauthorized`);
    }

    // 2. Verify Contractor belongs to tenant
    const contractor = await this.prisma.contractor.findUnique({
      where: { id: dto.contractorId },
    });
    if (!contractor || contractor.userId !== ownerId) {
      throw new NotFoundException(`Contractor with ID "${dto.contractorId}" not found or unauthorized`);
    }

    // 3. Determine Collector User ID
    let collectedByUserId = dto.collectedByUserId || currentUserId;
    if (dto.collectedByUserId) {
      const collector = await this.prisma.user.findUnique({
        where: { id: dto.collectedByUserId },
      });
      if (!collector || (collector.id !== ownerId && collector.ownerId !== ownerId)) {
        throw new BadRequestException('Selected collector does not belong to this organization');
      }
      collectedByUserId = collector.id;
    }

    // 4. Create Payment
    const payment = await this.prisma.contractorPayment.create({
      data: {
        siteId: dto.siteId,
        contractorId: dto.contractorId,
        collectedByUserId,
        date: new Date(dto.date),
        amount: dto.amount,
        paymentMode: (dto.paymentMode as PaymentMode) || PaymentMode.CASH_DRAWER,
        transferMethod: dto.transferMethod?.trim() || null,
        referenceNumber: dto.referenceNumber?.trim() || null,
        remarks: dto.remarks?.trim() || null,
      },
      include: {
        site: { select: { id: true, siteName: true } },
        contractor: { select: { id: true, name: true, mobile: true } },
        collectedBy: { select: { id: true, name: true, mobile: true, role: true } },
      },
    });

    this.cacheService.invalidateTenant(ownerId);
    return payment;
  }

  async listPayments(ownerId: string, query: QueryContractorPaymentsDto) {
    const where: any = {
      site: { userId: ownerId },
      deletedAt: null,
    };

    if (query.siteId) where.siteId = query.siteId;
    if (query.contractorId) where.contractorId = query.contractorId;
    if (query.collectedByUserId) where.collectedByUserId = query.collectedByUserId;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [total, payments] = await Promise.all([
      this.prisma.contractorPayment.count({ where }),
      this.prisma.contractorPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          site: { select: { id: true, siteName: true } },
          contractor: { select: { id: true, name: true, mobile: true } },
          collectedBy: { select: { id: true, name: true, mobile: true, role: true } },
        },
      }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deletePayment(ownerId: string, id: string) {
    const payment = await this.prisma.contractorPayment.findUnique({
      where: { id },
      include: { site: true },
    });

    if (!payment || payment.site.userId !== ownerId || payment.deletedAt !== null) {
      throw new NotFoundException(`Payment record with ID "${id}" not found`);
    }

    await this.prisma.contractorPayment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.cacheService.invalidateTenant(ownerId);
    return { success: true, message: 'Payment record deleted successfully' };
  }

  // ==========================================
  // RUNNING PARTY LEDGER & BALANCES
  // ==========================================

  async getContractorLedger(
    ownerId: string,
    contractorId: string,
    query: QueryContractorLedgerDto,
  ) {
    const contractor = await this.findOne(ownerId, contractorId);

    if (query.siteId) {
      const site = await this.prisma.site.findUnique({ where: { id: query.siteId } });
      if (!site || site.userId !== ownerId) {
        throw new NotFoundException(`Site with ID "${query.siteId}" not found`);
      }
    }

    // 1. Calculate Opening Balance before startDate
    let openingBalance = 0;
    if (query.startDate) {
      const startDateObj = new Date(query.startDate);

      const priorLoads = await this.prisma.load.aggregate({
        where: {
          contractorId,
          paymentType: 'CREDIT',
          deletedAt: null,
          date: { lt: startDateObj },
          ...(query.siteId ? { siteId: query.siteId } : {}),
        },
        _sum: { amount: true },
      });

      const priorPayments = await this.prisma.contractorPayment.aggregate({
        where: {
          contractorId,
          deletedAt: null,
          date: { lt: startDateObj },
          ...(query.siteId ? { siteId: query.siteId } : {}),
        },
        _sum: { amount: true },
      });

      const priorDebit = Number(priorLoads._sum.amount || 0);
      const priorCredit = Number(priorPayments._sum.amount || 0);
      openingBalance = priorDebit - priorCredit;
    }

    // 2. Fetch Period Loads (Debits: Contractor took material on credit)
    const loadWhere: any = {
      contractorId,
      paymentType: 'CREDIT',
      deletedAt: null,
    };
    if (query.siteId) loadWhere.siteId = query.siteId;
    if (query.startDate || query.endDate) {
      loadWhere.date = {};
      if (query.startDate) loadWhere.date.gte = new Date(query.startDate);
      if (query.endDate) loadWhere.date.lte = new Date(query.endDate);
    }

    const periodLoads = await this.prisma.load.findMany({
      where: loadWhere,
      include: {
        vehicle: true,
        materialType: true,
        site: { select: { id: true, siteName: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    // 3. Fetch Period Payments (Credits: Contractor paid down balance)
    const paymentWhere: any = {
      contractorId,
      deletedAt: null,
    };
    if (query.siteId) paymentWhere.siteId = query.siteId;
    if (query.startDate || query.endDate) {
      paymentWhere.date = {};
      if (query.startDate) paymentWhere.date.gte = new Date(query.startDate);
      if (query.endDate) paymentWhere.date.lte = new Date(query.endDate);
    }

    const periodPayments = await this.prisma.contractorPayment.findMany({
      where: paymentWhere,
      include: {
        site: { select: { id: true, siteName: true } },
        collectedBy: { select: { id: true, name: true, mobile: true, role: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    // 4. Merge into unified chronological ledger entries
    const entries: Array<{
      id: string;
      date: string;
      rawDate: Date;
      type: 'LOAD' | 'PAYMENT';
      description: string;
      debit: number;
      credit: number;
      runningBalance: number;
      paymentMode: string;
      transferMethod: string | null;
      referenceNumber: string | null;
      collectedBy: { id: string; name: string | null; mobile: string; role: string } | null;
      remarks: string | null;
      site: { id: string; name: string };
      createdAt: Date;
    }> = [];

    for (const l of periodLoads) {
      entries.push({
        id: l.id,
        date: l.date.toISOString().split('T')[0],
        rawDate: l.date,
        type: 'LOAD',
        description: `${l.vehicle.vehicleNumber} - ${l.materialType.name}`,
        debit: Number(l.amount),
        credit: 0,
        runningBalance: 0,
        paymentMode: 'CREDIT',
        transferMethod: null,
        referenceNumber: null,
        collectedBy: null,
        remarks: l.remarks,
        site: { id: l.site.id, name: l.site.siteName },
        createdAt: l.createdAt,
      });
    }

    for (const p of periodPayments) {
      entries.push({
        id: p.id,
        date: p.date.toISOString().split('T')[0],
        rawDate: p.date,
        type: 'PAYMENT',
        description: `Payment Received (${p.paymentMode})`,
        debit: 0,
        credit: Number(p.amount),
        runningBalance: 0,
        paymentMode: p.paymentMode,
        transferMethod: p.transferMethod,
        referenceNumber: p.referenceNumber,
        collectedBy: p.collectedBy,
        remarks: p.remarks,
        site: { id: p.site.id, name: p.site.siteName },
        createdAt: p.createdAt,
      });
    }

    // Sort chronologically (date asc, createdAt asc)
    entries.sort((a, b) => {
      const timeDiff = a.rawDate.getTime() - b.rawDate.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // 5. Calculate Running Balance
    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      runningBalance = runningBalance + entry.debit - entry.credit;
      entry.runningBalance = Number(runningBalance.toFixed(2));
      totalDebit += entry.debit;
      totalCredit += entry.credit;
    }

    const closingBalance = Number(runningBalance.toFixed(2));

    return {
      contractor: {
        id: contractor.id,
        name: contractor.name,
        mobile: contractor.mobile,
      },
      siteId: query.siteId || null,
      startDate: query.startDate || null,
      endDate: query.endDate || null,
      openingBalance: Number(openingBalance.toFixed(2)),
      closingBalance,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      entries,
    };
  }

  async getContractorsSummary(ownerId: string, siteId?: string) {
    if (siteId) {
      const site = await this.prisma.site.findUnique({ where: { id: siteId } });
      if (!site || site.userId !== ownerId) {
        throw new NotFoundException(`Site with ID "${siteId}" not found`);
      }
    }

    const contractors = await this.prisma.contractor.findMany({
      where: { userId: ownerId },
      orderBy: { name: 'asc' },
    });

    // Aggregate loads by contractor
    const loadAggs = await this.prisma.load.groupBy({
      by: ['contractorId'],
      where: {
        site: { userId: ownerId },
        paymentType: 'CREDIT',
        deletedAt: null,
        ...(siteId ? { siteId } : {}),
      },
      _sum: { amount: true },
      _max: { date: true },
    });

    // Aggregate payments by contractor
    const paymentAggs = await this.prisma.contractorPayment.groupBy({
      by: ['contractorId'],
      where: {
        site: { userId: ownerId },
        deletedAt: null,
        ...(siteId ? { siteId } : {}),
      },
      _sum: { amount: true },
      _max: { date: true },
    });

    const loadMap = new Map<string, { total: number; lastDate: Date | null }>();
    for (const agg of loadAggs) {
      if (agg.contractorId) {
        loadMap.set(agg.contractorId, {
          total: Number(agg._sum.amount || 0),
          lastDate: agg._max.date,
        });
      }
    }

    const paymentMap = new Map<string, { total: number; lastDate: Date | null }>();
    for (const agg of paymentAggs) {
      if (agg.contractorId) {
        paymentMap.set(agg.contractorId, {
          total: Number(agg._sum.amount || 0),
          lastDate: agg._max.date,
        });
      }
    }

    let totalCreditBilled = 0;
    let totalCollected = 0;

    const summaryList = contractors.map((c) => {
      const l = loadMap.get(c.id) || { total: 0, lastDate: null };
      const p = paymentMap.get(c.id) || { total: 0, lastDate: null };

      const totalBilled = Number(l.total.toFixed(2));
      const totalPaid = Number(p.total.toFixed(2));
      const balanceDue = Number((totalBilled - totalPaid).toFixed(2));

      totalCreditBilled += totalBilled;
      totalCollected += totalPaid;

      return {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        totalBilled,
        totalPaid,
        balanceDue,
        lastLoadDate: l.lastDate ? l.lastDate.toISOString().split('T')[0] : null,
        lastPaymentDate: p.lastDate ? p.lastDate.toISOString().split('T')[0] : null,
      };
    });

    const totalBalanceDue = Number((totalCreditBilled - totalCollected).toFixed(2));

    return {
      totalCreditBilled: Number(totalCreditBilled.toFixed(2)),
      totalCollected: Number(totalCollected.toFixed(2)),
      totalBalanceDue,
      contractors: summaryList,
    };
  }
}
