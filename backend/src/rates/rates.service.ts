import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { LookupRateDto } from './dto/lookup-rate.dto';

@Injectable()
export class RatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRateDto) {
    // 1. Verify site exists and belongs to user
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new NotFoundException(`Site with ID "${dto.siteId}" not found`);
    }
    if (site.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this site');
    }

    // 2. Verify vehicle type exists
    const vehicleType = await this.prisma.vehicleType.findUnique({
      where: { id: dto.vehicleTypeId },
    });
    if (!vehicleType) {
      throw new NotFoundException(
        `Vehicle type with ID "${dto.vehicleTypeId}" not found`,
      );
    }

    // 3. Verify material type exists
    const materialType = await this.prisma.materialType.findUnique({
      where: { id: dto.materialTypeId },
    });
    if (!materialType) {
      throw new NotFoundException(
        `Material type with ID "${dto.materialTypeId}" not found`,
      );
    }

    // 4. Create or update (upsert) rate
    return this.prisma.rate.upsert({
      where: {
        siteId_vehicleTypeId_materialTypeId: {
          siteId: dto.siteId,
          vehicleTypeId: dto.vehicleTypeId,
          materialTypeId: dto.materialTypeId,
        },
      },
      update: {
        amount: dto.amount,
      },
      create: {
        siteId: dto.siteId,
        vehicleTypeId: dto.vehicleTypeId,
        materialTypeId: dto.materialTypeId,
        amount: dto.amount,
      },
      include: {
        site: true,
        vehicleType: true,
        materialType: true,
      },
    });
  }

  async findAll(userId: string, siteId?: string) {
    return this.prisma.rate.findMany({
      where: {
        site: {
          userId,
        },
        ...(siteId ? { siteId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        site: true,
        vehicleType: true,
        materialType: true,
      },
    });
  }

  async lookup(userId: string, query: LookupRateDto) {
    // 1. Verify site belongs to user
    const site = await this.prisma.site.findUnique({
      where: { id: query.siteId },
    });
    if (!site || site.userId !== userId) {
      throw new NotFoundException(
        'Site not found or access denied for this rate lookup',
      );
    }

    // 2. Query rate
    const rate = await this.prisma.rate.findUnique({
      where: {
        siteId_vehicleTypeId_materialTypeId: {
          siteId: query.siteId,
          vehicleTypeId: query.vehicleTypeId,
          materialTypeId: query.materialTypeId,
        },
      },
      include: {
        site: true,
        vehicleType: true,
        materialType: true,
      },
    });

    if (!rate) {
      throw new NotFoundException(
        'No rate configured for the specified Site, Vehicle Type, and Material Type combination',
      );
    }

    return rate;
  }

  async findOne(userId: string, id: string) {
    const rate = await this.prisma.rate.findUnique({
      where: { id },
      include: {
        site: true,
        vehicleType: true,
        materialType: true,
      },
    });

    if (!rate) {
      throw new NotFoundException(`Rate with ID "${id}" not found`);
    }

    if (rate.site.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this rate');
    }

    return rate;
  }

  async update(userId: string, id: string, dto: UpdateRateDto) {
    await this.findOne(userId, id);

    return this.prisma.rate.update({
      where: { id },
      data: {
        amount: dto.amount,
      },
      include: {
        site: true,
        vehicleType: true,
        materialType: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.rate.delete({
      where: { id },
    });
  }
}
