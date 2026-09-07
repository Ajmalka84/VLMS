import { SetMetadata } from '@nestjs/common';

export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'CO_PARTNER' | 'SITE_BOY' | 'USER';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

