import { useCallback, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { Application } from '../types/application'
import type { PluginCatalogResponse, PluginInstallResponse } from '../types/plugin'

export function usePlugins() {
  const [loading, setLoading] = useState(false)
  const [installingId, setInstallingId] = useState<string | null>(null)

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    try {
      return await apiFetch<PluginCatalogResponse>('/api/plugins')
    } finally {
      setLoading(false)
    }
  }, [])

  const installPlugin = useCallback(async (pluginId: string): Promise<Application> => {
    setInstallingId(pluginId)
    try {
      const data = await apiFetch<PluginInstallResponse>(
        `/api/plugins/${encodeURIComponent(pluginId)}/install`,
        { method: 'POST' },
      )
      return data.application
    } finally {
      setInstallingId(null)
    }
  }, [])

  return {
    loading,
    installingId,
    fetchCatalog,
    installPlugin,
  }
}
