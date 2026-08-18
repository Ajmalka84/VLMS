import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSiteDto) {
    return this.prisma.site.create({
      data: {
        userId,
        siteName: dto.siteName.trim(),
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
    await this.findOne(userId, id);

    const updateData: any = {};
    if (dto.siteName !== undefined) updateData.siteName = dto.siteName.trim();
    if (dto.location !== undefined) updateData.location = dto.location.trim();
    if (dto.pincode !== undefined) updateData.pincode = dto.pincode.trim();

    return this.prisma.site.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.site.delete({
      where: { id },
    });
  }
}
