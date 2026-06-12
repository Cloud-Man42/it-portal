import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createUser } from '../db.js'
import {
  createTestAgent,
  loginAs,
  setupTestDatabase,
  teardownTestDatabase,
} from '../testHelpers.js'

describe('users routes', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = setupTestDatabase()
  })

  afterEach(() => {
    teardownTestDatabase(tempDir)
  })

  it('lists users for admin', async () => {
    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    const response = await agent.get('/api/users').expect(200)
    expect(response.body.users.some((user: { username: string }) => user.username === 'admin')).toBe(
      true,
    )
  })

  it('creates a user with valid input', async () => {
    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    const response = await agent
      .post('/api/users')
      .send({
        username: 'new-viewer',
        displayName: 'New Viewer',
        password: 'secret',
        role: 'viewer',
      })
      .expect(201)

    expect(response.body.user.username).toBe('new-viewer')
    expect(response.body.user.role).toBe('viewer')
  })

  it('rejects invalid user payloads', async () => {
    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    const shortUsername = await agent
      .post('/api/users')
      .send({ username: 'a', password: 'secret', role: 'viewer' })
      .expect(400)
    expect(shortUsername.body.error).toBe('Username must be at least 2 characters.')

    const shortPassword = await agent
      .post('/api/users')
      .send({ username: 'valid-user', password: 'abc', role: 'viewer' })
      .expect(400)
    expect(shortPassword.body.error).toBe('Password must be at least 4 characters.')

    const invalidRole = await agent
      .post('/api/users')
      .send({ username: 'valid-user', password: 'secret', role: 'superuser' })
      .expect(400)
    expect(invalidRole.body.error).toBe('Invalid role.')
  })

  it('rejects duplicate usernames', async () => {
    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    await agent
      .post('/api/users')
      .send({
        username: 'duplicate-user',
        displayName: 'Duplicate',
        password: 'secret',
        role: 'viewer',
      })
      .expect(201)

    const response = await agent
      .post('/api/users')
      .send({
        username: 'duplicate-user',
        displayName: 'Duplicate Again',
        password: 'secret',
        role: 'viewer',
      })
      .expect(409)

    expect(response.body.error).toBe('Username already exists.')
  })

  it('forbids non-admin users from managing users', async () => {
    createUser({
      username: 'viewer-users',
      displayName: 'Viewer Users',
      password: 'secret',
      role: 'viewer',
    })

    const agent = createTestAgent()
    await loginAs(agent, 'viewer-users', 'secret')

    const response = await agent.get('/api/users').expect(403)
    expect(response.body.error).toBe('You do not have permission for this action.')
  })

  it('prevents deleting your own account', async () => {
    const agent = createTestAgent()
    const admin = await loginAs(agent, 'admin', 'admin')

    const response = await agent.delete(`/api/users/${admin.id}`).expect(400)
    expect(response.body.error).toBe('You cannot delete your own account.')
  })
})
