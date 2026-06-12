import { useEffect, useMemo, useState } from 'react'
import { Download, Package, Search, X } from 'lucide-react'
import { ApiError } from '../../lib/api'
import type { Application } from '../../types/application'
import type { PluginDefinition } from '../../types/plugin'

interface PluginCatalogModalProps {
  open: boolean
  installedApplications: Application[]
  onClose: () => void
  onFetchCatalog: () => Promise<{
    source: string
    updatedAt: string
    plugins: PluginDefinition[]
  }>
  onInstall: (pluginId: string) => Promise<Application>
  loading: boolean
  installingId: string | null
}

export function PluginCatalogModal({
  open,
  installedApplications,
  onClose,
  onFetchCatalog,
  onInstall,
  loading,
  installingId,
}: PluginCatalogModalProps) {
  const [plugins, setPlugins] = useState<PluginDefinition[]>([])
  const [source, setSource] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const installedPluginIds = useMemo(
    () => new Set(installedApplications.map((app) => app.pluginId).filter(Boolean)),
    [installedApplications],
  )

  useEffect(() => {
    if (!open) return

    setSearchQuery('')
    setError(null)
    setSuccessMessage(null)

    void onFetchCatalog()
      .then((catalog) => {
        setPlugins(catalog.plugins)
        setSource(catalog.source)
      })
      .catch((fetchError: unknown) => {
        const message =
          fetchError instanceof ApiError
            ? fetchError.message
            : 'Failed to load plugin catalog.'
        setError(message)
        setPlugins([])
        setSource('')
      })
  }, [open, onFetchCatalog])

  const filteredPlugins = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return plugins

    return plugins.filter((plugin) => {
      const haystack = [
        plugin.name,
        plugin.description,
        plugin.category,
        ...plugin.tags,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [plugins, searchQuery])

  const handleInstall = async (plugin: PluginDefinition) => {
    setError(null)
    setSuccessMessage(null)

    try {
      await onInstall(plugin.id)
      setSuccessMessage(`"${plugin.name}" was added to your dashboard.`)
    } catch (installError: unknown) {
      const message =
        installError instanceof ApiError
          ? installError.message
          : 'Failed to install plugin.'
      setError(message)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plugin-catalog-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div>
            <h2
              id="plugin-catalog-title"
              className="text-lg font-semibold text-slate-100"
            >
              Add from catalog
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Choose applications to install from the IT Portal plugin catalog on GitHub.
            </p>
            {source && (
              <p className="mt-2 truncate text-xs text-slate-500" title={source}>
                Source: {source}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-800 px-6 py-4">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search plugins…"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </label>
        </div>

        <div className="overflow-y-auto p-6">
          {error && (
            <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {successMessage}
            </p>
          )}

          {loading ? (
            <p className="text-center text-sm text-slate-400">Loading catalog…</p>
          ) : filteredPlugins.length === 0 ? (
            <p className="text-center text-sm text-slate-400">
              {plugins.length === 0
                ? 'No plugins available in the catalog.'
                : 'No plugins match your search.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {filteredPlugins.map((plugin) => {
                const installed = installedPluginIds.has(plugin.id)
                const isInstalling = installingId === plugin.id

                return (
                  <li
                    key={plugin.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Package
                            className="h-4 w-4 shrink-0 text-sky-400"
                            aria-hidden="true"
                          />
                          <h3 className="font-medium text-slate-100">{plugin.name}</h3>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                            {plugin.category}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{plugin.description}</p>
                        {plugin.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {plugin.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-slate-800/80 px-2 py-0.5 text-xs text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={installed || isInstalling}
                        onClick={() => void handleInstall(plugin)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        {installed ? 'Installed' : isInstalling ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
