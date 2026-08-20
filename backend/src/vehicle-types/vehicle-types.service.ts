import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';

@Injectable()
export class VehicleTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVehicleTypeDto) {
    const existing = await this.prisma.vehicleType.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle type "${dto.name}" already exists`,
      );
    }

    return this.prisma.vehicleType.create({
      data: { name: dto.name.trim() },
    });
  }

  async findAll() {
    return this.prisma.vehicleType.findMany({
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

  async findOne(id: string) {
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

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID "${id}" not found`);
    }

    return vehicleType;
  }

  async update(id: string, dto: UpdateVehicleTypeDto) {
    await this.findOne(id);

    const existing = await this.prisma.vehicleType.findFirst({
      where: {
        name: dto.name.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle type with name "${dto.name}" already exists`,
      );
    }

    return this.prisma.vehicleType.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
  }

  async remove(id: string) {
    const vehicleType = await this.findOne(id);

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

    return this.prisma.vehicleType.delete({
      where: { id },
    });
  }
}
