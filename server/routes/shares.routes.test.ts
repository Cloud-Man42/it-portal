import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createUser, getUserByUsername } from '../db.js'
import {
  createTestAdminApplications,
  createTestAgent,
  loginAs,
  setupTestDatabase,
  teardownTestDatabase,
} from '../testHelpers.js'

describe('shares routes', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = setupTestDatabase()
  })

  afterEach(() => {
    teardownTestDatabase(tempDir)
  })

  it('returns shareable applications and user assignments for admin', async () => {
    const admin = getUserByUsername('admin')!
    const viewer = createUser({
      username: 'share-viewer',
      displayName: 'Share Viewer',
      password: 'secret',
      role: 'viewer',
    })
    const adminApps = createTestAdminApplications(2)

    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    await agent
      .put(`/api/shares/${viewer.id}`)
      .send({ applicationIds: [adminApps[0].id] })
      .expect(200)

    const response = await agent.get('/api/shares').expect(200)
    expect(response.body.shareableApplications.length).toBe(2)
    expect(response.body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: viewer.id,
          applicationIds: [adminApps[0].id],
        }),
      ]),
    )
  })

  it('replaces share assignments for a user', async () => {
    const admin = getUserByUsername('admin')!
    const viewer = createUser({
      username: 'share-replace',
      displayName: 'Share Replace',
      password: 'secret',
      role: 'viewer',
    })
    const adminApps = createTestAdminApplications(2)

    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    await agent
      .put(`/api/shares/${viewer.id}`)
      .send({ applicationIds: [adminApps[0].id] })
      .expect(200)

    const replaced = await agent
      .put(`/api/shares/${viewer.id}`)
      .send({ applicationIds: [adminApps[1].id] })
      .expect(200)

    expect(replaced.body.applicationIds).toEqual([adminApps[1].id])
  })

  it('rejects invalid share payloads', async () => {
    const viewer = createUser({
      username: 'share-invalid',
      displayName: 'Share Invalid',
      password: 'secret',
      role: 'viewer',
    })

    const agent = createTestAgent()
    await loginAs(agent, 'admin', 'admin')

    const missingArray = await agent.put(`/api/shares/${viewer.id}`).send({}).expect(400)
    expect(missingArray.body.error).toBe('applicationIds must be an array.')

    const unknownUser = await agent
      .put('/api/shares/missing-user-id')
      .send({ applicationIds: [] })
      .expect(404)
    expect(unknownUser.body.error).toBe('User not found.')
  })

  it('rejects sharing with another administrator', async () => {
    const agent = createTestAgent()
    const admin = await loginAs(agent, 'admin', 'admin')

    const response = await agent
      .put(`/api/shares/${admin.id}`)
      .send({ applicationIds: [] })
      .expect(400)

    expect(response.body.error).toBe(
      'Cannot share connections with another administrator.',
    )
  })

  it('rejects applications not owned by the administrator', async () => {
    const viewer = createUser({
      username: 'share-target',
      displayName: 'Share Target',
      password: 'secret',
      role: 'viewer',
    })
    createUser({
      username: 'share-editor',
      displayName: 'Share Editor',
      password: 'secret',
      role: 'editor',
    })

    const editorAgent = createTestAgent()
    await loginAs(editorAgent, 'share-editor', 'secret')
    const categories = await editorAgent.get('/api/categories').expect(200)
    const created = await editorAgent
      .post('/api/applications')
      .send({
        name: 'Editor owned',
        url: 'https://editor-owned.local',
        category: categories.body.categories[0].id,
      })
      .expect(201)

    const adminAgent = createTestAgent()
    await loginAs(adminAgent, 'admin', 'admin')

    const response = await adminAgent
      .put(`/api/shares/${viewer.id}`)
      .send({ applicationIds: [created.body.application.id] })
      .expect(400)

    expect(response.body.error).toBe(
      'One or more connections are not owned by the administrator.',
    )
  })

  it('forbids non-admin users from managing shares', async () => {
    createUser({
      username: 'share-viewer-only',
      displayName: 'Share Viewer Only',
      password: 'secret',
      role: 'viewer',
    })

    const agent = createTestAgent()
    await loginAs(agent, 'share-viewer-only', 'secret')

    const response = await agent.get('/api/shares').expect(403)
    expect(response.body.error).toBe('You do not have permission for this action.')
  })
})
