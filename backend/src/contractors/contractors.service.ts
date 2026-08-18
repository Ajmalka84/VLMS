import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';

@Injectable()
export class ContractorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateContractorDto) {
    return this.prisma.contractor.create({
      data: {
        userId,
        name: dto.name.trim(),
        mobile: dto.mobile.trim(),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.contractor.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            loads: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const contractor = await this.prisma.contractor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loads: true,
          },
        },
      },
    });

    if (!contractor) {
      throw new NotFoundException(`Contractor with ID "${id}" not found`);
    }

    if (contractor.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this contractor',
      );
    }

    return contractor;
  }

  async update(userId: string, id: string, dto: UpdateContractorDto) {
    await this.findOne(userId, id);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.mobile !== undefined) updateData.mobile = dto.mobile.trim();

    return this.prisma.contractor.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.contractor.delete({
      where: { id },
    });
  }
}
