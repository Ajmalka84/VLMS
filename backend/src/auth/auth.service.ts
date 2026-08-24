import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UserRole } from './decorators/roles.decorator';
import { computeSubscriptionStatus, SubscriptionStatusInfo } from '../admin/admin-users.service';

export interface UserAuthProfile {
  id: string;
  mobile: string;
  role: UserRole;
  businessName?: string;
  gstin?: string | null;
  isActive?: boolean;
  subscriptionPlan?: string;
  subscriptionStartsAt?: Date;
  subscriptionExpiresAt?: Date | null;
  gracePeriodDays?: number;
  subscriptionStatus?: SubscriptionStatusInfo['subscriptionStatus'];
  daysRemaining?: number | null;
  isGraceActive?: boolean;
  isExpired?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  async validateUser(dto: LoginDto): Promise<UserAuthProfile> {
    const superAdminMobile = process.env.SUPER_ADMIN_MOBILE;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    // 1. Check Super Admin Credentials
    if (superAdminMobile && dto.mobile.toLowerCase() === superAdminMobile.toLowerCase()) {
      if (superAdminPassword && dto.password === superAdminPassword) {
        return {
          id: '00000000-0000-0000-0000-000000000001',
          mobile: superAdminMobile,
          role: 'SUPER_ADMIN',
          businessName: 'VLMS SaaS Admin',
          isActive: true,
          subscriptionPlan: 'SUPER_ADMIN',
          subscriptionStatus: 'ACTIVE_PAID',
          daysRemaining: null,
          isGraceActive: false,
          isExpired: false,
        };
      }
      throw new UnauthorizedException('Invalid mobile number or password');
    }

    // 2. Check Customer User in Database
    const user = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid mobile number or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Account is inactive. Please contact the administrator.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid mobile number or password');
    }

    const subInfo = computeSubscriptionStatus(user);

    return {
      id: user.id,
      mobile: user.mobile,
      role: 'USER',
      businessName: user.businessName,
      gstin: user.gstin,
      isActive: user.isActive,
      ...subInfo,
    };
  }

  async login(user: UserAuthProfile) {
    const payload = {
      sub: user.id,
      mobile: user.mobile,
      role: user.role,
      businessName: user.businessName,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async getMe(userId: string, role: UserRole) {
    if (role === 'SUPER_ADMIN') {
      return {
        id: userId,
        mobile: process.env.SUPER_ADMIN_MOBILE ?? 'admin',
        role: 'SUPER_ADMIN',
        businessName: 'VLMS SaaS Admin',
        isActive: true,
        subscriptionPlan: 'SUPER_ADMIN',
        subscriptionStatus: 'ACTIVE_PAID',
        daysRemaining: null,
        isGraceActive: false,
        isExpired: false,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive.');
    }

    const subInfo = computeSubscriptionStatus(user);

    return {
      ...user,
      ...subInfo,
      role: 'USER' as UserRole,
    };
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (oldPass === newPass) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return {
      message: 'Password successfully changed',
    };
  }
}
