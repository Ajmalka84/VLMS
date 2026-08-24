import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

export interface SubscriptionStatusInfo {
  subscriptionPlan: string;
  subscriptionStartsAt: Date;
  subscriptionExpiresAt: Date | null;
  gracePeriodDays: number;
  subscriptionStatus:
    | 'ACTIVE_PAID'
    | 'EXPIRING_SOON'
    | 'IN_GRACE_PERIOD'
    | 'TRIAL_ACTIVE'
    | 'TRIAL_EXPIRED'
    | 'EXPIRED'
    | 'INACTIVE';
  daysRemaining: number | null;
  isGraceActive: boolean;
  isExpired: boolean;
}

export function computeSubscriptionStatus(user: {
  isActive: boolean;
  subscriptionPlan?: string | null;
  subscriptionStartsAt?: Date | null;
  subscriptionExpiresAt?: Date | null;
  gracePeriodDays?: number | null;
}): SubscriptionStatusInfo {
  const plan = user.subscriptionPlan || 'ANNUAL';
  const startsAt = user.subscriptionStartsAt || new Date();
  const graceDays = user.gracePeriodDays ?? 7;

  if (!user.isActive) {
    return {
      subscriptionPlan: plan,
      subscriptionStartsAt: startsAt,
      subscriptionExpiresAt: user.subscriptionExpiresAt || null,
      gracePeriodDays: graceDays,
      subscriptionStatus: 'INACTIVE',
      daysRemaining: null,
      isGraceActive: false,
      isExpired: true,
    };
  }

  // Safe backward compatibility fallback for legacy users
  if (!user.subscriptionExpiresAt) {
    return {
      subscriptionPlan: plan,
      subscriptionStartsAt: startsAt,
      subscriptionExpiresAt: null,
      gracePeriodDays: graceDays,
      subscriptionStatus: 'ACTIVE_PAID',
      daysRemaining: null,
      isGraceActive: false,
      isExpired: false,
    };
  }

  const now = new Date();
  const expiresAt = new Date(user.subscriptionExpiresAt);
  const diffTime = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let subscriptionStatus: SubscriptionStatusInfo['subscriptionStatus'];
  let isGraceActive = false;
  let isExpired = false;

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    if (overdueDays <= graceDays) {
      subscriptionStatus = 'IN_GRACE_PERIOD';
      isGraceActive = true;
    } else if (plan === 'TRIAL') {
      subscriptionStatus = 'TRIAL_EXPIRED';
      isExpired = true;
    } else {
      subscriptionStatus = 'EXPIRED';
      isExpired = true;
    }
  } else {
    if (plan === 'TRIAL') {
      subscriptionStatus = 'TRIAL_ACTIVE';
    } else if (daysRemaining <= 30) {
      subscriptionStatus = 'EXPIRING_SOON';
    } else {
      subscriptionStatus = 'ACTIVE_PAID';
    }
  }

  return {
    subscriptionPlan: plan,
    subscriptionStartsAt: startsAt,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    gracePeriodDays: graceDays,
    subscriptionStatus,
    daysRemaining,
    isGraceActive,
    isExpired,
  };
}

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

    const plan = dto.subscriptionPlan || 'TRIAL';
    const now = new Date();
    let expiresAt: Date;

    if (dto.subscriptionExpiresAt) {
      expiresAt = new Date(dto.subscriptionExpiresAt);
    } else if (plan === 'TRIAL') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (plan === 'QUARTERLY') {
      expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    } else {
      // Default Annual (365 days)
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    const user = await this.prisma.user.create({
      data: {
        businessName: dto.businessName.trim(),
        mobile: dto.mobile.trim(),
        passwordHash,
        gstin: dto.gstin?.trim() || null,
        isActive: true,
        subscriptionPlan: plan,
        subscriptionStartsAt: now,
        subscriptionExpiresAt: expiresAt,
        gracePeriodDays: dto.gracePeriodDays ?? 7,
      },
      select: {
        id: true,
        businessName: true,
        mobile: true,
        gstin: true,
        isActive: true,
        subscriptionPlan: true,
        subscriptionStartsAt: true,
        subscriptionExpiresAt: true,
        gracePeriodDays: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const subInfo = computeSubscriptionStatus(user);

    return {
      ...user,
      ...subInfo,
    };
  }

  async listUsers(query: QueryUsersDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const andConditions: any[] = [];
    const now = new Date();

    if (query.status === 'active') {
      andConditions.push({ isActive: true });
    } else if (query.status === 'inactive') {
      andConditions.push({ isActive: false });
    } else if (query.status === 'trial') {
      andConditions.push({ subscriptionPlan: 'TRIAL' });
    } else if (query.status === 'active_paid') {
      andConditions.push({ isActive: true });
      andConditions.push({ subscriptionPlan: { not: 'TRIAL' } });
      andConditions.push({
        OR: [
          { subscriptionExpiresAt: null },
          { subscriptionExpiresAt: { gt: now } },
        ],
      });
    } else if (query.status === 'expiring') {
      andConditions.push({ isActive: true });
      andConditions.push({
        subscriptionExpiresAt: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else if (query.status === 'expired') {
      andConditions.push({ isActive: true });
      andConditions.push({
        subscriptionExpiresAt: {
          lt: now,
        },
      });
    }

    if (query.search?.trim()) {
      const searchTerm = query.search.trim();
      andConditions.push({
        OR: [
          { businessName: { contains: searchTerm, mode: 'insensitive' } },
          { mobile: { contains: searchTerm } },
        ],
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

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
          subscriptionPlan: true,
          subscriptionStartsAt: true,
          subscriptionExpiresAt: true,
          gracePeriodDays: true,
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

    const enrichedUsers = users.map((u) => {
      const subInfo = computeSubscriptionStatus(u);
      return {
        ...u,
        ...subInfo,
      };
    });

    return {
      users: enrichedUsers,
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
        subscriptionPlan: true,
        subscriptionStartsAt: true,
        subscriptionExpiresAt: true,
        gracePeriodDays: true,
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

    const subInfo = computeSubscriptionStatus(user);

    return {
      ...user,
      ...subInfo,
    };
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
        subscriptionPlan: true,
        subscriptionStartsAt: true,
        subscriptionExpiresAt: true,
        gracePeriodDays: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const subInfo = computeSubscriptionStatus(user);

    return {
      ...user,
      ...subInfo,
    };
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.getUserById(id);
    const now = new Date();

    // Use current expiration date as anchor if it is in the future, otherwise anchor to now
    let baseDate =
      existing.subscriptionExpiresAt && new Date(existing.subscriptionExpiresAt) > now
        ? new Date(existing.subscriptionExpiresAt)
        : now;

    let targetExpiresAt: Date;
    let targetPlan = dto.subscriptionPlan || existing.subscriptionPlan;

    if (dto.action === 'RENEW_ANNUAL_1Y') {
      targetExpiresAt = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      targetPlan = 'ANNUAL';
    } else if (dto.action === 'RENEW_QUARTERLY_3M') {
      targetExpiresAt = new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      targetPlan = 'QUARTERLY';
    } else if (dto.action === 'EXTEND_SHUTDOWN_30D') {
      targetExpiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (dto.action === 'EXTEND_TRIAL_7D') {
      targetExpiresAt = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      targetPlan = 'TRIAL';
    } else if (dto.action === 'SET_CUSTOM_DATE' || dto.subscriptionExpiresAt) {
      if (!dto.subscriptionExpiresAt) {
        throw new BadRequestException('subscriptionExpiresAt is required for SET_CUSTOM_DATE');
      }
      targetExpiresAt = new Date(dto.subscriptionExpiresAt);
    } else {
      targetExpiresAt = baseDate;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        subscriptionPlan: targetPlan,
        subscriptionExpiresAt: targetExpiresAt,
        gracePeriodDays: dto.gracePeriodDays ?? existing.gracePeriodDays,
      },
      select: {
        id: true,
        businessName: true,
        mobile: true,
        gstin: true,
        isActive: true,
        subscriptionPlan: true,
        subscriptionStartsAt: true,
        subscriptionExpiresAt: true,
        gracePeriodDays: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const subInfo = computeSubscriptionStatus(updated);

    return {
      ...updated,
      ...subInfo,
      message: `Subscription updated to ${targetPlan} (Valid till ${targetExpiresAt.toLocaleDateString('en-IN')})`,
    };
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
        subscriptionPlan: true,
        subscriptionStartsAt: true,
        subscriptionExpiresAt: true,
        gracePeriodDays: true,
      },
    });

    const subInfo = computeSubscriptionStatus(user);

    return {
      ...user,
      ...subInfo,
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
