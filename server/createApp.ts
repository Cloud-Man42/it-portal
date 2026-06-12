import express from 'express'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { applicationsRouter } from './routes/applications.js'
import { categoriesRouter } from './routes/categories.js'
import { pluginsRouter } from './routes/plugins.js'
import { sharesRouter } from './routes/shares.js'

export function createApp() {
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
  app.use('/api/shares', sharesRouter)

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

  return app
}
