import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  closeDb,
  countUsers,
  createApplication,
  createUser,
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
      name: 'Editor-only tool',
      url: 'https://editor.local',
      description: 'Only visible to editor',
      category: listCategories(editor.id)[0].id,
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
