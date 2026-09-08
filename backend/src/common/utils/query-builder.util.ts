import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Builds a strict UTC / timezone-safe Prisma DateTimeFilter for date ranges.
 * Automatically expands the end date to end-of-day (23:59:59.999Z).
 */
export function buildDateRangeFilter(
  startDate?: string,
  endDate?: string,
): Prisma.DateTimeFilter | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};

  if (startDate) {
    const start = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
    if (!isNaN(start.getTime())) {
      filter.gte = start;
    }
  }

  if (endDate) {
    const end = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
    if (!isNaN(end.getTime())) {
      filter.lte = end;
    }
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Resolves the effective target tenant User ID.
 * Supports Super Admin customerId override or defaults to the first active tenant if no customerId is specified.
 */
export async function resolveTargetUserId(
  prisma: PrismaService,
  user: AuthUser,
  customerIdOverride?: string,
): Promise<string> {
  let targetUserId = user.ownerId || user.id;

  if (user.role === 'SUPER_ADMIN') {
    if (customerIdOverride) {
      targetUserId = customerIdOverride;
    } else {
      const firstCust = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (firstCust) {
        targetUserId = firstCust.id;
      }
    }
  }

  return targetUserId;
}

/**
 * Builds a role-aware site filter for queries and verifies permissions for sub-accounts.
 */
export function buildTenantSiteScope(
  user: AuthUser,
  requestedSiteId?: string,
  ownerId?: string,
): {
  whereSiteClause: any;
  siteIdFilter?: string | { in: string[] };
} {
  const effectiveOwnerId = ownerId || user.ownerId || user.id;
  const whereSiteClause: any = { userId: effectiveOwnerId };

  if (user.role === 'SITE_BOY') {
    if (requestedSiteId && user.assignedSiteId && requestedSiteId !== user.assignedSiteId) {
      throw new ForbiddenException('Site supervisor is strictly locked to their assigned quarry site.');
    }
    const siteId = user.assignedSiteId || requestedSiteId;
    return {
      whereSiteClause,
      siteIdFilter: siteId,
    };
  }

  if (user.role === 'CO_PARTNER') {
    const allowed = user.assignedSiteIds || [];
    if (requestedSiteId) {
      if (!allowed.includes(requestedSiteId)) {
        throw new ForbiddenException('You do not have access to this quarry site.');
      }
      return {
        whereSiteClause,
        siteIdFilter: requestedSiteId,
      };
    }
    return {
      whereSiteClause,
      siteIdFilter: { in: allowed },
    };
  }

  // Owner or Super Admin
  if (requestedSiteId) {
    return {
      whereSiteClause,
      siteIdFilter: requestedSiteId,
    };
  }

  return {
    whereSiteClause,
    siteIdFilter: undefined,
  };
}
