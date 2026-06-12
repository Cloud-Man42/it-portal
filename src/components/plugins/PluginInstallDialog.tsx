import { useEffect, useState } from 'react'
import { Server, X } from 'lucide-react'
import type { PluginDefinition } from '../../types/plugin'

export interface PluginInstallFormValues {
  target: 'local' | 'remote'
  host: string
  username: string
  password: string
}

interface PluginInstallDialogProps {
  open: boolean
  plugin: PluginDefinition | null
  portalHost: string
  onClose: () => void
  onConfirm: (values: PluginInstallFormValues) => void
  submitting: boolean
}

export function PluginInstallDialog({
  open,
  plugin,
  portalHost,
  onClose,
  onConfirm,
  submitting,
}: PluginInstallDialogProps) {
  const [target, setTarget] = useState<'local' | 'remote'>('local')
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTarget('local')
    setHost('')
    setUsername('')
    setPassword('')
    setError(null)
  }, [open, plugin?.id])

  if (!open || !plugin) return null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (target === 'remote') {
      if (!host.trim()) {
        setError('Enter the remote server hostname or IP address.')
        return
      }
      if (!username.trim()) {
        setError('Enter the SSH username for the remote server.')
        return
      }
      if (!password) {
        setError('Enter the SSH password for the remote server.')
        return
      }
    }

    onConfirm({
      target,
      host: target === 'remote' ? host.trim() : portalHost,
      username: target === 'remote' ? username.trim() : '',
      password: target === 'remote' ? password : '',
    })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plugin-install-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div>
            <h2 id="plugin-install-title" className="text-lg font-semibold text-slate-100">
              Install {plugin.name}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              This application is not running on the IT Portal server ({portalHost}).
              Choose where it should be installed.
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-200">Installation target</legend>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <input
                type="radio"
                name="install-target"
                value="local"
                checked={target === 'local'}
                onChange={() => setTarget('local')}
                className="mt-1"
              />
              <span>
                <span className="flex items-center gap-2 font-medium text-slate-100">
                  <Server className="h-4 w-4 text-sky-400" aria-hidden="true" />
                  Install on this server
                </span>
                <span className="mt-1 block text-sm text-slate-400">
                  Download from GitHub and install on {portalHost}.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <input
                type="radio"
                name="install-target"
                value="remote"
                checked={target === 'remote'}
                onChange={() => setTarget('remote')}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-slate-100">Install on another server</span>
                <span className="mt-1 block text-sm text-slate-400">
                  Connect over SSH and install the application on a different host.
                </span>
              </span>
            </label>
          </fieldset>

          {target === 'remote' && (
            <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <div>
                <label htmlFor="remote-host" className="mb-1.5 block text-sm text-slate-300">
                  Server hostname or IP
                </label>
                <input
                  id="remote-host"
                  type="text"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  placeholder="192.168.0.73 or wifi.example.internal"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label htmlFor="remote-username" className="mb-1.5 block text-sm text-slate-300">
                  SSH username
                </label>
                <input
                  id="remote-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="hm"
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label htmlFor="remote-password" className="mb-1.5 block text-sm text-slate-300">
                  SSH password
                </label>
                <input
                  id="remote-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {submitting ? 'Installing…' : target === 'remote' ? 'Install remotely' : 'Install here'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
