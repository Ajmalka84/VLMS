import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialTypeDto } from './dto/create-material-type.dto';
import { UpdateMaterialTypeDto } from './dto/update-material-type.dto';
import { MasterCacheService } from '../common/cache/master-cache.service';

@Injectable()
export class MaterialTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MasterCacheService,
  ) {}

  async create(userId: string, dto: CreateMaterialTypeDto) {
    const existing = await this.prisma.materialType.findUnique({
      where: {
        userId_name: {
          userId,
          name: dto.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Material type "${dto.name}" already exists`,
      );
    }

    const created = await this.prisma.materialType.create({
      data: {
        userId,
        name: dto.name.trim(),
      },
    });

    this.cacheService.invalidateTenant(userId);
    return created;
  }

  async findAll(userId: string) {
    return this.prisma.materialType.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            rates: true,
            loads: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const materialType = await this.prisma.materialType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rates: true,
            loads: true,
          },
        },
      },
    });

    if (!materialType || materialType.userId !== userId) {
      throw new NotFoundException(`Material type with ID "${id}" not found`);
    }

    return materialType;
  }

  async update(userId: string, id: string, dto: UpdateMaterialTypeDto) {
    await this.findOne(userId, id);

    const existing = await this.prisma.materialType.findFirst({
      where: {
        userId,
        name: dto.name.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Material type with name "${dto.name}" already exists`,
      );
    }

    const updated = await this.prisma.materialType.update({
      where: { id },
      data: { name: dto.name.trim() },
    });

    this.cacheService.invalidateTenant(userId);
    return updated;
  }

  async remove(userId: string, id: string) {
    const materialType = await this.findOne(userId, id);

    const linkedLoadsCount = await this.prisma.load.count({
      where: { materialTypeId: id, deletedAt: null },
    });
    if (linkedLoadsCount > 0) {
      throw new BadRequestException(
        `Cannot delete material type "${materialType.name}" because ${linkedLoadsCount} dispatch load(s) on record are recorded with it.`,
      );
    }

    const linkedRatesCount = await this.prisma.rate.count({
      where: { materialTypeId: id },
    });
    if (linkedRatesCount > 0) {
      throw new BadRequestException(
        `Cannot delete material type "${materialType.name}" because ${linkedRatesCount} rate rule(s) are configured for it.`,
      );
    }

    const deleted = await this.prisma.materialType.delete({
      where: { id },
    });

    this.cacheService.invalidateTenant(userId);
    return deleted;
  }
}
