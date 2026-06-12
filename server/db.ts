import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import type { PluginServerStatus } from '../shared/plugins.js'
import type { Role } from '../shared/permissions.js'
import { canWriteApps, isRole } from '../shared/permissions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultDbPath = resolve(__dirname, '..', 'data', 'it-portal.db')

export interface UserRow {
  id: string
  username: string
  display_name: string
  password_hash: string
  role: Role
  created_at: string
}

export interface PublicUser {
  id: string
  username: string
  displayName: string
  role: Role
  createdAt: string
}

export interface SessionRow {
  id: string
  user_id: string
  expires_at: string
  created_at: string
}

export interface ApplicationRow {
  id: string
  user_id: string
  plugin_id: string
  name: string
  url: string
  description: string
  category: string
  login_username: string
  login_password: string
  created_at: string
}

export interface CategoryRow {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export interface ServerPluginRow {
  plugin_id: string
  status: PluginServerStatus
  install_url: string
  install_dir: string
  target_host: string
  install_target: string
  last_error: string
  installed_at: string
  updated_at: string
}

let db: Database.Database | undefined

export function getDbPath(): string {
  return process.env.IT_PORTAL_DB_PATH ?? defaultDbPath
}

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath()
    mkdirSync(dirname(dbPath), { recursive: true })
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeSchema(db)
    migrateSchema(db)
    seedIfEmpty(db)
    ensureUserDashboards(db)
  }
  return db
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, name COLLATE NOCASE)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      login_username TEXT NOT NULL DEFAULT '',
      login_password TEXT NOT NULL DEFAULT '',
      plugin_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS server_plugins (
      plugin_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      install_url TEXT NOT NULL DEFAULT '',
      install_dir TEXT NOT NULL DEFAULT '',
      target_host TEXT NOT NULL DEFAULT '',
      install_target TEXT NOT NULL DEFAULT '',
      last_error TEXT NOT NULL DEFAULT '',
      installed_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application_shares (
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shared_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (application_id, user_id)
    );
  `)
}

function tableHasColumn(database: Database.Database, table: string, column: string): boolean {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string
  }>
  return columns.some((item) => item.name === column)
}

function getPrimaryUserId(database: Database.Database): string | undefined {
  const admin = database
    .prepare(
      `SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`,
    )
    .get() as { id: string } | undefined

  if (admin) return admin.id

  const anyUser = database
    .prepare(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`)
    .get() as { id: string } | undefined

  return anyUser?.id
}

function migrateSchema(database: Database.Database): void {
  if (!tableHasColumn(database, 'categories', 'user_id')) {
    database.exec(`ALTER TABLE categories ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE`)
  }

  if (!tableHasColumn(database, 'applications', 'user_id')) {
    database.exec(
      `ALTER TABLE applications ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE`,
    )
  }

  if (!tableHasColumn(database, 'applications', 'login_username')) {
    database.exec(`ALTER TABLE applications ADD COLUMN login_username TEXT NOT NULL DEFAULT ''`)
  }

  if (!tableHasColumn(database, 'applications', 'login_password')) {
    database.exec(`ALTER TABLE applications ADD COLUMN login_password TEXT NOT NULL DEFAULT ''`)
  }

  if (!tableHasColumn(database, 'applications', 'plugin_id')) {
    database.exec(`ALTER TABLE applications ADD COLUMN plugin_id TEXT NOT NULL DEFAULT ''`)
  }

  if (!tableHasColumn(database, 'server_plugins', 'target_host')) {
    database.exec(`ALTER TABLE server_plugins ADD COLUMN target_host TEXT NOT NULL DEFAULT ''`)
  }

  if (!tableHasColumn(database, 'server_plugins', 'install_target')) {
    database.exec(`ALTER TABLE server_plugins ADD COLUMN install_target TEXT NOT NULL DEFAULT ''`)
  }

  const ownerId = getPrimaryUserId(database)
  if (ownerId) {
    database
      .prepare(`UPDATE categories SET user_id = ? WHERE user_id IS NULL`)
      .run(ownerId)
    database
      .prepare(`UPDATE applications SET user_id = ? WHERE user_id IS NULL`)
      .run(ownerId)
  }
}

