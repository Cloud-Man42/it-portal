import { closeDb, getDb } from './db.js'
import { createApp } from './createApp.js'

const PORT = Number(process.env.IT_PORTAL_API_PORT ?? 4501)

const app = createApp()

getDb()

const server = app.listen(PORT, () => {
  console.log(`IT Portal API listening on http://localhost:${PORT}`)
})

function shutdown() {
  server.close(() => {
    closeDb()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
