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
  ownerId: string;
  name?: string | null;
  mobile: string;
  role: UserRole;
  assignedSiteIds: string[];
  assignedSiteId?: string | null;
  businessName?: string;
  gstin?: string | null;
  isActive?: boolean;
  coPartnerQuota?: number;
  siteBoyQuota?: number;
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
  ) {}

  async validateUser(dto: LoginDto): Promise<UserAuthProfile> {
    const superAdminMobile = process.env.SUPER_ADMIN_MOBILE;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    // 1. Check Super Admin Credentials
    if (superAdminMobile && dto.mobile.toLowerCase() === superAdminMobile.toLowerCase()) {
      if (superAdminPassword && dto.password === superAdminPassword) {
        return {
          id: '00000000-0000-0000-0000-000000000001',
          ownerId: '00000000-0000-0000-0000-000000000001',
          name: 'Super Admin',
          mobile: superAdminMobile,
          role: 'SUPER_ADMIN',
          assignedSiteIds: [],
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

    // 2. Check User in Database
    const user = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
      include: {
        assignedSite: true,
        partnerShares: {
          where: { isActive: true },
          include: { site: true },
        },
      },
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

    return this.buildUserProfile(user);
  }

  async login(user: UserAuthProfile) {
    const payload = {
      sub: user.id,
      ownerId: user.ownerId,
      mobile: user.mobile,
      role: user.role,
      assignedSiteIds: user.assignedSiteIds,
      assignedSiteId: user.assignedSiteId || null,
      name: user.name || null,
      businessName: user.businessName,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async getMe(userId: string, role: UserRole): Promise<UserAuthProfile> {
    if (role === 'SUPER_ADMIN') {
      return {
        id: userId,
        ownerId: userId,
        name: 'Super Admin',
        mobile: process.env.SUPER_ADMIN_MOBILE ?? 'admin',
        role: 'SUPER_ADMIN',
        assignedSiteIds: [],
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
      include: {
        assignedSite: true,
        partnerShares: {
          where: { isActive: true },
          include: { site: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive.');
    }

    return this.buildUserProfile(user);
  }

  private async buildUserProfile(user: any): Promise<UserAuthProfile> {
    let ownerId = user.id;
    let assignedSiteIds: string[] = [];
    let assignedSiteId: string | null = null;
    let rootOwner = user;

    if (user.role === 'OWNER' || user.role === 'USER') {
      ownerId = user.id;
      const sites = await this.prisma.site.findMany({
        where: { userId: user.id, isActive: true },
        select: { id: true },
      });
      assignedSiteIds = sites.map((s) => s.id);
    } else if (user.role === 'CO_PARTNER') {
      if (!user.ownerId) {
        throw new ForbiddenException('Co-partner account is misconfigured (missing owner).');
      }
      ownerId = user.ownerId;
      rootOwner = await this.prisma.user.findUnique({ where: { id: user.ownerId } });
      if (!rootOwner) {
        throw new ForbiddenException('Owner account not found.');
      }

      // Filter active shares on active sites
      const activeShares = (user.partnerShares || []).filter((ps: any) => ps.isActive && ps.site?.isActive);
      if (activeShares.length === 0) {
        // Auto-deactivate Co-partner if 0 active sites assigned
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });
        throw new ForbiddenException('Account has been deactivated because no active sites are currently assigned to you.');
      }
      assignedSiteIds = activeShares.map((ps: any) => ps.siteId);
    } else if (user.role === 'SITE_BOY') {
      if (!user.ownerId || !user.assignedSiteId) {
        throw new ForbiddenException('Site boy account is misconfigured (missing owner or assigned site).');
      }
      ownerId = user.ownerId;
      rootOwner = await this.prisma.user.findUnique({ where: { id: user.ownerId } });
      if (!rootOwner) {
        throw new ForbiddenException('Owner account not found.');
      }

      const assignedSite = user.assignedSite || (await this.prisma.site.findUnique({ where: { id: user.assignedSiteId } }));
      if (!assignedSite || !assignedSite.isActive) {
        // Auto-deactivate Site Boy if assigned site is deactivated
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });
        throw new ForbiddenException('Account has been deactivated because your assigned site is inactive.');
      }
      assignedSiteId = user.assignedSiteId;
      assignedSiteIds = [user.assignedSiteId];
    }

    const subInfo = computeSubscriptionStatus(rootOwner);

    return {
      id: user.id,
      ownerId,
      name: user.name,
      mobile: user.mobile,
      role: user.role === 'USER' ? 'OWNER' : user.role,
      assignedSiteIds,
      assignedSiteId,
      businessName: rootOwner.businessName || user.businessName,
      gstin: rootOwner.gstin || user.gstin,
      isActive: user.isActive,
      coPartnerQuota: rootOwner.coPartnerQuota ?? 3,
      siteBoyQuota: rootOwner.siteBoyQuota ?? 2,
      ...subInfo,
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