const SEED_CATEGORY_DEFS = [
  { key: 'vmware', name: 'VMware', color: 'blue', icon: 'server' },
  { key: 'network', name: 'Network', color: 'cyan', icon: 'network' },
  { key: 'vpn', name: 'VPN', color: 'emerald', icon: 'shield' },
  { key: 'security', name: 'Security', color: 'rose', icon: 'lock' },
  { key: 'monitoring', name: 'Monitoring', color: 'amber', icon: 'activity' },
  { key: 'other', name: 'Other', color: 'slate', icon: 'grid' },
] as const

export function seedUserDashboard(userId: string, role: Role): void {
  if (role === 'viewer') return

  const database = getDb()
  const existing = database
    .prepare(`SELECT COUNT(*) AS count FROM categories WHERE user_id = ?`)
    .get(userId) as { count: number }

  if (existing.count > 0) return

  const now = new Date().toISOString()
  const insertCategory = database.prepare(
    `INSERT INTO categories (id, user_id, name, color, icon, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )

  for (const category of SEED_CATEGORY_DEFS) {
    insertCategory.run(
      randomUUID(),
      userId,
      category.name,
      category.color,
      category.icon,
      now,
    )
  }
}

function ensureUserDashboards(database: Database.Database): void {
  const users = database
    .prepare(`SELECT id, role FROM users`)
    .all() as Array<{ id: string; role: Role }>
  for (const user of users) {
    seedUserDashboard(user.id, user.role)
  }
}

function seedIfEmpty(database: Database.Database): void {
  const userCount = database
    .prepare('SELECT COUNT(*) AS count FROM users')
    .get() as { count: number }

  if (userCount.count === 0) {
    const now = new Date().toISOString()
    const adminId = randomUUID()
    const passwordHash = bcrypt.hashSync('admin', 12)
    database
      .prepare(
        `INSERT INTO users (id, username, display_name, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(adminId, 'admin', 'Administrator', passwordHash, 'admin', now)
  }
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
  }
}

export function getUserById(id: string): UserRow | undefined {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | UserRow
    | undefined
}

export function getUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
    .get(username) as UserRow | undefined
}

export function listUsers(): PublicUser[] {
  const rows = getDb()
    .prepare('SELECT * FROM users ORDER BY username COLLATE NOCASE')
    .all() as UserRow[]
  return rows.map(toPublicUser)
}

export interface CreateUserInput {
  username: string
  displayName: string
  password: string
  role: Role
}

export interface UpdateUserInput {
  username?: string
  displayName?: string
  password?: string
  role?: Role
}

