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
    res.status(400).json({ error: 'Användarnamn måste vara minst 2 tecken.' })
    return
  }

  if (!password || password.length < 4) {
    res.status(400).json({ error: 'Lösenord måste vara minst 4 tecken.' })
    return
  }

  if (!validateRole(role)) {
    res.status(400).json({ error: 'Ogiltig roll.' })
    return
  }

  if (getUserByUsername(username)) {
    res.status(409).json({ error: 'Användarnamnet finns redan.' })
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
    res.status(404).json({ error: 'Användaren hittades inte.' })
    return
  }

  const username =
    typeof req.body?.username === 'string' ? req.body.username.trim() : undefined
  const displayName =
    typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : undefined
  const password = typeof req.body?.password === 'string' ? req.body.password : undefined
  const role = req.body?.role

  if (username !== undefined && username.length < 2) {
    res.status(400).json({ error: 'Användarnamn måste vara minst 2 tecken.' })
    return
  }

  if (password !== undefined && password.length > 0 && password.length < 4) {
    res.status(400).json({ error: 'Lösenord måste vara minst 4 tecken.' })
    return
  }

  if (role !== undefined && !validateRole(role)) {
    res.status(400).json({ error: 'Ogiltig roll.' })
    return
  }

  if (username && getUserByUsername(username) && existing.username.toLowerCase() !== username.toLowerCase()) {
    res.status(409).json({ error: 'Användarnamnet finns redan.' })
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
    res.status(400).json({ error: 'Du kan inte ta bort ditt eget konto.' })
    return
  }

  if (countUsers() <= 1) {
    res.status(400).json({ error: 'Minst en användare måste finnas kvar.' })
    return
  }

  const existing = getUserById(id)
  if (!existing) {
    res.status(404).json({ error: 'Användaren hittades inte.' })
    return
  }

  deleteUser(id)
  res.json({ ok: true })
})
