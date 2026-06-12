import { Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { ROLE_LABELS } from '../../lib/permissions'
import type { User } from '../../types/user'

interface UserManagerModalProps {
  open: boolean
  users: User[]
  currentUserId: string
  loading: boolean
  onClose: () => void
  onAdd: () => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export function UserManagerModal({
  open,
  users,
  currentUserId,
  loading,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: UserManagerModalProps) {
  if (!open) return null

  const handleDelete = (user: User) => {
    if (user.id === currentUserId) {
      window.alert('You cannot delete your own account.')
      return
    }

    const confirmed = window.confirm(
      `Delete user "${user.displayName}" (${user.username})?`,
    )
    if (confirmed) {
      onDelete(user)
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
        aria-labelledby="user-manager-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div>
            <h2
              id="user-manager-title"
              className="flex items-center gap-2 text-lg font-semibold text-slate-100"
            >
              <Users className="h-5 w-5 text-sky-400" aria-hidden="true" />
              User database
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Add, edit, and delete users with different permission levels.
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
          <button
            type="button"
            onClick={onAdd}
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-sky-500/50 hover:bg-slate-800/60 hover:text-sky-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add user
          </button>

          {loading ? (
            <p className="text-sm text-slate-500">Loading users…</p>
          ) : (
            <ul className="space-y-2">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">
                      {user.displayName}
                      {user.id === currentUserId && (
                        <span className="ml-2 text-xs text-sky-400">(you)</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-slate-500">@{user.username}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                      {ROLE_LABELS[user.role]}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(user)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-sky-300"
                        aria-label={`Edit ${user.displayName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUserId}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Delete ${user.displayName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
