import { Router } from 'express'
import {
  countApplicationsInCategory,
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  listCategoriesForUser,
  moveApplicationsToCategory,
  updateCategory,
} from '../db.js'
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../middleware.js'
import { routeParam } from '../params.js'

export const categoriesRouter = Router()

categoriesRouter.use(requireAuth)

function toCategoryDto(row: ReturnType<typeof listCategories>[number]) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
  }
}

categoriesRouter.get('/', requirePermission('categories.read'), (req: AuthenticatedRequest, res) => {
  const user = req.user!
  res.json({
    categories: listCategoriesForUser(user.id, user.role).map(toCategoryDto),
  })
})

categoriesRouter.post('/', requirePermission('categories.write'), (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const color = typeof req.body?.color === 'string' ? req.body.color : ''
  const icon = typeof req.body?.icon === 'string' ? req.body.icon : ''

  if (!name) {
    res.status(400).json({ error: 'Group name is required.' })
    return
  }

  const duplicate = listCategories(userId).some(
    (category) => category.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) {
    res.status(409).json({ error: 'A group with that name already exists.' })
    return
  }

  const created = createCategory(userId, {
    name,
    color: color || 'slate',
    icon: icon || 'grid',
  })
  res.status(201).json({ category: toCategoryDto(created) })
})

categoriesRouter.put('/:id', requirePermission('categories.write'), (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const id = routeParam(req, 'id')
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const color = typeof req.body?.color === 'string' ? req.body.color : ''
  const icon = typeof req.body?.icon === 'string' ? req.body.icon : ''

  if (!getCategory(userId, id)) {
    res.status(404).json({ error: 'Group not found.' })
    return
  }

  if (!name) {
    res.status(400).json({ error: 'Group name is required.' })
    return
  }

  const duplicate = listCategories(userId).some(
    (category) => category.id !== id && category.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) {
    res.status(409).json({ error: 'A group with that name already exists.' })
    return
  }

  const updated = updateCategory(userId, id, {
    name,
    color: color || 'slate',
    icon: icon || 'grid',
  })
  if (!updated) {
    res.status(404).json({ error: 'Group not found.' })
    return
  }

  res.json({ category: toCategoryDto(updated) })
})

categoriesRouter.delete('/:id', requirePermission('categories.write'), (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const id = routeParam(req, 'id')
  const categories = listCategories(userId)

  if (categories.length <= 1) {
    res.status(400).json({ error: 'At least one group must remain.' })
    return
  }

  const existing = categories.find((category) => category.id === id)
  if (!existing) {
    res.status(404).json({ error: 'Group not found.' })
    return
  }

  const appCount = countApplicationsInCategory(userId, id)
  if (appCount > 0) {
    const fallback = categories.find((category) => category.id !== id)
    if (!fallback) {
      res.status(400).json({ error: 'No fallback group available.' })
      return
    }
    moveApplicationsToCategory(userId, id, fallback.id)
  }

  deleteCategory(userId, id)
  res.json({ ok: true })
})
