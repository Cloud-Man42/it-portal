import { Router } from 'express'
import {
  createApplication,
  getApplicationByPluginId,
  resolveCategoryIdForName,
} from '../db.js'
import { loadPluginCatalog } from '../pluginCatalog.js'
import { findPluginById } from '../../shared/plugins.js'
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../middleware.js'
import { routeParam } from '../params.js'

export const pluginsRouter = Router()

pluginsRouter.use(requireAuth)

function toPluginDto(plugin: ReturnType<typeof findPluginById>) {
  if (!plugin) return undefined

  return {
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    url: plugin.url,
    category: plugin.category,
    tags: plugin.tags,
    loginUsername: plugin.loginUsername ?? '',
    loginPassword: plugin.loginPassword ?? '',
  }
}

function toApplicationDto(row: ReturnType<typeof createApplication>) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    category: row.category,
    loginUsername: row.login_username,
    loginPassword: row.login_password,
    pluginId: row.plugin_id,
    createdAt: row.created_at,
  }
}

pluginsRouter.get('/', requirePermission('apps.read'), async (_req, res) => {
  try {
    const catalog = await loadPluginCatalog()
    res.json({
      source: catalog.source,
      updatedAt: catalog.updatedAt,
      catalogUrl: process.env.IT_PORTAL_PLUGIN_CATALOG_URL,
      plugins: catalog.plugins.map((plugin) => toPluginDto(plugin)),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load plugin catalog.'
    res.status(502).json({ error: message })
  }
})

pluginsRouter.post(
  '/:id/install',
  requirePermission('apps.write'),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id
    const pluginId = routeParam(req, 'id')

    try {
      const catalog = await loadPluginCatalog()
      const plugin = findPluginById(catalog, pluginId)

      if (!plugin) {
        res.status(404).json({ error: 'Plugin not found in catalog.' })
        return
      }

      const existing = getApplicationByPluginId(userId, pluginId)
      if (existing) {
        res.status(409).json({
          error: 'This plugin is already installed on your dashboard.',
          application: toApplicationDto(existing),
        })
        return
      }

      const categoryId = resolveCategoryIdForName(userId, plugin.category)
      if (!categoryId) {
        res.status(400).json({ error: 'No category available for this plugin.' })
        return
      }

      const created = createApplication(userId, {
        plugin_id: plugin.id,
        name: plugin.name,
        url: plugin.url,
        description: plugin.description,
        category: categoryId,
        login_username: plugin.loginUsername ?? '',
        login_password: plugin.loginPassword ?? '',
      })

      res.status(201).json({ application: toApplicationDto(created) })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to install plugin.'
      res.status(502).json({ error: message })
    }
  },
)
