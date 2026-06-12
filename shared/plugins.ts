export interface PluginDefinition {
  id: string
  name: string
  description: string
  url: string
  category: string
  tags: string[]
  loginUsername?: string
  loginPassword?: string
}

export interface PluginCatalog {
  version: number
  updatedAt: string
  source: string
  plugins: PluginDefinition[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function isPluginDefinition(value: unknown): value is PluginDefinition {
  if (!value || typeof value !== 'object') return false

  const plugin = value as PluginDefinition
  const tags = plugin.tags

  return (
    isNonEmptyString(plugin.id) &&
    isNonEmptyString(plugin.name) &&
    isNonEmptyString(plugin.description) &&
    isNonEmptyString(plugin.url) &&
    isValidUrl(plugin.url) &&
    isNonEmptyString(plugin.category) &&
    Array.isArray(tags) &&
    tags.every((tag) => typeof tag === 'string')
  )
}

export function parsePluginCatalog(data: unknown): PluginCatalog {
  if (!data || typeof data !== 'object') {
    throw new Error('Plugin catalog must be a JSON object.')
  }

  const catalog = data as PluginCatalog

  if (typeof catalog.version !== 'number' || catalog.version < 1) {
    throw new Error('Plugin catalog version is invalid.')
  }

  if (!isNonEmptyString(catalog.updatedAt)) {
    throw new Error('Plugin catalog updatedAt is required.')
  }

  if (!isNonEmptyString(catalog.source)) {
    throw new Error('Plugin catalog source is required.')
  }

  if (!Array.isArray(catalog.plugins)) {
    throw new Error('Plugin catalog plugins must be an array.')
  }

  const plugins = catalog.plugins.filter(isPluginDefinition)
  if (plugins.length === 0) {
    throw new Error('Plugin catalog contains no valid plugins.')
  }

  const ids = new Set<string>()
  for (const plugin of plugins) {
    if (ids.has(plugin.id)) {
      throw new Error(`Duplicate plugin id: ${plugin.id}`)
    }
    ids.add(plugin.id)
  }

  return {
    version: catalog.version,
    updatedAt: catalog.updatedAt,
    source: catalog.source,
    plugins,
  }
}

export function findPluginById(
  catalog: PluginCatalog,
  pluginId: string,
): PluginDefinition | undefined {
  return catalog.plugins.find((plugin) => plugin.id === pluginId)
}
