import express from 'express'
import { closeDb, getDb } from './db.js'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { applicationsRouter } from './routes/applications.js'
import { categoriesRouter } from './routes/categories.js'
import { pluginsRouter } from './routes/plugins.js'

const PORT = Number(process.env.IT_PORTAL_API_PORT ?? 4501)

const app = express()

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/applications', applicationsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/plugins', pluginsRouter)

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({ error: 'An unexpected server error occurred.' })
  },
)

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
