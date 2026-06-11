import type { NextFunction, Request, Response } from 'express'
import {
  deleteExpiredSessions,
  getSession,
  getUserById,
  toPublicUser,
  type PublicUser,
} from './db.js'
import type { Permission } from '../shared/permissions.js'
import { hasPermission } from '../shared/permissions.js'

const SESSION_COOKIE = 'it_portal_session'

export interface AuthenticatedRequest extends Request {
  user?: PublicUser
  sessionId?: string
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE
}

export function readSessionId(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return undefined

  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE) {
      return decodeURIComponent(rest.join('='))
    }
  }
  return undefined
}

export function setSessionCookie(res: Response, sessionId: string, maxAgeMs: number): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure}`,
  )
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  )
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  deleteExpiredSessions()

  const sessionId = readSessionId(req)
  if (!sessionId) {
    res.status(401).json({ error: 'Inte inloggad.' })
    return
  }

  const session = getSession(sessionId)
  if (!session || session.expires_at <= new Date().toISOString()) {
    res.status(401).json({ error: 'Sessionen har gått ut.' })
    return
  }

  const user = getUserById(session.user_id)
  if (!user) {
    res.status(401).json({ error: 'Användaren finns inte längre.' })
    return
  }

  req.user = toPublicUser(user)
  req.sessionId = sessionId
  next()
}

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Inte inloggad.' })
      return
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({ error: 'Du har inte behörighet för denna åtgärd.' })
      return
    }

    next()
  }
}
