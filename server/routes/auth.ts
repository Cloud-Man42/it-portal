import { Router } from 'express'
import {
  createSession,
  deleteSession,
  getUserByUsername,
  verifyPassword,
} from '../db.js'
import {
  clearSessionCookie,
  readSessionId,
  requireAuth,
  setSessionCookie,
  type AuthenticatedRequest,
} from '../middleware.js'

const SESSION_TTL_HOURS = 24 * 7
const SESSION_MAX_AGE_MS = SESSION_TTL_HOURS * 60 * 60 * 1000

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  if (!username || !password) {
    res.status(400).json({ error: 'Användarnamn och lösenord krävs.' })
    return
  }

  const user = getUserByUsername(username)
  if (!user || !verifyPassword(user, password)) {
    res.status(401).json({ error: 'Fel användarnamn eller lösenord.' })
    return
  }

  const session = createSession(user.id, SESSION_TTL_HOURS)
  setSessionCookie(res, session.id, SESSION_MAX_AGE_MS)

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
    },
  })
})

authRouter.post('/logout', (req, res) => {
  const sessionId = readSessionId(req)
  if (sessionId) {
    deleteSession(sessionId)
  }
  clearSessionCookie(res)
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user })
})
