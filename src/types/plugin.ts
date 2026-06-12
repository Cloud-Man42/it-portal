export interface PluginDefinition {
  id: string
  name: string
  description: string
  url: string
  category: string
  tags: string[]
  loginUsername: string
  loginPassword: string
}

export interface PluginCatalogResponse {
  source: string
  updatedAt: string
  catalogUrl?: string
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
}
