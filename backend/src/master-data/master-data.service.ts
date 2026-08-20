import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getBundle(userId: string) {
    const [sites, vehicles, vehicleTypes, materialTypes, contractors, rates] =
      await Promise.all([
        this.prisma.site.findMany({
          where: { userId },
          orderBy: { siteName: 'asc' },
          include: {
            _count: {
              select: { rates: true, loads: true },
            },
          },
        }),
        this.prisma.vehicle.findMany({
          where: { userId },
          orderBy: { vehicleNumber: 'asc' },
          include: {
            vehicleType: true,
            _count: {
              select: { loads: true },
            },
          },
        }),
        this.prisma.vehicleType.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { vehicles: true, rates: true },
            },
          },
        }),
        this.prisma.materialType.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { rates: true, loads: true },
            },
          },
        }),
        this.prisma.contractor.findMany({
          where: { userId },
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { loads: true },
            },
          },
        }),
        this.prisma.rate.findMany({
          where: {
            site: { userId },
          },
          include: {
            site: true,
            vehicleType: true,
            materialType: true,
          },
        }),
      ]);

    return {
      sites,
      vehicles,
      vehicleTypes,
      materialTypes,
      contractors,
      rates,
    };
  }
}
