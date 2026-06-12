import { Router } from 'express'
import {
  getUserById,
  listApplications,
  listShareAssignments,
  listUsers,
  setUserApplicationShares,
  type ApplicationRow,
} from '../db.js'
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../middleware.js'
import { routeParam } from '../params.js'

export const sharesRouter = Router()

sharesRouter.use(requireAuth)

function toApplicationDto(row: ApplicationRow) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    category: row.category,
    loginUsername: row.login_username,
    loginPassword: row.login_password,
    pluginId: row.plugin_id,
    createdAt: row.created_at,
  }
}

sharesRouter.get('/', requirePermission('apps.share'), (req: AuthenticatedRequest, res) => {
  const adminId = req.user!.id
  const assignments = listShareAssignments(adminId)
  const assignmentMap = new Map(
    assignments.map((assignment) => [assignment.userId, assignment.applicationIds]),
  )

  res.json({
    shareableApplications: listApplications(adminId).map(toApplicationDto),
    users: listUsers()
      .filter((user) => user.role !== 'admin')
      .map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        applicationIds: assignmentMap.get(user.id) ?? [],
      })),
  })
})

sharesRouter.put('/:userId', requirePermission('apps.share'), (req: AuthenticatedRequest, res) => {
  const adminId = req.user!.id
  const targetUserId = routeParam(req, 'userId')

  if (!Array.isArray(req.body?.applicationIds)) {
    res.status(400).json({ error: 'applicationIds must be an array.' })
    return
  }

  const applicationIds = req.body.applicationIds.filter(
    (value: unknown): value is string => typeof value === 'string',
  )

  const target = getUserById(targetUserId)
  if (!target) {
    res.status(404).json({ error: 'User not found.' })
    return
  }

  if (target.role === 'admin') {
    res.status(400).json({ error: 'Cannot share connections with another administrator.' })
    return
  }

  try {
    setUserApplicationShares(adminId, targetUserId, applicationIds)
    res.json({ ok: true, applicationIds })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update shares.'
    const status = message === 'User not found.' ? 404 : 400
    res.status(status).json({ error: message })
  }
})
