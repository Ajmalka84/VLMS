import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
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

    const cleanVehicleNumber = dto.vehicleNumber.trim().toUpperCase();

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
      const cleanVehicleNumber = dto.vehicleNumber.trim().toUpperCase();
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
    await this.findOne(userId, id);

    return this.prisma.vehicle.delete({
      where: { id },
    });
  }
}
