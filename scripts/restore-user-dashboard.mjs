import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'

const dbPath = process.argv[2] ?? 'data/it-portal.db'
const sourceUsername = process.argv[3] ?? 'admin'
const targetUsername = process.argv[4] ?? 'hm'

const db = new Database(dbPath)

const sourceUser = db
  .prepare('SELECT id, username FROM users WHERE username = ?')
  .get(sourceUsername)
const targetUser = db
  .prepare('SELECT id, username FROM users WHERE username = ?')
  .get(targetUsername)

if (!sourceUser || !targetUser) {
  throw new Error(`Missing user(s): source=${sourceUsername}, target=${targetUsername}`)
}

const restore = db.transaction(() => {
  db.prepare('DELETE FROM applications WHERE user_id = ?').run(targetUser.id)
  db.prepare('DELETE FROM categories WHERE user_id = ?').run(targetUser.id)

  const sourceCategories = db
    .prepare('SELECT id, name, color, icon, created_at FROM categories WHERE user_id = ?')
    .all(sourceUser.id)

  const categoryMap = new Map()
  const insertCategory = db.prepare(
    `INSERT INTO categories (id, user_id, name, color, icon, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )

  for (const category of sourceCategories) {
    const newId = randomUUID()
    categoryMap.set(category.id, newId)
    insertCategory.run(
      newId,
      targetUser.id,
      category.name,
      category.color,
      category.icon,
      category.created_at,
    )
  }

  const sourceApps = db
    .prepare(
      `SELECT plugin_id, name, url, description, category, login_username, login_password, created_at
       FROM applications WHERE user_id = ?`,
    )
    .all(sourceUser.id)

  const insertApp = db.prepare(
    `INSERT INTO applications (id, user_id, plugin_id, name, url, description, category, login_username, login_password, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  for (const app of sourceApps) {
    const mappedCategory = categoryMap.get(app.category)
    if (!mappedCategory) {
      throw new Error(`Missing category mapping for application "${app.name}"`)
    }

    insertApp.run(
      randomUUID(),
      targetUser.id,
      app.plugin_id ?? '',
      app.name,
      app.url,
      app.description,
      mappedCategory,
      app.login_username ?? '',
      app.login_password ?? '',
      app.created_at,
    )
  }
})

restore()

console.log(
  JSON.stringify(
    {
      restoredFrom: sourceUsername,
      restoredTo: targetUsername,
      categories: db
        .prepare('SELECT COUNT(*) AS c FROM categories WHERE user_id = ?')
        .get(targetUser.id).c,
      applications: db
        .prepare('SELECT COUNT(*) AS c FROM applications WHERE user_id = ?')
        .get(targetUser.id).c,
    },
    null,
    2,
  ),
)

db.pragma('wal_checkpoint(FULL)')
db.close()
