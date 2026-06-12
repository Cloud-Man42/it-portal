import { Router } from 'express'
import {
  countUsers,
  createUser,
  deleteUser,
  getUserById,
  getUserByUsername,
  listUsers,
  updateUser,
  validateRole,
} from '../db.js'
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../middleware.js'
import { routeParam } from '../params.js'

export const usersRouter = Router()

usersRouter.use(requireAuth)

usersRouter.get('/', requirePermission('users.read'), (_req, res) => {
  res.json({ users: listUsers() })
})

usersRouter.post('/', requirePermission('users.write'), (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const displayName =
    typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const role = req.body?.role

  if (!username || username.length < 2) {
    res.status(400).json({ error: 'Username must be at least 2 characters.' })
    return
  }

  if (!password || password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters.' })
    return
  }

  if (!validateRole(role)) {
    res.status(400).json({ error: 'Invalid role.' })
    return
  }

  if (getUserByUsername(username)) {
    res.status(409).json({ error: 'Username already exists.' })
    return
  }

  const user = createUser({
    username,
    displayName: displayName || username,
    password,
    role,
  })

  res.status(201).json({ user })
})

usersRouter.put('/:id', requirePermission('users.write'), (req: AuthenticatedRequest, res) => {
  const id = routeParam(req, 'id')
  const existing = getUserById(id)
  if (!existing) {
    res.status(404).json({ error: 'User not found.' })
    return
  }

  const username =
    typeof req.body?.username === 'string' ? req.body.username.trim() : undefined
  const displayName =
    typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : undefined
  const password = typeof req.body?.password === 'string' ? req.body.password : undefined
  const role = req.body?.role

  if (username !== undefined && username.length < 2) {
    res.status(400).json({ error: 'Username must be at least 2 characters.' })
    return
  }

  if (password !== undefined && password.length > 0 && password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters.' })
    return
  }

  if (role !== undefined && !validateRole(role)) {
    res.status(400).json({ error: 'Invalid role.' })
    return
  }

  if (username && getUserByUsername(username) && existing.username.toLowerCase() !== username.toLowerCase()) {
    res.status(409).json({ error: 'Username already exists.' })
    return
  }

  const user = updateUser(id, {
    username,
    displayName,
    password: password && password.length > 0 ? password : undefined,
    role,
  })

  res.json({ user })
})

usersRouter.delete('/:id', requirePermission('users.write'), (req: AuthenticatedRequest, res) => {
  const id = routeParam(req, 'id')

  if (req.user?.id === id) {
    res.status(400).json({ error: 'You cannot delete your own account.' })
    return
  }

  if (countUsers() <= 1) {
    res.status(400).json({ error: 'At least one user must remain.' })
    return
  }

  const existing = getUserById(id)
  if (!existing) {
    res.status(404).json({ error: 'User not found.' })
    return
  }

  deleteUser(id)
  res.json({ ok: true })
})
