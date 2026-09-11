import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateShiftReconciliationDto } from './dto/create-shift-reconciliation.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { ApproveShiftDto } from './dto/approve-shift.dto';
import { buildDateRangeFilter } from '../common/utils/query-builder.util';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveEffectiveSiteId(user: AuthUser, requestedSiteId?: string): string {
    if (user.role === 'SITE_BOY') {
      if (!user.assignedSiteId) {
        throw new ForbiddenException('Site supervisor is not assigned to any quarry site');
      }
      return user.assignedSiteId;
    }

    if (requestedSiteId) {
      if (user.role === 'CO_PARTNER') {
        if (!user.assignedSiteIds || !user.assignedSiteIds.includes(requestedSiteId)) {
          throw new ForbiddenException('You do not have access to this quarry site');
        }
      }
      return requestedSiteId;
    }

    if (user.assignedSiteIds && user.assignedSiteIds.length > 0) {
      return user.assignedSiteIds[0];
    }

    throw new BadRequestException('No quarry site specified');
  }

  async getCurrentDrawer(user: AuthUser, requestedSiteId?: string, dateStr?: string) {
    const siteId = this.resolveEffectiveSiteId(user, requestedSiteId);
    const targetDateStr = dateStr || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`);

    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, siteName: true, location: true, userId: true },
    });

    if (!site) {
      throw new NotFoundException('Quarry site not found');
    }

    if (site.userId !== user.ownerId) {
      throw new ForbiddenException('You do not have access to this site');
    }

    // 1. Find previous shift's actualHandoverCash to use as openingCash
    const previousShift = await this.prisma.shiftReconciliation.findFirst({
      where: {
        siteId,
        date: { lt: targetDate },
      },
      orderBy: { date: 'desc' },
      select: { actualHandoverCash: true, date: true },
    });

    const openingCash = previousShift ? Number(previousShift.actualHandoverCash) : 0;

    // 2. Query cash loads (inflows) via PostgreSQL SQL aggregation
    const loadAgg = await this.prisma.load.aggregate({
      where: {
        siteId,
        date: targetDate,
        paymentType: 'CASH',
        deletedAt: null,
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const cashInflows = Number(loadAgg._sum?.amount || 0);
    const cashLoadsCount = Number(loadAgg._count?.id || 0);

    // 3. Query cash expenses & vendor credit advances (outflows) via PostgreSQL SQL aggregation
    const [cashDrawerAgg, creditAdvanceAgg] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          siteId,
          date: targetDate,
          paymentMode: 'CASH_DRAWER',
          deletedAt: null,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          siteId,
          date: targetDate,
          paymentMode: 'VENDOR_CREDIT',
          deletedAt: null,
        },
        _sum: { advanceAmount: true },
        _count: { id: true },
      }),
    ]);

    const generalExpensesOutflow = Number(cashDrawerAgg._sum?.amount || 0);
    const machineryAdvanceOutflow = Number(creditAdvanceAgg._sum?.advanceAmount || 0);
    const cashOutflows = generalExpensesOutflow + machineryAdvanceOutflow;
    const expensesCount = Number(cashDrawerAgg._count?.id || 0) + Number(creditAdvanceAgg._count?.id || 0);
    const expectedCash = openingCash + cashInflows - cashOutflows;

    // 4. Check if today's shift is already recorded / submitted
    const existingShift = await this.prisma.shiftReconciliation.findFirst({
      where: {
        siteId,
        date: targetDate,
      },
      include: {
        supervisor: { select: { id: true, name: true, mobile: true } },
        approvedBy: { select: { id: true, name: true, mobile: true } },
      },
    });

    return {
      siteId: site.id,
      siteName: site.siteName,
      location: site.location,
      date: targetDateStr,
      openingCash,
      cashInflows,
      cashLoadsCount,
      cashOutflows,
      generalExpensesOutflow,
      machineryAdvanceOutflow,
      expensesCount,
      expectedCash,
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
            createdAt: existingShift.createdAt,
            updatedAt: existingShift.updatedAt,
          }
        : null,
    };
  }

  async closeShift(user: AuthUser, dto: CreateShiftReconciliationDto) {
    const siteId = this.resolveEffectiveSiteId(user, dto.siteId);
    const targetDate = new Date(`${dto.date}T00:00:00.000Z`);

    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });
    if (!site || site.userId !== user.ownerId) {
      throw new ForbiddenException('Quarry site not accessible');
    }

    // Compute live expected values
    const drawer = await this.getCurrentDrawer(user, siteId, dto.date);

    const effectiveOpeningCash =
      dto.openingCash !== undefined ? Number(dto.openingCash) : drawer.openingCash;
    const expectedCash = effectiveOpeningCash + drawer.cashInflows - drawer.cashOutflows;
    const actualHandover = Number(dto.actualHandoverCash);
    const discrepancy = actualHandover - expectedCash;

    const shiftData = {
      siteId,
      supervisorUserId: user.id,
      date: targetDate,
      shiftType: dto.shiftType || 'DAY',
      openingCash: new Prisma.Decimal(effectiveOpeningCash),
      cashInflows: new Prisma.Decimal(drawer.cashInflows),
      cashOutflows: new Prisma.Decimal(drawer.cashOutflows),
      expectedCash: new Prisma.Decimal(expectedCash),
      actualHandoverCash: new Prisma.Decimal(actualHandover),
      discrepancy: new Prisma.Decimal(discrepancy),
      remarks: dto.remarks || null,
      isApproved: true,
    };

    if (drawer.existingShift) {
      return this.prisma.shiftReconciliation.update({
        where: { id: drawer.existingShift.id },
        data: shiftData,
        include: {
          site: true,
          supervisor: { select: { id: true, name: true, mobile: true } },
        },
      });
    }

    return this.prisma.shiftReconciliation.create({
      data: shiftData,
      include: {
        site: true,
        supervisor: { select: { id: true, name: true, mobile: true } },
      },
    });
  }

  async approveShift(user: AuthUser, shiftId: string, dto: ApproveShiftDto) {
    const shift = await this.prisma.shiftReconciliation.findUnique({
      where: { id: shiftId },
      include: { site: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift reconciliation record not found');
    }

    if (shift.site.userId !== user.ownerId) {
      throw new ForbiddenException('You do not have permission to approve shifts for this site');
    }

    return this.prisma.shiftReconciliation.update({
      where: { id: shiftId },
      data: {
        isApproved: true,
        approvedByUserId: user.id,
        remarks: dto.remarks ? `${shift.remarks ? shift.remarks + ' | ' : ''}${dto.remarks}` : shift.remarks,
      },
      include: {
        site: true,
        supervisor: { select: { id: true, name: true, mobile: true } },
        approvedBy: { select: { id: true, name: true, mobile: true } },
      },
    });
  }

  async reopenShift(user: AuthUser, shiftId: string) {
    const shift = await this.prisma.shiftReconciliation.findUnique({
      where: { id: shiftId },
      include: { site: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift reconciliation record not found');
    }

    if (shift.site.userId !== user.ownerId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You do not have permission to reopen shifts for this site');
    }

    await this.prisma.shiftReconciliation.delete({
      where: { id: shiftId },
    });

    return { message: 'Shift reopened successfully' };
  }

  async listShifts(user: AuthUser, query: QueryShiftsDto) {
    const where: Prisma.ShiftReconciliationWhereInput = {
      site: {
        userId: user.ownerId,
      },
    };

    if (user.role === 'SITE_BOY') {
      where.siteId = user.assignedSiteId || undefined;
    } else if (user.role === 'CO_PARTNER') {
      where.siteId = { in: user.assignedSiteIds || [] };
    }

    if (query.siteId) {
      if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
        if (!user.assignedSiteIds || !user.assignedSiteIds.includes(query.siteId)) {
          throw new ForbiddenException('You do not have access to shifts for this site');
        }
      }
      where.siteId = query.siteId;
    }

    const dateFilter = buildDateRangeFilter(query.startDate, query.endDate);
    if (dateFilter) {
      where.date = dateFilter;
    }

    if (query.isApproved !== undefined) {
      where.isApproved = query.isApproved;
    }

    return this.prisma.shiftReconciliation.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        site: { select: { id: true, siteName: true, location: true } },
        supervisor: { select: { id: true, name: true, mobile: true } },
        approvedBy: { select: { id: true, name: true, mobile: true } },
      },
    });
  }
}
