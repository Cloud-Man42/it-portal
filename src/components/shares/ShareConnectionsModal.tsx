import { useEffect, useState } from 'react'
import { Share2, X } from 'lucide-react'
import { ROLE_LABELS } from '../../lib/permissions'
import type { Application } from '../../types/application'
import type { ShareableUser } from '../../hooks/useShares'

interface ShareConnectionsModalProps {
  open: boolean
  shareableApplications: Application[]
  users: ShareableUser[]
  loading: boolean
  onClose: () => void
  onSave: (userId: string, applicationIds: string[]) => Promise<void>
}

export function ShareConnectionsModal({
  open,
  shareableApplications,
  users,
  loading,
  onClose,
  onSave,
}: ShareConnectionsModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || users.length === 0) return

    const nextUser = users.find((user) => user.id === selectedUserId) ?? users[0]
    setSelectedUserId(nextUser.id)
    setSelectedApplicationIds(nextUser.applicationIds)
  }, [open, users])

  if (!open) return null

  const toggleApplication = (applicationId: string) => {
    setSelectedApplicationIds((current) =>
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : [...current, applicationId],
    )
  }

  const handleSave = async () => {
    if (!selectedUserId) return

    setSaving(true)
    try {
      await onSave(selectedUserId, selectedApplicationIds)
    } finally {
      setSaving(false)
    }
  }

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
        aria-labelledby="share-connections-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div>
            <h2
              id="share-connections-title"
              className="flex items-center gap-2 text-lg font-semibold text-slate-100"
            >
              <Share2 className="h-5 w-5 text-sky-400" aria-hidden="true" />
              Share connections
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Assign your configured connections to editors and read-only users.
              Read-only users cannot add their own connections.
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

        <div className="overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-slate-400">Loading share settings…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400">
              Add editors or read-only users before sharing connections.
            </p>
          ) : shareableApplications.length === 0 ? (
            <p className="text-sm text-slate-400">
              Add connections to your dashboard before sharing them with other users.
            </p>
          ) : (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="share-user-select"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  User
                </label>
                <select
                  id="share-user-select"
                  value={selectedUserId}
                  onChange={(event) => {
                    const userId = event.target.value
                    const user = users.find((item) => item.id === userId)
                    setSelectedUserId(userId)
                    setSelectedApplicationIds(user?.applicationIds ?? [])
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} ({user.username}) — {ROLE_LABELS[user.role]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-300">Connections</p>
                <div className="space-y-2">
                  {shareableApplications.map((application) => {
                    const checked = selectedApplicationIds.includes(application.id)
                    return (
                      <label
                        key={application.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 transition hover:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          aria-label={application.name}
                          checked={checked}
                          onChange={() => toggleApplication(application.id)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-100">
                            {application.name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {application.url}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              saving ||
              loading ||
              users.length === 0 ||
              shareableApplications.length === 0 ||
              !selectedUserId
            }
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save shares'}
          </button>
        </div>
      </div>
    </div>
  )
}