export function createUser(input: CreateUserInput): PublicUser {
  const now = new Date().toISOString()
  const id = randomUUID()
  const passwordHash = bcrypt.hashSync(input.password, 12)

  getDb()
    .prepare(
      `INSERT INTO users (id, username, display_name, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.username, input.displayName, passwordHash, input.role, now)

  seedUserDashboard(id, input.role)
  return toPublicUser(getUserById(id)!)
}

export function updateUser(id: string, input: UpdateUserInput): PublicUser | undefined {
  const existing = getUserById(id)
  if (!existing) return undefined

  const username = input.username ?? existing.username
  const displayName = input.displayName ?? existing.display_name
  const role = input.role ?? existing.role
  const passwordHash = input.password
    ? bcrypt.hashSync(input.password, 12)
    : existing.password_hash

  getDb()
    .prepare(
      `UPDATE users
       SET username = ?, display_name = ?, password_hash = ?, role = ?
       WHERE id = ?`,
    )
    .run(username, displayName, passwordHash, role, id)

  return toPublicUser(getUserById(id)!)
}

export function deleteUser(id: string): boolean {
  if (countUsers() <= 1) {
    return false
  }

  const result = getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
  return result.changes > 0
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM users').get() as {
    count: number
  }
  return row.count
}

export function verifyPassword(row: UserRow, password: string): boolean {
  return bcrypt.compareSync(password, row.password_hash)
}

export function createSession(userId: string, ttlHours = 24 * 7): SessionRow {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000)
  const session: SessionRow = {
    id: randomUUID(),
    user_id: userId,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  }

  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
    )
    .run(session.id, session.user_id, session.expires_at, session.created_at)

  return session
}

export function getSession(sessionId: string): SessionRow | undefined {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as
    | SessionRow
    | undefined
}

export function deleteSession(sessionId: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
}

export function deleteExpiredSessions(): void {
  getDb()
    .prepare('DELETE FROM sessions WHERE expires_at <= ?')
    .run(new Date().toISOString())
}

export interface ApplicationWithAccess extends ApplicationRow {
  shared: boolean
  canEdit: boolean
}

export interface ShareAssignment {
  userId: string
  applicationIds: string[]
}

export function listApplications(userId: string): ApplicationRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId) as ApplicationRow[]
}

export function listApplicationsForUser(
  userId: string,
  role: Role,
): ApplicationWithAccess[] {
  const canEditOwn = canWriteApps(role)

  if (role === 'admin') {
    return listApplications(userId).map((row) => ({
      ...row,
      shared: false,
      canEdit: true,
    }))
  }

  const ownApps =
    role === 'editor'
      ? listApplications(userId).map((row) => ({
          ...row,
          shared: false,
          canEdit: canEditOwn,
        }))
      : []

  const sharedRows = getDb()
    .prepare(
      `SELECT a.*
       FROM applications a
       INNER JOIN application_shares s ON s.application_id = a.id
       WHERE s.user_id = ?
       ORDER BY a.created_at DESC`,
    )
    .all(userId) as ApplicationRow[]

  const ownIds = new Set(ownApps.map((app) => app.id))
  const sharedApps = sharedRows
    .filter((row) => !ownIds.has(row.id))
    .map((row) => ({
      ...row,
      shared: true,
      canEdit: false,
    }))

  return [...ownApps, ...sharedApps]
}

function fetchCategoriesByIds(categoryIds: string[]): CategoryRow[] {
  if (categoryIds.length === 0) return []

  const placeholders = categoryIds.map(() => '?').join(',')
  return getDb()
    .prepare(
      `SELECT * FROM categories WHERE id IN (${placeholders}) ORDER BY name COLLATE NOCASE`,
    )
    .all(...categoryIds) as CategoryRow[]
}

export function collectCategoryRowsForUser(userId: string, role: Role): CategoryRow[] {
  const apps = listApplicationsForUser(userId, role)
  const categoryIds = [
    ...new Set([
      ...listCategories(userId).map((category) => category.id),
      ...apps.map((app) => app.category),
    ]),
  ]

  return fetchCategoriesByIds(categoryIds)
}

export function dedupeCategoriesByName(
  categories: CategoryRow[],
  preferredUserId?: string,
): CategoryRow[] {
  const groups = new Map<string, CategoryRow[]>()

  for (const category of categories) {
    const key = category.name.toLowerCase()
    const group = groups.get(key) ?? []
    group.push(category)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group) => {
      if (!preferredUserId) return group[0]
      return (
        group.find((category) => category.user_id === preferredUserId) ?? group[0]
      )
    })
    .sort((left, right) =>
      left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }),
    )
}

export function listCategoriesForUser(userId: string, role: Role): CategoryRow[] {
  const allCategories = collectCategoryRowsForUser(userId, role)
  if (role === 'viewer') return allCategories

  return dedupeCategoriesByName(allCategories, userId)
}

export function listMatchingCategoryIds(
  userId: string,
  role: Role,
  categoryId: string,
): string[] {
  const allCategories = collectCategoryRowsForUser(userId, role)
  const selected = allCategories.find((category) => category.id === categoryId)
  if (!selected) return [categoryId]

  const name = selected.name.toLowerCase()
  return allCategories
    .filter((category) => category.name.toLowerCase() === name)
    .map((category) => category.id)
}

export function listShareAssignments(adminId: string): ShareAssignment[] {
  const rows = getDb()
    .prepare(
      `SELECT user_id, application_id FROM application_shares WHERE shared_by = ?`,
    )
    .all(adminId) as Array<{ user_id: string; application_id: string }>

  const byUser = new Map<string, string[]>()
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? []
    list.push(row.application_id)
    byUser.set(row.user_id, list)
  }

  return [...byUser.entries()].map(([userId, applicationIds]) => ({
    userId,
    applicationIds,
  }))
}

export function setUserApplicationShares(
  adminId: string,
  targetUserId: string,
  applicationIds: string[],
): void {
  const target = getUserById(targetUserId)
  if (!target) {
    throw new Error('User not found.')
  }

  if (target.role === 'admin') {
    throw new Error('Cannot share connections with another administrator.')
  }

  const adminAppIds = new Set(listApplications(adminId).map((app) => app.id))
  for (const applicationId of applicationIds) {
    if (!adminAppIds.has(applicationId)) {
      throw new Error('One or more connections are not owned by the administrator.')
    }
  }

  const database = getDb()
  const replaceShares = database.transaction(() => {
    database
      .prepare(`DELETE FROM application_shares WHERE shared_by = ? AND user_id = ?`)
      .run(adminId, targetUserId)

    const insert = database.prepare(
      `INSERT INTO application_shares (application_id, user_id, shared_by, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    const now = new Date().toISOString()
    for (const applicationId of applicationIds) {
      insert.run(applicationId, targetUserId, adminId, now)
    }
  })

  replaceShares()
}

