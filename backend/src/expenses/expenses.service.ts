import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().toLowerCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3];

  if (minutes < 0 || minutes > 59) return null;

  if (meridian) {
    if (hours < 1 || hours > 12) return null;
    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
  } else {
    if (hours < 0 || hours > 23) return null;
  }

  return hours * 60 + minutes;
}

export function calculateWorkingHours(startTime: string, closingTime: string): number {
  const startMins = parseTimeToMinutes(startTime);
  const closeMins = parseTimeToMinutes(closingTime);

  if (startMins === null || closeMins === null) {
    throw new BadRequestException(
      `Invalid time format. Please use HH:MM or HH:MM AM/PM (e.g., "08:00 AM", "17:30", "22:00").`,
    );
  }

  let durationMins: number;
  if (closeMins >= startMins) {
    durationMins = closeMins - startMins;
  } else {
    // Overnight rollover across midnight (e.g. 22:00 to 04:30)
    durationMins = 1440 - startMins + closeMins;
  }

  const hours = durationMins / 60;
  return Math.round(hours * 100) / 100;
}

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async createExpense(
    ownerId: string,
    userId: string,
    userRole: string,
    dto: CreateExpenseDto,
  ) {
    // 1. Verify Site belongs to Owner
    const site = await this.prisma.site.findFirst({
      where: { id: dto.siteId, userId: ownerId },
    });
    if (!site) {
      throw new NotFoundException(`Site with ID "${dto.siteId}" not found for this tenant`);
    }

    // 2. Verify Category belongs to Owner
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, userId: ownerId },
    });
    if (!category) {
      throw new NotFoundException(
        `Expense category with ID "${dto.categoryId}" not found for this tenant`,
      );
    }

    // 3. Handle Machinery & Hours Calculation
    let calculatedHours = dto.totalHours !== undefined ? Number(dto.totalHours) : undefined;
    let rentPerHour = dto.rentPerHour !== undefined ? Number(dto.rentPerHour) : undefined;
    let finalAmount = dto.amount !== undefined ? Number(dto.amount) : undefined;

    if (dto.machineryId) {
      const machine = await this.prisma.machinery.findFirst({
        where: { id: dto.machineryId, userId: ownerId },
      });
      if (!machine) {
        throw new NotFoundException(
          `Machinery with ID "${dto.machineryId}" not found for this tenant`,
        );
      }

      if (rentPerHour === undefined && machine.defaultRentPerHour) {
        rentPerHour = Number(machine.defaultRentPerHour);
      }

      if (calculatedHours === undefined && dto.startTime && dto.closingTime) {
        calculatedHours = calculateWorkingHours(dto.startTime, dto.closingTime);
      }

      if (finalAmount === undefined && calculatedHours !== undefined && rentPerHour !== undefined) {
        finalAmount = Math.round(calculatedHours * rentPerHour * 100) / 100;
      }
    }

    if (finalAmount === undefined || isNaN(finalAmount) || finalAmount < 0) {
      throw new BadRequestException(
        'Expense amount is required and must be a valid non-negative number.',
      );
    }

    const expenseDate = new Date(dto.date);
    if (isNaN(expenseDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }

    return this.prisma.expense.create({
      data: {
        siteId: dto.siteId,
        categoryId: dto.categoryId,
        recordedByUserId: userId,
        date: expenseDate,
        amount: new Prisma.Decimal(finalAmount),
        paymentMode: dto.paymentMode || 'CASH_DRAWER',
        paidTo: dto.paidTo?.trim() || null,
        remarks: dto.remarks?.trim() || null,
        machineryId: dto.machineryId || null,
        startTime: dto.startTime?.trim() || null,
        closingTime: dto.closingTime?.trim() || null,
        startMeterReading:
          dto.startMeterReading !== undefined
            ? new Prisma.Decimal(dto.startMeterReading)
            : null,
        endMeterReading:
          dto.endMeterReading !== undefined
            ? new Prisma.Decimal(dto.endMeterReading)
            : null,
        totalHours:
          calculatedHours !== undefined ? new Prisma.Decimal(calculatedHours) : null,
        rentPerHour:
          rentPerHour !== undefined ? new Prisma.Decimal(rentPerHour) : null,
        advanceAmount:
          dto.advanceAmount !== undefined
            ? new Prisma.Decimal(dto.advanceAmount)
            : new Prisma.Decimal(0),
      },
      include: {
        site: { select: { id: true, siteName: true, location: true } },
        category: { select: { id: true, name: true } },
        machinery: { select: { id: true, name: true, code: true, defaultRentPerHour: true } },
        recordedBy: { select: { id: true, name: true, role: true, mobile: true } },
      },
    });
  }

  async listExpenses(ownerId: string, query: QueryExpensesDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      site: { userId: ownerId },
      deletedAt: null,
    };

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.machineryId) {
      where.machineryId = query.machineryId;
    }

    if (query.paymentMode) {
      where.paymentMode = query.paymentMode;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const [expenses, total, allMatchingExpenses] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          site: { select: { id: true, siteName: true, location: true } },
          category: { select: { id: true, name: true } },
          machinery: { select: { id: true, name: true, code: true, defaultRentPerHour: true } },
          recordedBy: { select: { id: true, name: true, role: true, mobile: true } },
        },
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        select: {
          amount: true,
          paymentMode: true,
          machineryId: true,
          advanceAmount: true,
          totalHours: true,
        },
      }),
    ]);

    let totalExpenses = 0;
    let totalCashDrawerExpenses = 0;
    let totalMachineRent = 0;
    let totalAdvancesPaid = 0;
    let totalMachineHours = 0;

    for (const exp of allMatchingExpenses) {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      if (exp.paymentMode === 'CASH_DRAWER') {
        totalCashDrawerExpenses += amt;
      }
      if (exp.machineryId) {
        totalMachineRent += amt;
      }
      if (exp.advanceAmount) {
        totalAdvancesPaid += Number(exp.advanceAmount);
      }
      if (exp.totalHours) {
        totalMachineHours += Number(exp.totalHours);
      }
    }

    return {
      expenses,
      summary: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalCashDrawerExpenses: Math.round(totalCashDrawerExpenses * 100) / 100,
        totalMachineRent: Math.round(totalMachineRent * 100) / 100,
        totalAdvancesPaid: Math.round(totalAdvancesPaid * 100) / 100,
        totalMachineHours: Math.round(totalMachineHours * 100) / 100,
        count: total,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getExpenseById(ownerId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        site: { userId: ownerId },
        deletedAt: null,
      },
      include: {
        site: { select: { id: true, siteName: true, location: true } },
        category: { select: { id: true, name: true } },
        machinery: { select: { id: true, name: true, code: true, defaultRentPerHour: true } },
        recordedBy: { select: { id: true, name: true, role: true, mobile: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${id}" not found`);
    }

    return expense;
  }

  async updateExpense(
    ownerId: string,
    userId: string,
    userRole: string,
    id: string,
    dto: UpdateExpenseDto,
  ) {
    const existing = await this.getExpenseById(ownerId, id);

    // Site Boy 2-hour edit restriction window
    if (userRole === 'SITE_BOY') {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      if (existing.createdAt < twoHoursAgo) {
        throw new ForbiddenException(
          'Site boys can only edit expense entries within 2 hours of creation. Please contact the Owner.',
        );
      }
    }

    const updateData: any = {};

    if (dto.siteId !== undefined && dto.siteId !== existing.siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: dto.siteId, userId: ownerId },
      });
      if (!site) throw new NotFoundException(`Site with ID "${dto.siteId}" not found`);
      updateData.siteId = dto.siteId;
    }

    if (dto.categoryId !== undefined && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.expenseCategory.findFirst({
        where: { id: dto.categoryId, userId: ownerId },
      });
      if (!category) throw new NotFoundException(`Expense category not found`);
      updateData.categoryId = dto.categoryId;
    }

    if (dto.date !== undefined) {
      const d = new Date(dto.date);
      if (isNaN(d.getTime())) throw new BadRequestException('Invalid date format');
      updateData.date = d;
    }

    if (dto.paymentMode !== undefined) {
      updateData.paymentMode = dto.paymentMode;
    }

    if (dto.paidTo !== undefined) {
      updateData.paidTo = dto.paidTo ? dto.paidTo.trim() : null;
    }

    if (dto.remarks !== undefined) {
      updateData.remarks = dto.remarks ? dto.remarks.trim() : null;
    }

    if (dto.machineryId !== undefined) {
      if (dto.machineryId === null) {
        updateData.machineryId = null;
      } else {
        const machine = await this.prisma.machinery.findFirst({
          where: { id: dto.machineryId, userId: ownerId },
        });
        if (!machine) throw new NotFoundException(`Machinery not found`);
        updateData.machineryId = dto.machineryId;
      }
    }

    if (dto.startTime !== undefined) updateData.startTime = dto.startTime ? dto.startTime.trim() : null;
    if (dto.closingTime !== undefined) updateData.closingTime = dto.closingTime ? dto.closingTime.trim() : null;
    if (dto.startMeterReading !== undefined) {
      updateData.startMeterReading = dto.startMeterReading !== null ? new Prisma.Decimal(dto.startMeterReading) : null;
    }
    if (dto.endMeterReading !== undefined) {
      updateData.endMeterReading = dto.endMeterReading !== null ? new Prisma.Decimal(dto.endMeterReading) : null;
    }
    if (dto.advanceAmount !== undefined) {
      updateData.advanceAmount = dto.advanceAmount !== null ? new Prisma.Decimal(dto.advanceAmount) : new Prisma.Decimal(0);
    }

    const effectiveMachineryId = dto.machineryId !== undefined ? dto.machineryId : existing.machineryId;
    const effectiveStartTime = dto.startTime !== undefined ? dto.startTime : existing.startTime;
    const effectiveClosingTime = dto.closingTime !== undefined ? dto.closingTime : existing.closingTime;
    let effectiveRentPerHour = dto.rentPerHour !== undefined ? dto.rentPerHour : (existing.rentPerHour ? Number(existing.rentPerHour) : undefined);

    let calculatedHours = dto.totalHours !== undefined ? dto.totalHours : (existing.totalHours ? Number(existing.totalHours) : undefined);

    if (effectiveMachineryId) {
      if (dto.startTime !== undefined || dto.closingTime !== undefined) {
        if (effectiveStartTime && effectiveClosingTime) {
          calculatedHours = calculateWorkingHours(effectiveStartTime, effectiveClosingTime);
        }
      }

      if (effectiveRentPerHour === undefined) {
        const machine = await this.prisma.machinery.findFirst({ where: { id: effectiveMachineryId } });
        if (machine?.defaultRentPerHour) effectiveRentPerHour = Number(machine.defaultRentPerHour);
      }
    }

    if (calculatedHours !== undefined) {
      updateData.totalHours = calculatedHours !== null ? new Prisma.Decimal(calculatedHours) : null;
    }
    if (effectiveRentPerHour !== undefined) {
      updateData.rentPerHour = effectiveRentPerHour !== null ? new Prisma.Decimal(effectiveRentPerHour) : null;
    }

    if (dto.amount !== undefined) {
      updateData.amount = new Prisma.Decimal(dto.amount);
    } else if (effectiveMachineryId && calculatedHours !== undefined && effectiveRentPerHour !== undefined) {
      const autoAmount = Math.round(calculatedHours * effectiveRentPerHour * 100) / 100;
      updateData.amount = new Prisma.Decimal(autoAmount);
    }

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        site: { select: { id: true, siteName: true, location: true } },
        category: { select: { id: true, name: true } },
        machinery: { select: { id: true, name: true, code: true, defaultRentPerHour: true } },
        recordedBy: { select: { id: true, name: true, role: true, mobile: true } },
      },
    });
  }

  async deleteExpense(ownerId: string, id: string) {
    await this.getExpenseById(ownerId, id);

    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      id,
      message: 'Expense record deleted successfully',
    };
  }
}
