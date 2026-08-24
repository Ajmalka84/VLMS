import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateVehicleDto) {
    // 1. Verify vehicleType exists
    const vehicleType = await this.prisma.vehicleType.findUnique({
      where: { id: dto.vehicleTypeId },
    });
    if (!vehicleType) {
      throw new NotFoundException(
        `Vehicle type with ID "${dto.vehicleTypeId}" not found`,
      );
    }

    const cleanVehicleNumber = dto.vehicleNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // 2. Verify vehicle uniqueness for this customer
    const existing = await this.prisma.vehicle.findUnique({
      where: {
        userId_vehicleNumber: {
          userId,
          vehicleNumber: cleanVehicleNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle with number "${cleanVehicleNumber}" is already registered in your fleet`,
      );
    }

    return this.prisma.vehicle.create({
      data: {
        userId,
        vehicleNumber: cleanVehicleNumber,
        vehicleTypeId: dto.vehicleTypeId,
      },
      include: {
        vehicleType: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicleType: true,
        _count: {
          select: {
            loads: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        vehicleType: true,
        _count: {
          select: {
            loads: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }

    if (vehicle.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this vehicle',
      );
    }

    return vehicle;
  }

  async update(userId: string, id: string, dto: UpdateVehicleDto) {
    const current = await this.findOne(userId, id);

    const updateData: any = {};

    if (dto.vehicleTypeId) {
      const vehicleType = await this.prisma.vehicleType.findUnique({
        where: { id: dto.vehicleTypeId },
      });
      if (!vehicleType) {
        throw new NotFoundException(
          `Vehicle type with ID "${dto.vehicleTypeId}" not found`,
        );
      }
      updateData.vehicleTypeId = dto.vehicleTypeId;
    }

    if (dto.vehicleNumber) {
      const cleanVehicleNumber = dto.vehicleNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleanVehicleNumber !== current.vehicleNumber) {
        const existing = await this.prisma.vehicle.findUnique({
          where: {
            userId_vehicleNumber: {
              userId,
              vehicleNumber: cleanVehicleNumber,
            },
          },
        });
        if (existing) {
          throw new ConflictException(
            `Vehicle with number "${cleanVehicleNumber}" already exists in your fleet`,
          );
        }
        updateData.vehicleNumber = cleanVehicleNumber;
      }
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        vehicleType: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    const vehicle = await this.findOne(userId, id);

    const linkedLoadsCount = await this.prisma.load.count({
      where: { vehicleId: id, deletedAt: null },
    });

    if (linkedLoadsCount > 0) {
      throw new BadRequestException(
        `Cannot delete vehicle "${vehicle.vehicleNumber}" because it is linked to ${linkedLoadsCount} dispatch load(s) on record. Delete or reassign those load entries first.`,
      );
    }

    return this.prisma.vehicle.delete({
      where: { id },
    });
  }
}
