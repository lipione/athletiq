export const userRoles = [
  'super_admin',
  'school_admin',
  'coach',
  'referee',
  'federation_admin',
  'government_viewer',
] as const;
export const publicRegisterRoles = ['school_admin', 'coach', 'referee'] as const;

export type UserRole = (typeof userRoles)[number];
export type PublicRegisterRole = (typeof publicRegisterRoles)[number];
