export type Role = 'admin' | 'editor' | 'viewer'

export type Permission =
  | 'apps.read'
  | 'apps.write'
  | 'categories.read'
  | 'categories.write'
  | 'users.read'
  | 'users.write'

export const ROLE_PERMISSIONS: Record<Role, ReadonlyArray<Permission>> = {
  admin: [
    'apps.read',
    'apps.write',
    'categories.read',
    'categories.write',
    'users.read',
    'users.write',
  ],
  editor: ['apps.read', 'apps.write', 'categories.read', 'categories.write'],
  viewer: ['apps.read', 'categories.read'],
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Full access',
  editor: 'Editor',
  viewer: 'Read only',
}

export function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'editor' || value === 'viewer'
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function canWriteApps(role: Role): boolean {
  return hasPermission(role, 'apps.write')
}

export function canWriteCategories(role: Role): boolean {
  return hasPermission(role, 'categories.write')
}

export function canManageUsers(role: Role): boolean {
  return hasPermission(role, 'users.write')
}
