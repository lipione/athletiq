import type { AuthenticatedUser } from '../common/store.js';

export type TenantType = 'platform' | 'school' | 'federation' | 'government';

export type TenantScope = {
  tenantId: string;
  tenantType: TenantType;
  actor: AuthenticatedUser;
};

export type TenantResolutionOptions = {
  schoolId?: string;
};
