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
import { MasterCacheService } from '../common/cache/master-cache.service';

@Injectable()
export class ContractorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MasterCacheService,
  ) {}

  async create(userId: string, dto: CreateContractorDto) {
    const cleanMobile = dto.mobile.trim();
    const cleanName = dto.name.trim();

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
    return this.prisma.contractor.findMany({
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
      if (cleanMobile !== current.mobile) {
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

    const deleted = await this.prisma.contractor.delete({
      where: { id },
    });

    this.cacheService.invalidateTenant(userId);
    return deleted;
  }
}
