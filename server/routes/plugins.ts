import { Router } from 'express'
import {
  createApplication,
  getApplicationByPluginId,
  resolveCategoryIdForName,
  updateApplication,
} from '../db.js'
import { loadPluginCatalog } from '../pluginCatalog.js'
import { parsePluginInstallRequest } from '../../shared/pluginInstall.js'
import { findPluginById, isDeployablePlugin } from '../../shared/plugins.js'
import {
  ensurePluginInstalled,
  getPluginServerState,
  getServerHost,
} from '../pluginInstaller.js'
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../middleware.js'
import { routeParam } from '../params.js'

export const pluginsRouter = Router()

pluginsRouter.use(requireAuth)

async function toPluginDto(plugin: NonNullable<ReturnType<typeof findPluginById>>) {
  const server = await getPluginServerState(plugin)

  return {
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    category: plugin.category,
    tags: plugin.tags,
    loginUsername: plugin.loginUsername ?? '',
    loginPassword: plugin.loginPassword ?? '',
    deployable: isDeployablePlugin(plugin),
    serverStatus: server.status,
    serverHealthy: server.healthy,
    localHealthy: server.localHealthy,
    targetHost: server.targetHost,
    installTarget: server.installTarget,
    installUrl: server.installUrl,
    lastError: server.lastError,
    needsInstallDecision: !server.localHealthy && !server.healthy,
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
    const plugins = await Promise.all(catalog.plugins.map((plugin) => toPluginDto(plugin)))

    res.json({
      source: catalog.source,
      updatedAt: catalog.updatedAt,
      catalogUrl: process.env.IT_PORTAL_PLUGIN_CATALOG_URL,
      portalHost: getServerHost(),
      plugins,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load plugin catalog.'
    res.status(502).json({ error: message })
  }
})

pluginsRouter.post(
  '/:id/install',
  requirePermission('plugins.deploy'),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id
    const pluginId = routeParam(req, 'id')

    try {
      const installRequest = parsePluginInstallRequest(req.body ?? {})
      const catalog = await loadPluginCatalog()
      const plugin = findPluginById(catalog, pluginId)

      if (!plugin) {
        res.status(404).json({ error: 'Plugin not found in catalog.' })
        return
      }

      if (!isDeployablePlugin(plugin)) {
        res.status(400).json({ error: 'This plugin cannot be installed on the server.' })
        return
      }

      const existing = getApplicationByPluginId(userId, pluginId)
      const deployment = await ensurePluginInstalled(plugin, installRequest)

      const categoryId = resolveCategoryIdForName(userId, plugin.category)
      if (!categoryId) {
        res.status(400).json({ error: 'No category available for this plugin.' })
        return
      }

      if (existing) {
        const updated = updateApplication(userId, existing.id, {
          plugin_id: plugin.id,
          name: plugin.name,
          url: deployment.installUrl,
          description: plugin.description,
          category: categoryId,
          login_username: plugin.loginUsername ?? '',
          login_password: plugin.loginPassword ?? '',
        })

        if (!updated) {
          res.status(404).json({ error: 'Dashboard application not found.' })
          return
        }

        res.status(200).json({
          application: toApplicationDto(updated),
          serverInstalled: true,
          installUrl: deployment.installUrl,
          targetHost: deployment.targetHost,
          installTarget: deployment.installTarget,
        })
        return
      }

      const created = createApplication(userId, {
        plugin_id: plugin.id,
        name: plugin.name,
        url: deployment.installUrl,
        description: plugin.description,
        category: categoryId,
        login_username: plugin.loginUsername ?? '',
        login_password: plugin.loginPassword ?? '',
      })

      res.status(201).json({
        application: toApplicationDto(created),
        serverInstalled: true,
        installUrl: deployment.installUrl,
        targetHost: deployment.targetHost,
        installTarget: deployment.installTarget,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to install plugin.'
      const status = message.includes('required') || message.includes('invalid') ? 400 : 502
      res.status(status).json({ error: message })
    }
  },
)
