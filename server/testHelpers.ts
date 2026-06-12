import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import request, { type Agent } from 'supertest'
import { closeDb } from './db.js'
import { createApp } from './createApp.js'

export function setupTestDatabase(): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'it-portal-api-test-'))
  process.env.IT_PORTAL_DB_PATH = join(tempDir, 'test.db')
  closeDb()
  return tempDir
}

export function teardownTestDatabase(tempDir: string): void {
  closeDb()
  rmSync(tempDir, { recursive: true, force: true })
  delete process.env.IT_PORTAL_DB_PATH
}

export function createTestAgent() {
  return request.agent(createApp())
}

export async function loginAs(
  agent: Agent,
  username: string,
  password: string,
) {
  const response = await agent
    .post('/api/auth/login')
    .send({ username, password })
    .expect(200)

  return response.body.user as {
    id: string
    username: string
    displayName: string
    role: string
  }
}
