import { useState } from 'react'
import { Copy, ExternalLink, Eye, EyeOff, Pencil, Trash2, User } from 'lucide-react'
import { CategoryIcon } from '../categories/CategoryIcon'
import { getCategoryMeta } from '../../lib/categories'
import type { CategoryGroup } from '../../types/category'
import type { Application } from '../../types/application'

interface AppCardProps {
  application: Application
  category?: CategoryGroup
  onEdit: (application: Application) => void
  onDelete: (application: Application) => void
  canEdit?: boolean
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

export function AppCard({
  application,
  category,
  onEdit,
  onDelete,
  canEdit = true,
}: AppCardProps) {
  const meta = getCategoryMeta(category)
  const [showPassword, setShowPassword] = useState(false)
  const hasCredentials =
    application.loginUsername.length > 0 || application.loginPassword.length > 0

  const openApplication = () => {
    window.open(application.url, '_blank', 'noopener,noreferrer')
  }

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation()
    const confirmed = window.confirm(
      `Delete "${application.name}"? This cannot be undone.`,
    )
    if (confirmed) {
      onDelete(application)
    }
  }

  const handleCopy = (event: React.MouseEvent, value: string) => {
    event.stopPropagation()
    void copyToClipboard(value)
  }

  return (
    <article
      onClick={openApplication}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openApplication()
        }
      }}
      role="button"
      tabIndex={0}
      className="group flex cursor-pointer flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-slate-600 hover:bg-slate-900 hover:shadow-lg hover:shadow-slate-950/50"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badgeClass}`}
        >
          {meta.label}
          <CategoryIcon iconId={meta.iconId} size="badge" />
        </span>
        {canEdit && (
          <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onEdit(application)
              }}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-sky-300"
              aria-label={`Edit ${application.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
              aria-label={`Delete ${application.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 text-base font-semibold text-slate-100">
          {application.name}
        </h3>
        <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-lg bg-slate-950/80 ring-1 ring-slate-700/80 ring-inset">
          <CategoryIcon iconId={meta.iconId} size="card" />
        </div>
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
        {application.description || 'No description provided.'}
      </p>

      {hasCredentials && (
        <div
          className="mt-4 space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="presentation"
        >
          {application.loginUsername.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-slate-300">
                {application.loginUsername}
              </span>
              <button
                type="button"
                onClick={(event) => handleCopy(event, application.loginUsername)}
                className="rounded p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-sky-300"
                aria-label="Copy username"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {application.loginPassword.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-4 shrink-0 text-center text-xs text-slate-500">•••</span>
              <span className="min-w-0 flex-1 truncate font-mono text-slate-300">
                {showPassword ? application.loginPassword : '••••••••'}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setShowPassword((current) => !current)
                }}
                className="rounded p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-sky-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={(event) => handleCopy(event, application.loginPassword)}
                className="rounded p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-sky-300"
                aria-label="Copy password"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-sm text-sky-400">
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{application.url}</span>
      </div>
    </article>
  )
}
