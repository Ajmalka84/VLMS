import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';
import { MasterCacheService } from '../common/cache/master-cache.service';

@Injectable()
export class VehicleTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MasterCacheService,
  ) {}

  async create(userId: string, dto: CreateVehicleTypeDto) {
    const existing = await this.prisma.vehicleType.findUnique({
      where: {
        userId_name: {
          userId,
          name: dto.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle type "${dto.name}" already exists`,
      );
    }

    const created = await this.prisma.vehicleType.create({
      data: {
        userId,
        name: dto.name.trim(),
      },
    });

    this.cacheService.invalidateTenant(userId);
    return created;
  }

  async findAll(userId: string) {
    return this.prisma.vehicleType.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            vehicles: true,
            rates: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const vehicleType = await this.prisma.vehicleType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vehicles: true,
            rates: true,
          },
        },
      },
    });

    if (!vehicleType || vehicleType.userId !== userId) {
      throw new NotFoundException(`Vehicle type with ID "${id}" not found`);
    }

    return vehicleType;
  }

  async update(userId: string, id: string, dto: UpdateVehicleTypeDto) {
    await this.findOne(userId, id);

    const existing = await this.prisma.vehicleType.findFirst({
      where: {
        userId,
        name: dto.name.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle type with name "${dto.name}" already exists`,
      );
    }

    const updated = await this.prisma.vehicleType.update({
      where: { id },
      data: { name: dto.name.trim() },
    });

    this.cacheService.invalidateTenant(userId);
    return updated;
  }

  async remove(userId: string, id: string) {
    const vehicleType = await this.findOne(userId, id);

    const linkedVehiclesCount = await this.prisma.vehicle.count({
      where: { vehicleTypeId: id },
    });
    if (linkedVehiclesCount > 0) {
      throw new BadRequestException(
        `Cannot delete vehicle type "${vehicleType.name}" because ${linkedVehiclesCount} vehicle(s) are registered with it.`,
      );
    }

    const linkedRatesCount = await this.prisma.rate.count({
      where: { vehicleTypeId: id },
    });
    if (linkedRatesCount > 0) {
      throw new BadRequestException(
        `Cannot delete vehicle type "${vehicleType.name}" because ${linkedRatesCount} rate rule(s) are configured for it.`,
      );
    }

    const deleted = await this.prisma.vehicleType.delete({
      where: { id },
    });

    this.cacheService.invalidateTenant(userId);
    return deleted;
  }
}
