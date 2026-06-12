import { describe, expect, it, vi } from 'vitest'
import type { Response } from 'express'
import {
  getSessionCookieName,
  readSessionId,
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from './middleware.js'

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as Response & { statusCode: number; body: unknown }
}

describe('middleware', () => {
  it('exposes the session cookie name', () => {
    expect(getSessionCookieName()).toBe('it_portal_session')
  })

  it('reads the session id from cookies', () => {
    const req = {
      headers: {
        cookie: 'other=value; it_portal_session=abc%20123; foo=bar',
      },
    }

    expect(readSessionId(req as AuthenticatedRequest)).toBe('abc 123')
  })

  it('returns undefined when the session cookie is missing', () => {
    const req = { headers: { cookie: 'other=value' } }
    expect(readSessionId(req as AuthenticatedRequest)).toBeUndefined()
  })

  it('rejects unauthenticated requests in requireAuth', () => {
    const req = { headers: {} } as AuthenticatedRequest
    const res = createMockResponse()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Not signed in.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects requests without permission', () => {
    const req = {
      user: {
        id: 'viewer-id',
        username: 'viewer',
        displayName: 'Viewer',
        role: 'viewer',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    } as AuthenticatedRequest
    const res = createMockResponse()
    const next = vi.fn()

    requirePermission('apps.share')(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({ error: 'You do not have permission for this action.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('allows requests when the user has permission', () => {
    const req = {
      user: {
        id: 'admin-id',
        username: 'admin',
        displayName: 'Admin',
        role: 'admin',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    } as AuthenticatedRequest
    const res = createMockResponse()
    const next = vi.fn()

    requirePermission('apps.share')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.body).toBeUndefined()
  })
})
