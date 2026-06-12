import { describe, expect, it } from 'vitest'
import {
  canDeployPlugins,
  canManageUsers,
  canWriteApps,
  canWriteCategories,
  hasPermission,
  isRole,
  ROLE_PERMISSIONS,
} from './permissions.js'

describe('permissions', () => {
  it('recognizes valid roles', () => {
    expect(isRole('admin')).toBe(true)
    expect(isRole('editor')).toBe(true)
    expect(isRole('viewer')).toBe(true)
    expect(isRole('guest')).toBe(false)
    expect(isRole(null)).toBe(false)
  })

  it('grants full access to admin', () => {
    expect(canWriteApps('admin')).toBe(true)
    expect(canWriteCategories('admin')).toBe(true)
    expect(canManageUsers('admin')).toBe(true)
    expect(canDeployPlugins('admin')).toBe(true)
    expect(hasPermission('admin', 'users.write')).toBe(true)
  })

  it('grants edit access to editor without user management', () => {
    expect(canWriteApps('editor')).toBe(true)
    expect(canWriteCategories('editor')).toBe(true)
    expect(canManageUsers('editor')).toBe(false)
    expect(canDeployPlugins('editor')).toBe(false)
    expect(hasPermission('editor', 'users.read')).toBe(false)
  })

  it('restricts viewer to read-only', () => {
    expect(canWriteApps('viewer')).toBe(false)
    expect(canWriteCategories('viewer')).toBe(false)
    expect(canManageUsers('viewer')).toBe(false)
    expect(hasPermission('viewer', 'apps.read')).toBe(true)
    expect(hasPermission('viewer', 'apps.write')).toBe(false)
  })

  it('defines permissions for every role', () => {
    for (const role of ['admin', 'editor', 'viewer'] as const) {
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0)
    }
  })
})
