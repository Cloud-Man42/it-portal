import { Router } from 'express'
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplicationsForUser,
  listCategories,
  updateApplication,
  type ApplicationRow,
  type ApplicationWithAccess,
} from '../db.js'
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../middleware.js'
import { routeParam } from '../params.js'

export const applicationsRouter = Router()

applicationsRouter.use(requireAuth)

function toOwnedApplicationDto(row: ApplicationWithAccess | ApplicationRow) {
  const shared = 'shared' in row ? row.shared : false
  const canEdit = 'canEdit' in row ? row.canEdit : true
  return toApplicationDto({ ...row, shared, canEdit })
}

function toApplicationDto(row: ApplicationWithAccess) {
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
    shared: row.shared,
    canEdit: row.canEdit,
  }
}

function parseCredentialFields(body: Record<string, unknown>) {
  return {
    login_username:
      typeof body.loginUsername === 'string' ? body.loginUsername.trim() : '',
    login_password:
      typeof body.loginPassword === 'string' ? body.loginPassword : '',
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function categoryExists(userId: string, categoryId: string): boolean {
  return listCategories(userId).some((category) => category.id === categoryId)
}

applicationsRouter.get('/', requirePermission('apps.read'), (req: AuthenticatedRequest, res) => {
  const user = req.user!
  res.json({
    applications: listApplicationsForUser(user.id, user.role).map(toApplicationDto),
  })
})

applicationsRouter.post('/', requirePermission('apps.write'), (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  const description =
    typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const category = typeof req.body?.category === 'string' ? req.body.category : ''

  if (!name) {
    res.status(400).json({ error: 'Application name is required.' })
    return
  }

  if (!url || !isValidUrl(url)) {
    res.status(400).json({ error: 'Enter a valid URL starting with http:// or https://.' })
    return
  }

  if (!category || !categoryExists(userId, category)) {
    res.status(400).json({ error: 'Select a valid group.' })
    return
  }

  const credentials = parseCredentialFields(req.body ?? {})
  const created = createApplication(userId, {
    plugin_id: '',
    name,
    url,
    description,
    category,
    ...credentials,
  })
  res.status(201).json({ application: toOwnedApplicationDto(created) })
})

applicationsRouter.put('/:id', requirePermission('apps.write'), (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const id = routeParam(req, 'id')
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  const description =
    typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const category = typeof req.body?.category === 'string' ? req.body.category : ''

  if (!getApplication(userId, id)) {
    res.status(404).json({ error: 'Application not found.' })
    return
  }

  if (!name) {
    res.status(400).json({ error: 'Application name is required.' })
    return
  }

  if (!url || !isValidUrl(url)) {
    res.status(400).json({ error: 'Enter a valid URL starting with http:// or https://.' })
    return
  }

  if (!category || !categoryExists(userId, category)) {
    res.status(400).json({ error: 'Select a valid group.' })
    return
  }

  const existingApp = getApplication(userId, id)
  const credentials = parseCredentialFields(req.body ?? {})
  const updated = updateApplication(userId, id, {
    plugin_id: existingApp?.plugin_id ?? '',
    name,
    url,
    description,
    category,
    ...credentials,
  })
  if (!updated) {
    res.status(404).json({ error: 'Application not found.' })
    return
  }

  res.json({ application: toOwnedApplicationDto(updated) })
})

applicationsRouter.delete('/:id', requirePermission('apps.write'), (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const deleted = deleteApplication(userId, routeParam(req, 'id'))
  if (!deleted) {
    res.status(404).json({ error: 'Application not found.' })
    return
  }

  res.json({ ok: true })
})
