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
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { buildDateRangeFilter, buildTenantSiteScope } from '../common/utils/query-builder.util';
import { MasterCacheService } from '../common/cache/master-cache.service';

@Injectable()
export class LoadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masterCacheService: MasterCacheService,
  ) {}

  async create(user: AuthUser, dto: CreateLoadDto) {
    const ownerId = user.ownerId;

    // Verify site access and site locking for sub-accounts
    if (user.role === 'SITE_BOY') {
      if (user.assignedSiteId && dto.siteId && dto.siteId !== user.assignedSiteId) {
        throw new ForbiddenException('Site supervisor is strictly locked to their assigned quarry site.');
      }
      if (!dto.siteId && user.assignedSiteId) {
        dto.siteId = user.assignedSiteId;
      }
    } else if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
      if (!user.assignedSiteIds || !user.assignedSiteIds.includes(dto.siteId)) {
        throw new ForbiddenException('You are not authorized to create loads for this site');
      }
    }

    // 1-4. Parallel Entity Lookups
    const [site, vehicle, contractor, materialType] = await Promise.all([
      this.prisma.site.findUnique({ where: { id: dto.siteId } }),
      this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
        include: { vehicleType: true },
      }),
      dto.contractorId
        ? this.prisma.contractor.findUnique({ where: { id: dto.contractorId } })
        : Promise.resolve(null),
      this.prisma.materialType.findUnique({ where: { id: dto.materialTypeId } }),
    ]);

    if (!site) {
      throw new NotFoundException(`Site with ID "${dto.siteId}" not found`);
    }
    if (site.userId !== ownerId) {
      throw new ForbiddenException('You do not have permission to access this site');
    }

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${dto.vehicleId}" not found`);
    }
    if (vehicle.userId !== ownerId) {
      throw new ForbiddenException('You do not have permission to access this vehicle');
    }

    if (dto.contractorId) {
      if (!contractor) {
        throw new NotFoundException(`Contractor with ID "${dto.contractorId}" not found`);
      }
      if (contractor.userId !== ownerId) {
        throw new ForbiddenException('You do not have permission to access this contractor');
      }
    }

    if (!materialType || materialType.userId !== ownerId) {
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
        const rateRecord = await this.prisma.rate.upsert({
          where: {
            siteId_vehicleTypeId_materialTypeId: {
              siteId: dto.siteId,
              vehicleTypeId: vehicle.vehicleTypeId,
              materialTypeId: dto.materialTypeId,
            },
          },
          update: {},
          create: {
            siteId: dto.siteId,
            vehicleTypeId: vehicle.vehicleTypeId,
            materialTypeId: dto.materialTypeId,
            amount: finalAmount,
          },
        });
        rateId = rateRecord.id;
        this.masterCacheService.invalidateTenant(ownerId);
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

  async findAll(user: AuthUser, query: QueryLoadsDto) {
    const ownerId = user.ownerId;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const { whereSiteClause, siteIdFilter } = buildTenantSiteScope(user, query.siteId, ownerId);

    const where: any = {
      site: whereSiteClause,
      deletedAt: null,
    };

    if (siteIdFilter) {
      where.siteId = siteIdFilter;
    }

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

    const dateFilter = buildDateRangeFilter(query.startDate, query.endDate);
    if (dateFilter) {
      where.date = dateFilter;
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { vehicle: { vehicleNumber: { contains: search, mode: 'insensitive' } } },
        { contractor: { name: { contains: search, mode: 'insensitive' } } },
        { site: { siteName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // High-performance single-pass database query with SQL aggregation via groupBy
    const [loads, total, paymentTypeGroups] = await Promise.all([
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
      this.prisma.load.groupBy({
        by: ['paymentType'],
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    let totalAmount = 0;
    let totalCashAmount = 0;
    let totalCreditAmount = 0;
    let cashCount = 0;
    let creditCount = 0;

    for (const group of paymentTypeGroups) {
      const sumAmt = Number(group._sum?.amount || 0);
      const count = Number(group._count?.id || 0);
      totalAmount += sumAmt;
      if (group.paymentType === 'CASH') {
        totalCashAmount = sumAmt;
        cashCount = count;
      } else {
        totalCreditAmount = sumAmt;
        creditCount = count;
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

  async findOne(user: AuthUser, id: string) {
    const ownerId = user.ownerId;
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

    if (load.site.userId !== ownerId) {
      throw new ForbiddenException('You do not have permission to access this load');
    }

    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
      if (!user.assignedSiteIds.includes(load.siteId)) {
        throw new ForbiddenException('You are not authorized to view loads for this site');
      }
    }

    return load;
  }

  async update(user: AuthUser, id: string, dto: UpdateLoadDto) {
    const current = await this.findOne(user, id);
    const ownerId = user.ownerId;

    if (user.role === 'SITE_BOY') {
      if (dto.siteId && dto.siteId !== user.assignedSiteId) {
        throw new ForbiddenException('Site supervisor cannot reassign loads to another site.');
      }
    }

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
        if (!contractor || contractor.userId !== ownerId) {
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
      if (!site || site.userId !== ownerId) {
        throw new NotFoundException(`Site with ID "${dto.siteId}" not found`);
      }
      updateData.siteId = dto.siteId;
    }
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
      });
      if (!vehicle || vehicle.userId !== ownerId) {
        throw new NotFoundException(`Vehicle with ID "${dto.vehicleId}" not found`);
      }
      updateData.vehicleId = dto.vehicleId;
    }
    if (dto.materialTypeId) {
      const materialType = await this.prisma.materialType.findUnique({
        where: { id: dto.materialTypeId },
      });
      if (!materialType || materialType.userId !== ownerId) {
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

  async remove(user: AuthUser, id: string) {
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Owners and Administrators can delete loads.');
    }
    await this.findOne(user, id);

    return this.prisma.load.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
