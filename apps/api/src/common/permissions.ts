import type { UserRole } from './roles.js';

export const rolePermissions = {
  super_admin: [
    'support.impersonate',
    'analytics.read',
    'analytics.export',
    'analytics.override',
    'privacy.manage',
    'billing.manage',
    'billing.read',
    'bracket.manage',
    'bracket.read',
    'scheduling.manage',
    'scheduling.read',
    'waiver.manage',
    'waiver.sign',
    'waiver.read',
    'document.upload',
    'document.extract',
    'document.review',
    'document.read',
    'audit.read',
    'search.read',
  ],
  federation_admin: [
    'analytics.read',
    'analytics.export',
    'analytics.override',
    'privacy.review',
    'billing.read',
    'bracket.read',
    'scheduling.read',
  ],
  government_viewer: ['analytics.read', 'bracket.read', 'scheduling.read'],
  school_admin: [
    'school.manage',
    'athlete.manage',
    'privacy.manage',
    'billing.manage',
    'billing.read',
    'bracket.read',
    'scheduling.read',
    'waiver.sign',
    'waiver.read',
    'document.upload',
    'document.extract',
    'document.review',
    'document.read',
    'search.read',
  ],
  coach: ['match.stats.write', 'bracket.read', 'scheduling.read', 'search.read'],
  referee: [
    'match.stats.write',
    'match.verify.assist',
    'bracket.read',
    'scheduling.read',
    'search.read',
  ],
} as const satisfies Record<UserRole, readonly string[]>;

type RolePermissions = typeof rolePermissions;

export type Permission = RolePermissions[keyof RolePermissions][number];

export const roleHasPermission = (role: UserRole, permission: Permission) =>
  rolePermissions[role].includes(permission as never);
