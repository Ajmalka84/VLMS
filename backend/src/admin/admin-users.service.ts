import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });

    if (existing) {
      throw new ConflictException(
        `Customer with mobile number "${dto.mobile}" already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        businessName: dto.businessName.trim(),
        mobile: dto.mobile.trim(),
        passwordHash,
        gstin: dto.gstin?.trim() || null,
        isActive: true,
      },
      select: {
        id: true,
        businessName: true,
        mobile: true,
        gstin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async listUsers(query: QueryUsersDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    if (query.search?.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { businessName: { contains: searchTerm, mode: 'insensitive' } },
        { mobile: { contains: searchTerm } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          businessName: true,
          mobile: true,
          gstin: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              sites: true,
              vehicles: true,
              contractors: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        mobile: true,
        gstin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sites: true,
            vehicles: true,
            contractors: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Customer user with ID "${id}" not found`);
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.getUserById(id);

    const updateData: any = {};
    if (dto.businessName !== undefined) {
      updateData.businessName = dto.businessName.trim();
    }
    if (dto.gstin !== undefined) {
      updateData.gstin = dto.gstin?.trim() || null;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        businessName: true,
        mobile: true,
        gstin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateStatus(id: string, isActive: boolean) {
    await this.getUserById(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        businessName: true,
        mobile: true,
        isActive: true,
      },
    });

    return {
      ...user,
      message: isActive
        ? 'Customer account activated successfully'
        : 'Customer account deactivated successfully',
    };
  }

  async resetPassword(id: string, newPassword: string) {
    await this.getUserById(id);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return {
      id,
      message: 'Password reset successfully',
    };
  }
}
