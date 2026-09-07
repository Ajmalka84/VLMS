import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getBundle(user: AuthUser) {
    const ownerId = user.ownerId;
    const isOwner = user.role === 'OWNER';

    const siteWhere: any = {
      userId: ownerId,
    };
    if (!isOwner && user.assignedSiteIds && user.assignedSiteIds.length > 0) {
      siteWhere.id = { in: user.assignedSiteIds };
    }

    const rateWhere: any = isOwner
      ? { site: { userId: ownerId } }
      : { siteId: { in: user.assignedSiteIds || [] } };

    const [sites, vehicles, vehicleTypes, materialTypes, contractors, rates, expenseCategories, machinery] =
      await Promise.all([
        this.prisma.site.findMany({
          where: siteWhere,
          orderBy: { siteName: 'asc' },
          include: {
            _count: {
              select: { rates: true, loads: true },
            },
          },
        }),
        this.prisma.vehicle.findMany({
          where: { userId: ownerId },
          orderBy: { vehicleNumber: 'asc' },
          include: {
            vehicleType: true,
            _count: {
              select: { loads: true },
            },
          },
        }),
        this.prisma.vehicleType.findMany({
          where: { userId: ownerId },
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { vehicles: true, rates: true },
            },
          },
        }),
        this.prisma.materialType.findMany({
          where: { userId: ownerId },
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { rates: true, loads: true },
            },
          },
        }),
        this.prisma.contractor.findMany({
          where: { userId: ownerId },
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { loads: true },
            },
          },
        }),
        this.prisma.rate.findMany({
          where: rateWhere,
          include: {
            site: true,
            vehicleType: true,
            materialType: true,
          },
        }),
        this.prisma.expenseCategory.findMany({
          where: { userId: ownerId },
          orderBy: { name: 'asc' },
        }),
        this.prisma.machinery.findMany({
          where: { userId: ownerId, isActive: true },
          orderBy: { name: 'asc' },
        }),
      ]);

    return {
      sites,
      vehicles,
      vehicleTypes,
      materialTypes,
      contractors,
      rates,
      expenseCategories,
      machinery,
    };
  }
}
