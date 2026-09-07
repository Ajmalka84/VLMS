import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from './roles.decorator';

export interface AuthUser {
  id: string;
  mobile: string;
  role: UserRole;
  ownerId: string;
  assignedSiteIds: string[];
  assignedSiteId?: string | null;
  name?: string | null;
  businessName?: string;
  isActive?: boolean;
  coPartnerQuota?: number;
  siteBoyQuota?: number;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  daysRemaining?: number | null;
  isGraceActive?: boolean;
  isExpired?: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

