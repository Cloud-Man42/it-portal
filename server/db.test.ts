import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  closeDb,
  countUsers,
  createApplication,
  createUser,
  getApplicationByPluginId,
  resolveCategoryIdForName,
  deleteUser,
  getUserByUsername,
  listApplications,
  listCategories,
  listUsers,
  updateUser,
  verifyPassword,
} from './db.js'

describe('user database', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'it-portal-test-'))
    process.env.IT_PORTAL_DB_PATH = join(tempDir, 'test.db')
    closeDb()
  })

  afterEach(() => {
    closeDb()
    rmSync(tempDir, { recursive: true, force: true })
    delete process.env.IT_PORTAL_DB_PATH
  })

  it('seeds a default admin user', () => {
    const admin = getUserByUsername('admin')
    expect(admin).toBeDefined()
    expect(admin?.role).toBe('admin')
    expect(verifyPassword(admin!, 'admin')).toBe(true)
  })

  it('creates and lists users', () => {
    const created = createUser({
      username: 'viewer1',
      displayName: 'Viewer One',
      password: 'secret',
      role: 'viewer',
    })

    expect(created.username).toBe('viewer1')
    expect(listUsers().some((item) => item.id === created.id)).toBe(true)
  })

  it('rejects duplicate usernames case-insensitively on create', () => {
    createUser({
      username: 'TestUser',
      displayName: 'Test',
      password: 'secret',
      role: 'viewer',
    })

    expect(() =>
      createUser({
        username: 'testuser',
        displayName: 'Duplicate',
        password: 'secret',
        role: 'viewer',
      }),
    ).toThrow()
  })

  it('updates user password and role', () => {
    const created = createUser({
      username: 'editor1',
      displayName: 'Editor',
      password: 'oldpass',
      role: 'viewer',
    })

    const updated = updateUser(created.id, {
      role: 'editor',
      password: 'newpass',
    })

    expect(updated?.role).toBe('editor')

    const row = getUserByUsername('editor1')
    expect(row).toBeDefined()
    expect(verifyPassword(row!, 'newpass')).toBe(true)
    expect(verifyPassword(row!, 'oldpass')).toBe(false)
  })

  it('seeds a personal dashboard for each user', () => {
    const admin = getUserByUsername('admin')!
    const viewer = createUser({
      username: 'viewer1',
      displayName: 'Viewer One',
      password: 'secret',
      role: 'viewer',
    })

    expect(listCategories(admin.id).length).toBeGreaterThan(0)
    expect(listApplications(admin.id).length).toBeGreaterThan(0)
    expect(listCategories(viewer.id).length).toBeGreaterThan(0)
    expect(listApplications(viewer.id).length).toBeGreaterThan(0)
  })

  it('keeps dashboards isolated per user', () => {
    const admin = getUserByUsername('admin')!
    const editor = createUser({
      username: 'editor1',
      displayName: 'Editor',
      password: 'secret',
      role: 'editor',
    })

    const adminCategory = listCategories(admin.id)[0]
    createApplication(editor.id, {
      plugin_id: '',
      name: 'Editor-only tool',
      url: 'https://editor.local',
      description: 'Only visible to editor',
      category: listCategories(editor.id)[0].id,
      login_username: '',
      login_password: '',
    })

    expect(listApplications(admin.id).some((app) => app.name === 'Editor-only tool')).toBe(
      false,
    )
    expect(listApplications(editor.id).some((app) => app.name === 'Editor-only tool')).toBe(
      true,
    )
    expect(
      listCategories(editor.id).some((category) => category.id === adminCategory.id),
    ).toBe(false)
  })

  it('stores application login credentials', () => {
    const admin = getUserByUsername('admin')!
    const categoryId = listCategories(admin.id)[0].id

    const created = createApplication(admin.id, {
      plugin_id: '',
      name: 'Credentialed App',
      url: 'https://app.local',
      description: 'With login',
      category: categoryId,
      login_username: 'svc-account',
      login_password: 's3cret!',
    })

    expect(created.login_username).toBe('svc-account')
    expect(created.login_password).toBe('s3cret!')

    const listed = listApplications(admin.id).find((app) => app.id === created.id)
    expect(listed?.login_username).toBe('svc-account')
    expect(listed?.login_password).toBe('s3cret!')
  })

  it('tracks installed plugins per user', () => {
    const admin = getUserByUsername('admin')!
    const networkCategory = listCategories(admin.id).find(
      (category) => category.name === 'Network',
    )!

    const created = createApplication(admin.id, {
      plugin_id: 'wake-on-lan',
      name: 'Wake on LAN',
      url: 'https://wakeonlan.local',
      description: 'Wake sleeping machines.',
      category: networkCategory.id,
      login_username: '',
      login_password: '',
    })

    expect(getApplicationByPluginId(admin.id, 'wake-on-lan')?.id).toBe(created.id)
    expect(getApplicationByPluginId(admin.id, 'missing-plugin')).toBeUndefined()
  })

  it('resolves plugin categories by name with fallback', () => {
    const admin = getUserByUsername('admin')!
    const vpnCategory = listCategories(admin.id).find(
      (category) => category.name === 'VPN',
    )!

    expect(resolveCategoryIdForName(admin.id, 'VPN')).toBe(vpnCategory?.id)
    expect(resolveCategoryIdForName(admin.id, 'Unknown Group')).toBe(
      listCategories(admin.id).find((category) => category.name === 'Other')?.id,
    )
  })

  it('prevents deleting the last user', () => {
    const users = listUsers()
    expect(countUsers()).toBeGreaterThanOrEqual(1)

    for (const user of users.slice(1)) {
      deleteUser(user.id)
    }

    expect(countUsers()).toBe(1)
    const remaining = listUsers()[0]
    expect(deleteUser(remaining.id)).toBe(false)
    expect(countUsers()).toBe(1)
  })
})
