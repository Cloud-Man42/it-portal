import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestAgent,
  loginAs,
  setupTestDatabase,
  teardownTestDatabase,
} from '../testHelpers.js'

describe('auth routes', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = setupTestDatabase()
  })

  afterEach(() => {
    teardownTestDatabase(tempDir)
  })

  it('logs in with valid credentials and returns the user profile', async () => {
    const agent = createTestAgent()
    const user = await loginAs(agent, 'admin', 'admin')

    expect(user.username).toBe('admin')
    expect(user.role).toBe('admin')

    const me = await agent.get('/api/auth/me').expect(200)
    expect(me.body.user.username).toBe('admin')
  })

  it('rejects login with missing credentials', async () => {
    const agent = createTestAgent()

    const response = await agent.post('/api/auth/login').send({ username: 'admin' }).expect(400)
    expect(response.body.error).toBe('Username and password are required.')
  })

  it('rejects login with invalid credentials', async () => {
    const agent = createTestAgent()

    const response = await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })
      .expect(401)

    expect(response.body.error).toBe('Invalid username or password.')
  })

  it('rejects /me without a session', async () => {
    const agent = createTestAgent()
    const response = await agent.get('/api/auth/me').expect(401)
    expect(response.body.error).toBe('Not signed in.')
  })

  it('logs out and clears the session', async () => {
    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    await agent.post('/api/auth/logout').expect(200)
    const response = await agent.get('/api/auth/me').expect(401)
    expect(response.body.error).toBe('Not signed in.')
  })
})
