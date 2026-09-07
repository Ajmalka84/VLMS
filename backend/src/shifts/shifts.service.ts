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

    // 1. Find previous approved shift's actualHandoverCash to use as openingCash
    const previousShift = await this.prisma.shiftReconciliation.findFirst({
      where: {
        siteId,
        date: { lt: targetDate },
        isApproved: true,
      },
      orderBy: { date: 'desc' },
      select: { actualHandoverCash: true, date: true },
    });

    const openingCash = previousShift ? Number(previousShift.actualHandoverCash) : 0;

    // 2. Query all cash loads on target date
    const cashLoads = await this.prisma.load.findMany({
      where: {
        siteId,
        date: targetDate,
        paymentType: 'CASH',
        deletedAt: null,
      },
      select: {
        id: true,
        amount: true,
        vehicle: { select: { vehicleNumber: true } },
      },
    });

    const cashInflows = cashLoads.reduce((sum, l) => sum + Number(l.amount), 0);
    const cashLoadsCount = cashLoads.length;

    // 3. Query all cash expenses & machine advances on target date
    const cashExpenses = await this.prisma.expense.findMany({
      where: {
        siteId,
        date: targetDate,
        paymentMode: 'CASH_DRAWER',
        deletedAt: null,
      },
      select: {
        id: true,
        amount: true,
        advanceAmount: true,
        category: { select: { name: true } },
        machinery: { select: { name: true } },
      },
    });

    let generalExpensesOutflow = 0;
    let machineryAdvanceOutflow = 0;

    for (const exp of cashExpenses) {
      generalExpensesOutflow += Number(exp.amount);
      if (exp.advanceAmount) {
        machineryAdvanceOutflow += Number(exp.advanceAmount);
      }
    }

    const cashOutflows = generalExpensesOutflow + machineryAdvanceOutflow;
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
      expensesCount: cashExpenses.length,
      expectedCash,
      existingShift: existingShift
        ? {
            id: existingShift.id,
            shiftType: existingShift.shiftType,
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

    if (drawer.existingShift && drawer.existingShift.isApproved) {
      throw new BadRequestException('This shift handover has already been approved and locked by the owner.');
    }

    const actualHandover = Number(dto.actualHandoverCash);
    const discrepancy = actualHandover - drawer.expectedCash;

    const shiftData = {
      siteId,
      supervisorUserId: user.id,
      date: targetDate,
      shiftType: dto.shiftType || 'DAY',
      openingCash: new Prisma.Decimal(drawer.openingCash),
      cashInflows: new Prisma.Decimal(drawer.cashInflows),
      cashOutflows: new Prisma.Decimal(drawer.cashOutflows),
      expectedCash: new Prisma.Decimal(drawer.expectedCash),
      actualHandoverCash: new Prisma.Decimal(actualHandover),
      discrepancy: new Prisma.Decimal(discrepancy),
      remarks: dto.remarks || null,
      isApproved: false,
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

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(`${query.startDate}T00:00:00.000Z`);
      }
      if (query.endDate) {
        where.date.lte = new Date(`${query.endDate}T23:59:59.999Z`);
      }
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
