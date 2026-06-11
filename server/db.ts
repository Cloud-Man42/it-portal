import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import type { Role } from '../shared/permissions.js'
import { isRole } from '../shared/permissions.js'

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
  name: string
  url: string
  description: string
  category: string
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
      created_at TEXT NOT NULL
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

const SEED_APPLICATION_DEFS = [
  {
    name: 'VMware vCenter',
    url: 'https://vcenter.local',
    description: 'Manage virtual machines, hosts, and clusters.',
    categoryKey: 'vmware',
  },
  {
    name: 'Firewall Admin',
    url: 'https://firewall.local/admin',
    description: 'Configure firewall rules, NAT, and security policies.',
    categoryKey: 'security',
  },
  {
    name: 'VPN Portal',
    url: 'https://vpn.local/portal',
    description: 'User VPN access, certificates, and connection status.',
    categoryKey: 'vpn',
  },
  {
    name: 'Network Monitoring',
    url: 'https://monitoring.local',
    description: 'Network health dashboards and alerts.',
    categoryKey: 'monitoring',
  },
  {
    name: 'DNS Admin',
    url: 'https://dns.local/admin',
    description: 'Manage DNS zones and records.',
    categoryKey: 'network',
  },
] as const

export function seedUserDashboard(userId: string): void {
  const database = getDb()
  const existing = database
    .prepare(`SELECT COUNT(*) AS count FROM categories WHERE user_id = ?`)
    .get(userId) as { count: number }

  if (existing.count > 0) return

  const now = new Date().toISOString()
  const categoryIds: Record<string, string> = {}

  const insertCategory = database.prepare(
    `INSERT INTO categories (id, user_id, name, color, icon, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )

  for (const category of SEED_CATEGORY_DEFS) {
    const id = randomUUID()
    categoryIds[category.key] = id
    insertCategory.run(id, userId, category.name, category.color, category.icon, now)
  }

  const insertApplication = database.prepare(
    `INSERT INTO applications (id, user_id, name, url, description, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )

  for (const app of SEED_APPLICATION_DEFS) {
    insertApplication.run(
      randomUUID(),
      userId,
      app.name,
      app.url,
      app.description,
      categoryIds[app.categoryKey],
      now,
    )
  }
}

function ensureUserDashboards(database: Database.Database): void {
  const users = database.prepare(`SELECT id FROM users`).all() as Array<{ id: string }>
  for (const user of users) {
    seedUserDashboard(user.id)
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
      .run(adminId, 'admin', 'Administratör', passwordHash, 'admin', now)
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

  seedUserDashboard(id)
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

export function listApplications(userId: string): ApplicationRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId) as ApplicationRow[]
}

export function getApplication(userId: string, id: string): ApplicationRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM applications WHERE user_id = ? AND id = ?`)
    .get(userId, id) as ApplicationRow | undefined
}

export function createApplication(
  userId: string,
  input: Omit<ApplicationRow, 'id' | 'user_id' | 'created_at'>,
): ApplicationRow {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO applications (id, user_id, name, url, description, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, userId, input.name, input.url, input.description, input.category, createdAt)

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
       SET name = ?, url = ?, description = ?, category = ?
       WHERE user_id = ? AND id = ?`,
    )
    .run(input.name, input.url, input.description, input.category, userId, id)

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

export function closeDb(): void {
  if (db) {
    db.close()
    db = undefined
  }
}
