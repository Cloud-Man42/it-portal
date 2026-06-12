import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findPluginById } from '../shared/plugins.js'
import {
  closeDb,
  createApplication,
  getApplicationByPluginId,
  getUserByUsername,
  listCategories,
  resolveCategoryIdForName,
} from './db.js'
import { clearPluginCatalogCache, loadPluginCatalog } from './pluginCatalog.js'

describe('plugin catalog install flow', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'it-portal-plugin-test-'))
    process.env.IT_PORTAL_DB_PATH = join(tempDir, 'test.db')
    process.env.IT_PORTAL_PLUGIN_CATALOG_URL = 'https://invalid.example/catalog.json'
    closeDb()
    clearPluginCatalogCache()
  })

  afterEach(() => {
    closeDb()
    rmSync(tempDir, { recursive: true, force: true })
    delete process.env.IT_PORTAL_DB_PATH
    delete process.env.IT_PORTAL_PLUGIN_CATALOG_URL
    clearPluginCatalogCache()
  })

  it('loads the local catalog when the remote URL fails', async () => {
    const catalog = await loadPluginCatalog(true)

    expect(catalog.plugins.length).toBeGreaterThan(0)
    expect(findPluginById(catalog, 'wake-on-lan')).toBeDefined()
    expect(findPluginById(catalog, 'vpn-portal')).toBeDefined()
    expect(findPluginById(catalog, 'wifi-optimizer')).toBeDefined()
  })

  it('tracks deployable plugin metadata in the catalog', async () => {
    const catalog = await loadPluginCatalog(true)
    const plugin = findPluginById(catalog, 'wifi-optimizer')!

    expect(plugin.deploy?.repository).toContain('unifi-ai-optimizer')
    expect(plugin.deploy?.port).toBe(8088)
  })

  it('detects duplicate plugin installs for the same user', async () => {
    const admin = getUserByUsername('admin')!
    const categoryId = listCategories(admin.id)[0].id

    createApplication(admin.id, {
      plugin_id: 'vpn-portal',
      name: 'VPN Portal',
      url: 'https://vpn.local/portal',
      description: 'VPN access',
      category: categoryId,
      login_username: '',
      login_password: '',
    })

    expect(getApplicationByPluginId(admin.id, 'vpn-portal')).toBeDefined()
  })
})
