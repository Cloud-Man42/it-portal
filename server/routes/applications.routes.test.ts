import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createUser,
  getUserByUsername,
  listApplications,
  listCategories,
  setUserApplicationShares,
} from '../db.js'
import {
  createTestAgent,
  loginAs,
  setupTestDatabase,
  teardownTestDatabase,
} from '../testHelpers.js'

describe('applications routes', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = setupTestDatabase()
  })

  afterEach(() => {
    teardownTestDatabase(tempDir)
  })

  it('lists owned applications for admin', async () => {
    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    const response = await agent.get('/api/applications').expect(200)
    expect(response.body.applications.length).toBeGreaterThan(0)
    expect(response.body.applications.every((app: { canEdit: boolean }) => app.canEdit)).toBe(
      true,
    )
  })

  it('returns only shared applications for read-only users', async () => {
    const admin = getUserByUsername('admin')!
    const viewer = createUser({
      username: 'viewer-app',
      displayName: 'Viewer App',
      password: 'secret',
      role: 'viewer',
    })
    const adminApp = listApplications(admin.id)[0]

    setUserApplicationShares(admin.id, viewer.id, [adminApp.id])

    const agent = createTestAgent()
    await loginAs(agent, 'viewer-app', 'secret')

    const response = await agent.get('/api/applications').expect(200)
    expect(response.body.applications).toHaveLength(1)
    expect(response.body.applications[0]).toMatchObject({
      id: adminApp.id,
      shared: true,
      canEdit: false,
    })
  })

  it('creates an application with valid input', async () => {
    const agent = createTestAgent()
    const admin = await loginAs(agent, 'admin', 'admin')
    const categoryId = listCategories(admin.id)[0].id

    const response = await agent
      .post('/api/applications')
      .send({
        name: 'New Tool',
        url: 'https://tool.local',
        description: 'Test app',
        category: categoryId,
      })
      .expect(201)

    expect(response.body.application.name).toBe('New Tool')
    expect(response.body.application.canEdit).toBe(true)
  })

  it('rejects invalid application payloads', async () => {
    const agent = createTestAgent()
    const admin = await loginAs(agent, 'admin', 'admin')
    const categoryId = listCategories(admin.id)[0].id

    const missingName = await agent
      .post('/api/applications')
      .send({ url: 'https://tool.local', category: categoryId })
      .expect(400)
    expect(missingName.body.error).toBe('Application name is required.')

    const invalidUrl = await agent
      .post('/api/applications')
      .send({ name: 'Bad URL', url: 'ftp://bad.local', category: categoryId })
      .expect(400)
    expect(invalidUrl.body.error).toBe(
      'Enter a valid URL starting with http:// or https://.',
    )
  })

  it('forbids read-only users from creating applications', async () => {
    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')
    await agent
      .post('/api/users')
      .send({
        username: 'viewer-create',
        displayName: 'Viewer Create',
        password: 'secret',
        role: 'viewer',
      })
      .expect(201)

    const viewerAgent = createTestAgent()
    const viewer = await loginAs(viewerAgent, 'viewer-create', 'secret')
    const categoryId = listCategories(viewer.id)[0].id

    const response = await viewerAgent
      .post('/api/applications')
      .send({
        name: 'Blocked',
        url: 'https://blocked.local',
        category: categoryId,
      })
      .expect(403)

    expect(response.body.error).toBe('You do not have permission for this action.')
  })

  it('prevents updating applications owned by another user', async () => {
    const admin = getUserByUsername('admin')!
    const adminApp = listApplications(admin.id)[0]

    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')
    await agent
      .post('/api/users')
      .send({
        username: 'editor-update',
        displayName: 'Editor Update',
        password: 'secret',
        role: 'editor',
      })
      .expect(201)

    const editorAgent = createTestAgent()
    const editor = await loginAs(editorAgent, 'editor-update', 'secret')
    const categoryId = listCategories(editor.id)[0].id

    const response = await editorAgent
      .put(`/api/applications/${adminApp.id}`)
      .send({
        name: 'Hijacked',
        url: 'https://hijacked.local',
        category: categoryId,
      })
      .expect(404)

    expect(response.body.error).toBe('Application not found.')
  })
})