export function getApplication(userId: string, id: string): ApplicationRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM applications WHERE user_id = ? AND id = ?`)
    .get(userId, id) as ApplicationRow | undefined
}

export function getApplicationByPluginId(
  userId: string,
  pluginId: string,
): ApplicationRow | undefined {
  if (!pluginId) return undefined

  return getDb()
    .prepare(`SELECT * FROM applications WHERE user_id = ? AND plugin_id = ?`)
    .get(userId, pluginId) as ApplicationRow | undefined
}

export function resolveCategoryIdForName(
  userId: string,
  categoryName: string,
): string | undefined {
  const categories = listCategories(userId)
  if (categories.length === 0) return undefined

  const match = categories.find(
    (category) => category.name.toLowerCase() === categoryName.toLowerCase(),
  )
  if (match) return match.id

  const other = categories.find((category) => category.name.toLowerCase() === 'other')
  return other?.id ?? categories[0].id
}

export function createApplication(
  userId: string,
  input: Omit<ApplicationRow, 'id' | 'user_id' | 'created_at'>,
): ApplicationRow {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO applications (id, user_id, plugin_id, name, url, description, category, login_username, login_password, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      userId,
      input.plugin_id ?? '',
      input.name,
      input.url,
      input.description,
      input.category,
      input.login_username,
      input.login_password,
      createdAt,
    )

  return getApplication(userId, id)!
}

export function updateApplication(
  userId: string,
  id: string,
  input: Omit<ApplicationRow, 'id' | 'user_id' | 'created_at'>,
): ApplicationRow | undefined {
  const result = getDb()
    .prepare(
      `UPDATE applications
       SET plugin_id = ?, name = ?, url = ?, description = ?, category = ?, login_username = ?, login_password = ?
       WHERE user_id = ? AND id = ?`,
    )
    .run(
      input.plugin_id ?? '',
      input.name,
      input.url,
      input.description,
      input.category,
      input.login_username,
      input.login_password,
      userId,
      id,
    )

  if (result.changes === 0) return undefined
  return getApplication(userId, id)
}

export function deleteApplication(userId: string, id: string): boolean {
  const result = getDb()
    .prepare(`DELETE FROM applications WHERE user_id = ? AND id = ?`)
    .run(userId, id)
  return result.changes > 0
}

export function listCategories(userId: string): CategoryRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM categories WHERE user_id = ? ORDER BY name COLLATE NOCASE`,
    )
    .all(userId) as CategoryRow[]
}

