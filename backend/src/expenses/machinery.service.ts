import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMachineryDto } from './dto/create-machinery.dto';
import { UpdateMachineryDto } from './dto/update-machinery.dto';
import { MasterCacheService } from '../common/cache/master-cache.service';

@Injectable()
export class MachineryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MasterCacheService,
  ) {}

  async listMachinery(ownerId: string, includeInactive = false) {
    const cacheKey = `machinery_list:${ownerId}:${includeInactive}`;
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = { userId: ownerId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const list = await this.prisma.machinery.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    this.cacheService.set(cacheKey, list);
    return list;
  }

  async getMachineryById(ownerId: string, id: string) {
    const machine = await this.prisma.machinery.findFirst({
      where: { id, userId: ownerId },
    });

    if (!machine) {
      throw new NotFoundException(`Machinery with ID "${id}" not found`);
    }

    return machine;
  }

  async createMachinery(ownerId: string, dto: CreateMachineryDto) {
    const trimmedName = dto.name.trim();

    const existing = await this.prisma.machinery.findFirst({
      where: {
        userId: ownerId,
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Machinery "${trimmedName}" already registered`);
    }

    const created = await this.prisma.machinery.create({
      data: {
        userId: ownerId,
        name: trimmedName,
        code: dto.code?.trim() || null,
        defaultRentPerHour: dto.defaultRentPerHour !== undefined ? new Prisma.Decimal(dto.defaultRentPerHour) : null,
        vendorName: dto.vendorName?.trim() || null,
        vendorMobile: dto.vendorMobile?.trim() || null,
        isActive: true,
      },
    });

    this.cacheService.invalidateTenant(ownerId);
    return created;
  }

  async updateMachinery(ownerId: string, id: string, dto: UpdateMachineryDto) {
    await this.getMachineryById(ownerId, id);

    const data: any = {};
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      const existing = await this.prisma.machinery.findFirst({
        where: {
          userId: ownerId,
          name: { equals: trimmedName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(`Machinery "${trimmedName}" already exists`);
      }
      data.name = trimmedName;
    }

    if (dto.code !== undefined) {
      data.code = dto.code ? dto.code.trim() : null;
    }
    if (dto.defaultRentPerHour !== undefined) {
      data.defaultRentPerHour = dto.defaultRentPerHour !== null ? new Prisma.Decimal(dto.defaultRentPerHour) : null;
    }
    if (dto.vendorName !== undefined) {
      data.vendorName = dto.vendorName ? dto.vendorName.trim() : null;
    }
    if (dto.vendorMobile !== undefined) {
      data.vendorMobile = dto.vendorMobile ? dto.vendorMobile.trim() : null;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const updated = await this.prisma.machinery.update({
      where: { id },
      data,
    });

    this.cacheService.invalidateTenant(ownerId);
    return updated;
  }

  async deleteMachinery(ownerId: string, id: string) {
    const machine = await this.getMachineryById(ownerId, id);

    const linkedExpensesCount = await this.prisma.expense.count({
      where: { machineryId: id, deletedAt: null },
    });

    if (linkedExpensesCount > 0) {
      throw new BadRequestException(
        `Cannot delete machinery "${machine.name}" because ${linkedExpensesCount} active expense/rental record(s) are linked to it. You can deactivate it instead.`,
      );
    }

    await this.prisma.machinery.delete({
      where: { id },
    });

    this.cacheService.invalidateTenant(ownerId);
    return {
      id,
      message: `Machinery "${machine.name}" deleted successfully`,
    };
  }
}
