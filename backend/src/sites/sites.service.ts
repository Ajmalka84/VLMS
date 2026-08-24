import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSiteDto) {
    const cleanSiteName = dto.siteName.trim();

    const existing = await this.prisma.site.findFirst({
      where: {
        userId,
        siteName: { equals: cleanSiteName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A site named "${cleanSiteName}" already exists in your account`,
      );
    }

    return this.prisma.site.create({
      data: {
        userId,
        siteName: cleanSiteName,
        location: dto.location.trim(),
        pincode: dto.pincode.trim(),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.site.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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

  async findOne(userId: string, id: string) {
    const site = await this.prisma.site.findUnique({
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

    if (!site) {
      throw new NotFoundException(`Site with ID "${id}" not found`);
    }

    if (site.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this site');
    }

    return site;
  }

  async update(userId: string, id: string, dto: UpdateSiteDto) {
    const current = await this.findOne(userId, id);

    const updateData: any = {};
    if (dto.siteName !== undefined) {
      const cleanSiteName = dto.siteName.trim();
      if (cleanSiteName.toLowerCase() !== current.siteName.toLowerCase()) {
        const existing = await this.prisma.site.findFirst({
          where: {
            userId,
            siteName: { equals: cleanSiteName, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (existing) {
          throw new ConflictException(
            `A site named "${cleanSiteName}" already exists in your account`,
          );
        }
      }
      updateData.siteName = cleanSiteName;
    }
    if (dto.location !== undefined) updateData.location = dto.location.trim();
    if (dto.pincode !== undefined) updateData.pincode = dto.pincode.trim();
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.site.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(userId: string, id: string) {
    const site = await this.findOne(userId, id);

    const linkedLoadsCount = await this.prisma.load.count({
      where: { siteId: id, deletedAt: null },
    });

    if (linkedLoadsCount > 0) {
      throw new BadRequestException(
        `Cannot delete quarry site "${site.siteName}" because it has ${linkedLoadsCount} dispatch load(s) recorded against it.`,
      );
    }

    return this.prisma.site.delete({
      where: { id },
    });
  }
}