export function getCategory(userId: string, id: string): CategoryRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM categories WHERE user_id = ? AND id = ?`)
    .get(userId, id) as CategoryRow | undefined
}

export function createCategory(
  userId: string,
  input: Omit<CategoryRow, 'id' | 'user_id' | 'created_at'>,
): CategoryRow {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO categories (id, user_id, name, color, icon, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, userId, input.name, input.color, input.icon, createdAt)

  return getCategory(userId, id)!
}

export function updateCategory(
  userId: string,
  id: string,
  input: Omit<CategoryRow, 'id' | 'user_id' | 'created_at'>,
): CategoryRow | undefined {
  const result = getDb()
    .prepare(
      `UPDATE categories SET name = ?, color = ?, icon = ?
       WHERE user_id = ? AND id = ?`,
    )
    .run(input.name, input.color, input.icon, userId, id)

  if (result.changes === 0) return undefined
  return getCategory(userId, id)
}

export function deleteCategory(userId: string, id: string): boolean {
  const result = getDb()
    .prepare(`DELETE FROM categories WHERE user_id = ? AND id = ?`)
    .run(userId, id)
  return result.changes > 0
}

export function countApplicationsInCategory(userId: string, categoryId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM applications WHERE user_id = ? AND category = ?`,
    )
    .get(userId, categoryId) as { count: number }
  return row.count
}

export function moveApplicationsToCategory(
  userId: string,
  fromId: string,
  toId: string,
): void {
  getDb()
    .prepare(
      `UPDATE applications SET category = ? WHERE user_id = ? AND category = ?`,
    )
    .run(toId, userId, fromId)
}

export function validateRole(role: unknown): role is Role {
  return isRole(role)
}

export function getServerPlugin(pluginId: string): ServerPluginRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM server_plugins WHERE plugin_id = ?`)
    .get(pluginId) as ServerPluginRow | undefined
}

function upsertServerPlugin(
  pluginId: string,
  status: PluginServerStatus,
  installUrl: string,
  installDir: string,
  targetHost: string,
  installTarget: string,
  lastError: string,
  installedAt: string,
): ServerPluginRow {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO server_plugins (plugin_id, status, install_url, install_dir, target_host, install_target, last_error, installed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(plugin_id) DO UPDATE SET
         status = excluded.status,
         install_url = excluded.install_url,
         install_dir = excluded.install_dir,
         target_host = excluded.target_host,
         install_target = excluded.install_target,
         last_error = excluded.last_error,
         installed_at = CASE WHEN excluded.installed_at != '' THEN excluded.installed_at ELSE server_plugins.installed_at END,
         updated_at = excluded.updated_at`,
    )
    .run(
      pluginId,
      status,
      installUrl,
      installDir,
      targetHost,
      installTarget,
      lastError,
      installedAt,
      now,
    )

  return getServerPlugin(pluginId)!
}

export function setServerPluginInstalling(
  pluginId: string,
  installDir: string,
  targetHost: string,
  installTarget: 'local' | 'remote',
): ServerPluginRow {
  return upsertServerPlugin(
    pluginId,
    'installing',
    '',
    installDir,
    targetHost,
    installTarget,
    '',
    '',
  )
}

export function setServerPluginInstalled(
  pluginId: string,
  installUrl: string,
  installDir: string,
  targetHost: string,
  installTarget: 'local' | 'remote',
): ServerPluginRow {
  return upsertServerPlugin(
    pluginId,
    'installed',
    installUrl,
    installDir,
    targetHost,
    installTarget,
    '',
    new Date().toISOString(),
  )
}

export function setServerPluginFailed(
  pluginId: string,
  installDir: string,
  targetHost: string,
  installTarget: 'local' | 'remote',
  lastError: string,
): ServerPluginRow {
  return upsertServerPlugin(
    pluginId,
    'failed',
    '',
    installDir,
    targetHost,
    installTarget,
    lastError,
    '',
  )
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = undefined
  }
}
