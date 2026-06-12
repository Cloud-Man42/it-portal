import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  findPluginById,
  parsePluginCatalog,
  type PluginCatalog,
  type PluginDefinition,
} from '../shared/plugins.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localCatalogPath = resolve(__dirname, '..', 'plugins', 'catalog.json')

const DEFAULT_CATALOG_URL =
  'https://raw.githubusercontent.com/Cloud-Man42/it-portal/master/plugins/catalog.json'

const CACHE_TTL_MS = 5 * 60 * 1000

let cachedCatalog: PluginCatalog | undefined
let cachedAt = 0

export function getPluginCatalogUrl(): string {
  return process.env.IT_PORTAL_PLUGIN_CATALOG_URL ?? DEFAULT_CATALOG_URL
}

function readLocalCatalog(): PluginCatalog {
  const raw = readFileSync(localCatalogPath, 'utf8')
  return parsePluginCatalog(JSON.parse(raw))
}

async function fetchRemoteCatalog(url: string): Promise<PluginCatalog> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'it-portal-plugin-loader',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch plugin catalog (${response.status}).`)
  }

  return parsePluginCatalog(await response.json())
}

export async function loadPluginCatalog(forceRefresh = false): Promise<PluginCatalog> {
  const now = Date.now()
  if (!forceRefresh && cachedCatalog && now - cachedAt < CACHE_TTL_MS) {
    return cachedCatalog
  }

  const url = getPluginCatalogUrl()

  try {
    const catalog = await fetchRemoteCatalog(url)
    cachedCatalog = catalog
    cachedAt = now
    return catalog
  } catch (error) {
    const fallback = readLocalCatalog()
    cachedCatalog = fallback
    cachedAt = now

    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        `Plugin catalog fetch failed (${url}). Using local fallback.`,
        error instanceof Error ? error.message : error,
      )
    }

    return fallback
  }
}

export function getCachedPluginCatalog(): PluginCatalog | undefined {
  return cachedCatalog
}

export function getPluginDefinition(pluginId: string): PluginDefinition | undefined {
  const catalog = cachedCatalog ?? readLocalCatalog()
  return findPluginById(catalog, pluginId)
}

export function clearPluginCatalogCache(): void {
  cachedCatalog = undefined
  cachedAt = 0
}
