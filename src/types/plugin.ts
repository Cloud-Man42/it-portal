export type PluginServerStatus =
  | 'not_installed'
  | 'installing'
  | 'installed'
  | 'failed'
  | 'unsupported'

export type PluginInstallTarget = 'local' | 'remote'

export interface PluginInstallOptions {
  target: PluginInstallTarget
  host?: string
  username?: string
  password?: string
}

export interface PluginDefinition {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  loginUsername: string
  loginPassword: string
  deployable: boolean
  serverStatus: PluginServerStatus
  serverHealthy: boolean
  localHealthy: boolean
  targetHost: string
  installTarget: PluginInstallTarget | ''
  installUrl: string
  lastError: string
  needsInstallDecision: boolean
}

export interface PluginCatalogResponse {
  source: string
  updatedAt: string
  catalogUrl?: string
  portalHost: string
  plugins: PluginDefinition[]
}

export interface PluginInstallResponse {
  application: {
    id: string
    name: string
    url: string
    description: string
    category: string
    loginUsername: string
    loginPassword: string
    pluginId: string
    createdAt: string
  }
  serverInstalled: boolean
  installUrl: string
  targetHost: string
  installTarget: PluginInstallTarget
}
