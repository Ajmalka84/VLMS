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
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { MasterCacheService } from '../common/cache/master-cache.service';

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MasterCacheService,
  ) {}

  async create(user: AuthUser, dto: CreateSiteDto) {
    const ownerId = user.ownerId;
    const cleanSiteName = dto.siteName.trim();

    const existing = await this.prisma.site.findFirst({
      where: {
        userId: ownerId,
        siteName: { equals: cleanSiteName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A site named "${cleanSiteName}" already exists in your account`,
      );
    }

    const created = await this.prisma.site.create({
      data: {
        userId: ownerId,
        siteName: cleanSiteName,
        location: dto.location.trim(),
        pincode: dto.pincode.trim(),
      },
    });

    this.cacheService.invalidateTenant(ownerId);
    return created;
  }

  async findAll(user: AuthUser) {
    const ownerId = user.ownerId;
    const where: any = { userId: ownerId };

    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' && user.assignedSiteIds) {
      where.id = { in: user.assignedSiteIds };
    }

    return this.prisma.site.findMany({
      where,
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

  async findOne(user: AuthUser, id: string) {
    const ownerId = user.ownerId;
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

    if (site.userId !== ownerId) {
      throw new ForbiddenException('You do not have permission to access this site');
    }

    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' && user.assignedSiteIds) {
      if (!user.assignedSiteIds.includes(site.id)) {
        throw new ForbiddenException('You are not assigned to this site');
      }
    }

    return site;
  }

  async update(user: AuthUser, id: string, dto: UpdateSiteDto) {
    const ownerId = user.ownerId;
    const current = await this.findOne(user, id);

    const updateData: any = {};
    if (dto.siteName !== undefined) {
      const cleanSiteName = dto.siteName.trim();
      if (cleanSiteName.toLowerCase() !== current.siteName.toLowerCase()) {
        const existing = await this.prisma.site.findFirst({
          where: {
            userId: ownerId,
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

    const updatedSite = await this.prisma.site.update({
      where: { id },
      data: updateData,
    });

    // Auto-deactivation cascade when site is disabled
    if (dto.isActive === false) {
      // 1. Deactivate any Site Boy assigned to this site
      await this.prisma.user.updateMany({
        where: { assignedSiteId: id, role: 'SITE_BOY' },
        data: { isActive: false },
      });

      // 2. Check all co-partners who have shares on this site
      const partnerShares = await this.prisma.partnerSiteShare.findMany({
        where: { siteId: id, isActive: true },
        include: {
          user: {
            include: {
              partnerShares: {
                where: { isActive: true },
                include: { site: true },
              },
            },
          },
        },
      });

      for (const ps of partnerShares) {
        const remainingActiveShares = ps.user.partnerShares.filter(
          (share) => share.siteId !== id && share.site.isActive,
        );
        if (remainingActiveShares.length === 0) {
          await this.prisma.user.update({
            where: { id: ps.userId },
            data: { isActive: false },
          });
        }
      }
    }

    this.cacheService.invalidateTenant(ownerId);
    return updatedSite;
  }

  async remove(user: AuthUser, id: string) {
    const site = await this.findOne(user, id);

    const linkedLoadsCount = await this.prisma.load.count({
      where: { siteId: id, deletedAt: null },
    });

    if (linkedLoadsCount > 0) {
      throw new BadRequestException(
        `Cannot delete quarry site "${site.siteName}" because it has ${linkedLoadsCount} dispatch load(s) recorded against it.`,
      );
    }

    const deleted = await this.prisma.site.delete({
      where: { id },
    });

    this.cacheService.invalidateTenant(user.ownerId);
    return deleted;
  }
}
