import Database from 'better-sqlite3'

const dbPath = process.argv[2] ?? 'data/it-portal.db'
const db = new Database(dbPath)

console.log('USERS:')
console.log(db.prepare('SELECT id, username, display_name, role, created_at FROM users').all())
console.log('CATEGORIES:')
console.log(db.prepare('SELECT id, user_id, name FROM categories').all())
console.log('APPLICATIONS:')
console.log(
  db.prepare(
    'SELECT id, user_id, plugin_id, name, url, login_username FROM applications ORDER BY created_at',
  ).all(),
)
console.log('COUNTS:', {
  users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
  categories: db.prepare('SELECT COUNT(*) AS c FROM categories').get().c,
  applications: db.prepare('SELECT COUNT(*) AS c FROM applications').get().c,
})

db.close()
