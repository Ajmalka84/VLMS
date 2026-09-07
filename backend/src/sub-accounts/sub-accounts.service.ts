import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoPartnerDto } from './dto/create-co-partner.dto';
import { UpdateCoPartnerDto } from './dto/update-co-partner.dto';
import { CreateSiteBoyDto } from './dto/create-site-boy.dto';
import { UpdateSiteBoyDto } from './dto/update-site-boy.dto';

@Injectable()
export class SubAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubAccounts(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        coPartnerQuota: true,
        siteBoyQuota: true,
      },
    });

    if (!owner) {
      throw new NotFoundException('Owner account not found');
    }

    const [coPartners, siteBoys] = await Promise.all([
      this.prisma.user.findMany({
        where: { ownerId, role: 'CO_PARTNER' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          mobile: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          partnerShares: {
            orderBy: { effectiveFrom: 'desc' },
            select: {
              id: true,
              siteId: true,
              sharePercentage: true,
              effectiveFrom: true,
              effectiveTo: true,
              isActive: true,
              site: {
                select: {
                  id: true,
                  siteName: true,
                  location: true,
                  isActive: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { ownerId, role: 'SITE_BOY' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          mobile: true,
          role: true,
          isActive: true,
          assignedSiteId: true,
          createdAt: true,
          updatedAt: true,
          assignedSite: {
            select: {
              id: true,
              siteName: true,
              location: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    const activeCoPartnersCount = coPartners.filter((cp) => cp.isActive).length;
    const activeSiteBoysCount = siteBoys.filter((sb) => sb.isActive).length;

    return {
      coPartners,
      siteBoys,
      quotas: {
        coPartner: {
          active: activeCoPartnersCount,
          max: owner.coPartnerQuota,
        },
        siteBoy: {
          active: activeSiteBoysCount,
          max: owner.siteBoyQuota,
        },
      },
    };
  }

  async createCoPartner(ownerId: string, dto: CreateCoPartnerDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!owner) {
      throw new NotFoundException('Owner account not found');
    }

    // 1. Enforce Quota
    const activeCoPartners = await this.prisma.user.count({
      where: { ownerId, role: 'CO_PARTNER', isActive: true },
    });
    if (activeCoPartners >= owner.coPartnerQuota) {
      throw new BadRequestException({
        success: false,
        message: `Co-partner quota limit reached (${owner.coPartnerQuota}). Contact administrator to upgrade quota (+₹2,000 per partner).`,
        code: 'QUOTA_EXCEEDED',
      });
    }

    // 2. Validate Mobile
    const existing = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });
    if (existing) {
      throw new ConflictException('A user with this mobile number already exists');
    }

    // 3. Validate Site Shares
    if (!dto.siteShares || dto.siteShares.length === 0) {
      throw new BadRequestException('At least one site must be assigned to the co-partner');
    }

    const siteIds = dto.siteShares.map((s) => s.siteId);
    const uniqueSiteIds = new Set(siteIds);
    if (uniqueSiteIds.size !== siteIds.length) {
      throw new BadRequestException('Duplicate site assignments in request');
    }

    const validSites = await this.prisma.site.findMany({
      where: { id: { in: siteIds }, userId: ownerId, isActive: true },
    });
    if (validSites.length !== siteIds.length) {
      throw new BadRequestException('One or more selected sites are invalid or inactive');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ownerId,
          name: dto.name,
          businessName: owner.businessName,
          mobile: dto.mobile,
          passwordHash,
          role: 'CO_PARTNER',
          isActive: true,
          subscriptionPlan: owner.subscriptionPlan,
        },
      });

      for (const share of dto.siteShares) {
        const effDate = share.effectiveFrom
          ? new Date(`${share.effectiveFrom}T00:00:00.000Z`)
          : new Date();
        await tx.partnerSiteShare.create({
          data: {
            userId: user.id,
            siteId: share.siteId,
            sharePercentage: new Prisma.Decimal(share.sharePercentage),
            effectiveFrom: effDate,
            effectiveTo: null,
            isActive: true,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          mobile: true,
          role: true,
          isActive: true,
          createdAt: true,
          partnerShares: {
            include: { site: true },
          },
        },
      });
    });
  }

  async updateCoPartner(ownerId: string, partnerId: string, dto: UpdateCoPartnerDto) {
    const partner = await this.prisma.user.findFirst({
      where: { id: partnerId, ownerId, role: 'CO_PARTNER' },
      include: {
        partnerShares: {
          where: { isActive: true, effectiveTo: null },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Co-partner not found');
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!owner) {
      throw new NotFoundException('Owner account not found');
    }

    // Quota check if activating an inactive partner
    if (dto.isActive === true && !partner.isActive) {
      const activeCoPartners = await this.prisma.user.count({
        where: { ownerId, role: 'CO_PARTNER', isActive: true },
      });
      if (activeCoPartners >= owner.coPartnerQuota) {
        throw new BadRequestException({
          success: false,
          message: `Co-partner quota limit reached (${owner.coPartnerQuota}). Contact administrator to upgrade quota (+₹2,000 per partner).`,
          code: 'QUOTA_EXCEEDED',
        });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
      if (dto.password) {
        updateData.passwordHash = await bcrypt.hash(dto.password, 10);
      }

      // Handle temporal site share updates if provided
      if (dto.siteShares && dto.siteShares.length > 0) {
        for (const shareInput of dto.siteShares) {
          const currentShare = partner.partnerShares.find((s) => s.siteId === shareInput.siteId);
          const effDate = shareInput.effectiveFrom
            ? new Date(`${shareInput.effectiveFrom}T00:00:00.000Z`)
            : new Date();

          const prevCloseDate = new Date(effDate);
          prevCloseDate.setDate(prevCloseDate.getDate() - 1);

          if (currentShare) {
            if (shareInput.isActive === false) {
              // Deactivate slice
              await tx.partnerSiteShare.update({
                where: { id: currentShare.id },
                data: {
                  effectiveTo: prevCloseDate < currentShare.effectiveFrom ? currentShare.effectiveFrom : prevCloseDate,
                  isActive: false,
                },
              });
            } else if (
              Number(currentShare.sharePercentage) !== Number(shareInput.sharePercentage)
            ) {
              // Version old slice
              await tx.partnerSiteShare.update({
                where: { id: currentShare.id },
                data: {
                  effectiveTo: prevCloseDate < currentShare.effectiveFrom ? currentShare.effectiveFrom : prevCloseDate,
                  isActive: false,
                },
              });
              // Create new slice
              await tx.partnerSiteShare.create({
                data: {
                  userId: partnerId,
                  siteId: shareInput.siteId,
                  sharePercentage: new Prisma.Decimal(shareInput.sharePercentage),
                  effectiveFrom: effDate,
                  effectiveTo: null,
                  isActive: true,
                },
              });
            }
          } else if (shareInput.isActive !== false) {
            // Validate site belongs to owner
            const site = await tx.site.findFirst({
              where: { id: shareInput.siteId, userId: ownerId, isActive: true },
            });
            if (!site) {
              throw new BadRequestException(`Site ${shareInput.siteId} is invalid or inactive`);
            }
            await tx.partnerSiteShare.create({
              data: {
                userId: partnerId,
                siteId: shareInput.siteId,
                sharePercentage: new Prisma.Decimal(shareInput.sharePercentage),
                effectiveFrom: effDate,
                effectiveTo: null,
                isActive: true,
              },
            });
          }
        }

        // Auto-deactivate check if 0 active shares remain
        const activeSharesRemaining = await tx.partnerSiteShare.count({
          where: { userId: partnerId, isActive: true, effectiveTo: null },
        });

        if (activeSharesRemaining === 0) {
          updateData.isActive = false;
        } else if (dto.isActive !== false && !partner.isActive) {
          updateData.isActive = true;
        }
      }

      await tx.user.update({
        where: { id: partnerId },
        data: updateData,
      });

      return tx.user.findUnique({
        where: { id: partnerId },
        select: {
          id: true,
          name: true,
          mobile: true,
          role: true,
          isActive: true,
          updatedAt: true,
          partnerShares: {
            orderBy: { effectiveFrom: 'desc' },
            include: { site: true },
          },
        },
      });
    });
  }

  async createSiteBoy(ownerId: string, dto: CreateSiteBoyDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!owner) {
      throw new NotFoundException('Owner account not found');
    }

    // 1. Enforce Quota
    const activeSiteBoys = await this.prisma.user.count({
      where: { ownerId, role: 'SITE_BOY', isActive: true },
    });
    if (activeSiteBoys >= owner.siteBoyQuota) {
      throw new BadRequestException({
        success: false,
        message: `Site boy quota limit reached (${owner.siteBoyQuota}). Contact administrator to upgrade quota (+₹2,000 per site boy).`,
        code: 'QUOTA_EXCEEDED',
      });
    }

    // 2. Validate Mobile
    const existing = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });
    if (existing) {
      throw new ConflictException('A user with this mobile number already exists');
    }

    // 3. Validate Assigned Site
    const site = await this.prisma.site.findFirst({
      where: { id: dto.assignedSiteId, userId: ownerId, isActive: true },
    });
    if (!site) {
      throw new BadRequestException('Assigned site is invalid or inactive');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ownerId,
        name: dto.name,
        businessName: owner.businessName,
        mobile: dto.mobile,
        passwordHash,
        role: 'SITE_BOY',
        assignedSiteId: dto.assignedSiteId,
        isActive: true,
        subscriptionPlan: owner.subscriptionPlan,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        assignedSiteId: true,
        createdAt: true,
        assignedSite: {
          select: {
            id: true,
            siteName: true,
            location: true,
            isActive: true,
          },
        },
      },
    });

    return user;
  }

  async updateSiteBoy(ownerId: string, siteBoyId: string, dto: UpdateSiteBoyDto) {
    const siteBoy = await this.prisma.user.findFirst({
      where: { id: siteBoyId, ownerId, role: 'SITE_BOY' },
    });

    if (!siteBoy) {
      throw new NotFoundException('Site boy not found');
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!owner) {
      throw new NotFoundException('Owner account not found');
    }

    // Quota check if activating an inactive site boy
    if (dto.isActive === true && !siteBoy.isActive) {
      const activeSiteBoys = await this.prisma.user.count({
        where: { ownerId, role: 'SITE_BOY', isActive: true },
      });
      if (activeSiteBoys >= owner.siteBoyQuota) {
        throw new BadRequestException({
          success: false,
          message: `Site boy quota limit reached (${owner.siteBoyQuota}). Contact administrator to upgrade quota (+₹2,000 per site boy).`,
          code: 'QUOTA_EXCEEDED',
        });
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.assignedSiteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: dto.assignedSiteId, userId: ownerId, isActive: true },
      });
      if (!site) {
        throw new BadRequestException('Assigned site is invalid or inactive');
      }
      updateData.assignedSiteId = dto.assignedSiteId;
    }

    const updated = await this.prisma.user.update({
      where: { id: siteBoyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        assignedSiteId: true,
        updatedAt: true,
        assignedSite: {
          select: {
            id: true,
            siteName: true,
            location: true,
            isActive: true,
          },
        },
      },
    });

    return updated;
  }

  async deleteSubAccount(ownerId: string, subAccountId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: subAccountId, ownerId },
    });

    if (!user) {
      throw new NotFoundException('Sub-account not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: subAccountId },
        data: { isActive: false },
      });

      if (user.role === 'CO_PARTNER') {
        await tx.partnerSiteShare.updateMany({
          where: { userId: subAccountId, isActive: true, effectiveTo: null },
          data: { effectiveTo: new Date(), isActive: false },
        });
      }
    });

    return { message: 'Sub-account deactivated successfully' };
  }
}
