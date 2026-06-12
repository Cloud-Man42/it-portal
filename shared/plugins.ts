export type PluginServerStatus =
  | 'not_installed'
  | 'installing'
  | 'installed'
  | 'failed'
  | 'unsupported'

export interface PluginDeploySpec {
  repository: string
  branch: string
  installScript: string
  installDir: string
  port: number
  healthPath: string
  urlPath: string
  serviceName: string
  privateRepository?: boolean
}

export interface PluginDefinition {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  url?: string
  loginUsername?: string
  loginPassword?: string
  deploy?: PluginDeploySpec
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

export function isPluginDeploySpec(value: unknown): value is PluginDeploySpec {
  if (!value || typeof value !== 'object') return false

  const deploy = value as PluginDeploySpec

  return (
    isNonEmptyString(deploy.repository) &&
    isNonEmptyString(deploy.branch) &&
    isNonEmptyString(deploy.installScript) &&
    isNonEmptyString(deploy.installDir) &&
    typeof deploy.port === 'number' &&
    deploy.port > 0 &&
    deploy.port <= 65535 &&
    isNonEmptyString(deploy.healthPath) &&
    typeof deploy.urlPath === 'string' &&
    isNonEmptyString(deploy.serviceName)
  )
}

export function isPluginDefinition(value: unknown): value is PluginDefinition {
  if (!value || typeof value !== 'object') return false

  const plugin = value as PluginDefinition
  const tags = plugin.tags
  const hasDeploy = plugin.deploy !== undefined
  const url = plugin.url

  return (
    isNonEmptyString(plugin.id) &&
    isNonEmptyString(plugin.name) &&
    isNonEmptyString(plugin.description) &&
    (hasDeploy || (isNonEmptyString(url) && isValidUrl(url))) &&
    isNonEmptyString(plugin.category) &&
    Array.isArray(tags) &&
    tags.every((tag) => typeof tag === 'string') &&
    (plugin.deploy === undefined || isPluginDeploySpec(plugin.deploy))
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

export function isDeployablePlugin(plugin: PluginDefinition): boolean {
  return plugin.deploy !== undefined
}

export function buildPluginServiceUrl(
  host: string,
  deploy: PluginDeploySpec,
  protocol: 'http' | 'https' = 'https',
): string {
  const path = deploy.urlPath || '/'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${protocol}://${host}:${deploy.port}${normalizedPath}`
}

export function buildPluginHealthUrl(
  host: string,
  deploy: PluginDeploySpec,
  protocol: 'http' | 'https' = 'https',
): string {
  const path = deploy.healthPath.startsWith('/')
    ? deploy.healthPath
    : `/${deploy.healthPath}`
  return `${protocol}://${host}:${deploy.port}${path}`
}
