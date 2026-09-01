import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoadDto } from './dto/create-load.dto';
import { UpdateLoadDto } from './dto/update-load.dto';
import { QueryLoadsDto } from './dto/query-loads.dto';

@Injectable()
export class LoadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateLoadDto) {
    // 1. Verify Site belongs to user
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new NotFoundException(`Site with ID "${dto.siteId}" not found`);
    }
    if (site.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this site');
    }

    // 2. Verify Vehicle belongs to user
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
      include: { vehicleType: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${dto.vehicleId}" not found`);
    }
    if (vehicle.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this vehicle');
    }

    // 3. Verify Contractor belongs to user (if contractor is provided)
    if (dto.contractorId) {
      const contractor = await this.prisma.contractor.findUnique({
        where: { id: dto.contractorId },
      });
      if (!contractor) {
        throw new NotFoundException(`Contractor with ID "${dto.contractorId}" not found`);
      }
      if (contractor.userId !== userId) {
        throw new ForbiddenException('You do not have permission to access this contractor');
      }
    }

    // 4. Verify Material Type exists
    const materialType = await this.prisma.materialType.findUnique({
      where: { id: dto.materialTypeId },
    });
    if (!materialType) {
      throw new NotFoundException(
        `Material type with ID "${dto.materialTypeId}" not found`,
      );
    }

    // 5. Look up applicable Rate from Matrix (Site + Vehicle Type + Material Type)
    const rate = await this.prisma.rate.findUnique({
      where: {
        siteId_vehicleTypeId_materialTypeId: {
          siteId: dto.siteId,
          vehicleTypeId: vehicle.vehicleTypeId,
          materialTypeId: dto.materialTypeId,
        },
      },
    });

    // 6. Determine final amount
    let finalAmount: number;
    let rateId: string;

    if (dto.amount !== undefined && dto.amount !== null && !isNaN(Number(dto.amount))) {
      finalAmount = Number(dto.amount);
      if (rate) {
        rateId = rate.id;
      } else {
        // If no rate entry exists in matrix but manual amount is given, create on-the-fly rate entry
        const createdRate = await this.prisma.rate.create({
          data: {
            siteId: dto.siteId,
            vehicleTypeId: vehicle.vehicleTypeId,
            materialTypeId: dto.materialTypeId,
            amount: finalAmount,
          },
        });
        rateId = createdRate.id;
      }
    } else {
      if (!rate) {
        throw new BadRequestException(
          `No rate configured for ${site.siteName} + ${vehicle.vehicleType.name} + ${materialType.name}. Please enter a manual load amount or configure the rate in Master Data.`,
        );
      }
      finalAmount = Number(rate.amount);
      rateId = rate.id;
    }

    // 7. Determine load date
    let loadDate: Date;
    if (dto.date) {
      loadDate = new Date(dto.date);
      if (isNaN(loadDate.getTime())) {
        loadDate = new Date();
      }
    } else {
      loadDate = new Date();
    }

    // 8. Create Load
    return this.prisma.load.create({
      data: {
        siteId: dto.siteId,
        date: loadDate,
        vehicleId: dto.vehicleId,
        materialTypeId: dto.materialTypeId,
        contractorId: dto.contractorId || null,
        rateId: rateId,
        amount: finalAmount,
        paymentType: dto.paymentType,
        remarks: dto.remarks || null,
      },
      include: {
        site: true,
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        materialType: true,
        contractor: true,
        rate: true,
      },
    });
  }

  async findAll(userId: string, query: QueryLoadsDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      site: {
        userId,
      },
      deletedAt: null,
    };

    if (query.siteId) where.siteId = query.siteId;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.contractorId) {
      if (query.contractorId === 'direct' || query.contractorId === 'direct-sales') {
        where.contractorId = null;
      } else {
        where.contractorId = query.contractorId;
      }
    }
    if (query.materialTypeId) where.materialTypeId = query.materialTypeId;
    if (query.paymentType) where.paymentType = query.paymentType;

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { vehicle: { vehicleNumber: { contains: search, mode: 'insensitive' } } },
        { contractor: { name: { contains: search, mode: 'insensitive' } } },
        { site: { siteName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [loads, total, allMatchingLoads] = await Promise.all([
      this.prisma.load.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
        include: {
          site: true,
          vehicle: {
            include: {
              vehicleType: true,
            },
          },
          materialType: true,
          contractor: true,
          rate: true,
        },
      }),
      this.prisma.load.count({ where }),
      this.prisma.load.findMany({
        where,
        select: {
          amount: true,
          paymentType: true,
        },
      }),
    ]);

    // Calculate dynamic aggregates for the filtered set
    let totalAmount = 0;
    let totalCashAmount = 0;
    let totalCreditAmount = 0;
    let cashCount = 0;
    let creditCount = 0;

    for (const item of allMatchingLoads) {
      const amt = Number(item.amount);
      totalAmount += amt;
      if (item.paymentType === 'CASH') {
        totalCashAmount += amt;
        cashCount++;
      } else {
        totalCreditAmount += amt;
        creditCount++;
      }
    }

    return {
      loads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalLoads: total,
        totalAmount,
        totalCashAmount,
        totalCreditAmount,
        cashCount,
        creditCount,
      },
    };
  }

  async findOne(userId: string, id: string) {
    const load = await this.prisma.load.findUnique({
      where: { id },
      include: {
        site: true,
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        materialType: true,
        contractor: true,
        rate: true,
      },
    });

    if (!load || load.deletedAt !== null) {
      throw new NotFoundException(`Load with ID "${id}" not found`);
    }

    if (load.site.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this load');
    }

    return load;
  }

  async findPublicOne(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      throw new NotFoundException(`Trip Slip with ID "${id}" not found`);
    }

    const load = await this.prisma.load.findFirst({
      where: { id, deletedAt: null },
      include: {
        site: {
          include: {
            user: {
              select: {
                businessName: true,
                mobile: true,
              },
            },
          },
        },
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        materialType: true,
        contractor: true,
      },
    });

    if (!load) {
      throw new NotFoundException(`Trip Slip with ID "${id}" not found`);
    }

    return load;
  }

  async update(userId: string, id: string, dto: UpdateLoadDto) {
    const current = await this.findOne(userId, id);

    const updateData: any = {};

    if (dto.date) {
      updateData.date = new Date(dto.date);
    }
    if (dto.paymentType) {
      updateData.paymentType = dto.paymentType;
    }
    if (dto.contractorId !== undefined) {
      if (dto.contractorId) {
        const contractor = await this.prisma.contractor.findUnique({
          where: { id: dto.contractorId },
        });
        if (!contractor || contractor.userId !== userId) {
          throw new NotFoundException(`Contractor with ID "${dto.contractorId}" not found`);
        }
        updateData.contractorId = dto.contractorId;
      } else {
        updateData.contractorId = null;
      }
    }
    if (dto.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: dto.siteId },
      });
      if (!site || site.userId !== userId) {
        throw new NotFoundException(`Site with ID "${dto.siteId}" not found`);
      }
      updateData.siteId = dto.siteId;
    }
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
      });
      if (!vehicle || vehicle.userId !== userId) {
        throw new NotFoundException(`Vehicle with ID "${dto.vehicleId}" not found`);
      }
      updateData.vehicleId = dto.vehicleId;
    }
    if (dto.materialTypeId) {
      const materialType = await this.prisma.materialType.findUnique({
        where: { id: dto.materialTypeId },
      });
      if (!materialType) {
        throw new NotFoundException(`Material type with ID "${dto.materialTypeId}" not found`);
      }
      updateData.materialTypeId = dto.materialTypeId;
    }

    if (dto.amount !== undefined && dto.amount !== null) {
      updateData.amount = Number(dto.amount);
    }

    return this.prisma.load.update({
      where: { id },
      data: updateData,
      include: {
        site: true,
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        materialType: true,
        contractor: true,
        rate: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.load.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
