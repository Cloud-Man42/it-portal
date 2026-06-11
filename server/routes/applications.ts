import { Router } from 'express'
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  listCategories,
  updateApplication,
} from '../db.js'
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../middleware.js'
import { routeParam } from '../params.js'

export const applicationsRouter = Router()

applicationsRouter.use(requireAuth)

function toApplicationDto(row: ReturnType<typeof listApplications>[number]) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    category: row.category,
    createdAt: row.created_at,
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
  const userId = req.user!.id
  res.json({ applications: listApplications(userId).map(toApplicationDto) })
})

applicationsRouter.post('/', requirePermission('apps.write'), (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  const description =
    typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const category = typeof req.body?.category === 'string' ? req.body.category : ''

  if (!name) {
    res.status(400).json({ error: 'Applikationsnamn krävs.' })
    return
  }

  if (!url || !isValidUrl(url)) {
    res.status(400).json({ error: 'Ange en giltig URL som börjar med http:// eller https://.' })
    return
  }

  if (!category || !categoryExists(userId, category)) {
    res.status(400).json({ error: 'Välj en giltig grupp.' })
    return
  }

  const created = createApplication(userId, { name, url, description, category })
  res.status(201).json({ application: toApplicationDto(created) })
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
    res.status(404).json({ error: 'Applikationen hittades inte.' })
    return
  }

  if (!name) {
    res.status(400).json({ error: 'Applikationsnamn krävs.' })
    return
  }

  if (!url || !isValidUrl(url)) {
    res.status(400).json({ error: 'Ange en giltig URL som börjar med http:// eller https://.' })
    return
  }

  if (!category || !categoryExists(userId, category)) {
    res.status(400).json({ error: 'Välj en giltig grupp.' })
    return
  }

  const updated = updateApplication(userId, id, { name, url, description, category })
  if (!updated) {
    res.status(404).json({ error: 'Applikationen hittades inte.' })
    return
  }

  res.json({ application: toApplicationDto(updated) })
})

applicationsRouter.delete('/:id', requirePermission('apps.write'), (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const deleted = deleteApplication(userId, routeParam(req, 'id'))
  if (!deleted) {
    res.status(404).json({ error: 'Applikationen hittades inte.' })
    return
  }

  res.json({ ok: true })
})
