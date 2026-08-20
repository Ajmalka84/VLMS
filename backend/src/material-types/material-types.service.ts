import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialTypeDto } from './dto/create-material-type.dto';
import { UpdateMaterialTypeDto } from './dto/update-material-type.dto';

@Injectable()
export class MaterialTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialTypeDto) {
    const existing = await this.prisma.materialType.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Material type "${dto.name}" already exists`,
      );
    }

    return this.prisma.materialType.create({
      data: { name: dto.name.trim() },
    });
  }

  async findAll() {
    return this.prisma.materialType.findMany({
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

  async findOne(id: string) {
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

    if (!materialType) {
      throw new NotFoundException(`Material type with ID "${id}" not found`);
    }

    return materialType;
  }

  async update(id: string, dto: UpdateMaterialTypeDto) {
    await this.findOne(id);

    const existing = await this.prisma.materialType.findFirst({
      where: {
        name: dto.name.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Material type with name "${dto.name}" already exists`,
      );
    }

    return this.prisma.materialType.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
  }

  async remove(id: string) {
    const materialType = await this.findOne(id);

    const linkedLoadsCount = await this.prisma.load.count({
      where: { materialTypeId: id },
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

    return this.prisma.materialType.delete({
      where: { id },
    });
  }
}
