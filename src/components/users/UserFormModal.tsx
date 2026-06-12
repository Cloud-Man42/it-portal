import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ROLE_LABELS } from '../../lib/permissions'
import type { Role } from '../../lib/permissions'
import type { User, UserInput } from '../../types/user'

interface UserFormModalProps {
  open: boolean
  mode: 'add' | 'edit'
  initialValues?: User
  existingUsernames: string[]
  onClose: () => void
  onSubmit: (input: UserInput) => void | Promise<unknown>
}

const ROLES: Role[] = ['admin', 'editor', 'viewer']

export function UserFormModal({
  open,
  mode,
  initialValues,
  existingUsernames,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const [form, setForm] = useState<UserInput>({
    username: '',
    displayName: '',
    password: '',
    role: 'viewer',
  })
  const [errors, setErrors] = useState<{
    username?: string
    password?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && initialValues) {
      setForm({
        username: initialValues.username,
        displayName: initialValues.displayName,
        password: '',
        role: initialValues.role,
      })
    } else {
      setForm({
        username: '',
        displayName: '',
        password: '',
        role: 'viewer',
      })
    }
    setErrors({})
  }, [open, mode, initialValues])

  if (!open) return null

  const validate = () => {
    const nextErrors: { username?: string; password?: string } = {}
    const trimmedUsername = form.username.trim()

    if (!trimmedUsername || trimmedUsername.length < 2) {
      nextErrors.username = 'Username must be at least 2 characters.'
    } else if (
      mode === 'add' &&
      existingUsernames.some(
        (name) => name.toLowerCase() === trimmedUsername.toLowerCase(),
      )
    ) {
      nextErrors.username = 'Username already exists.'
    } else if (
      mode === 'edit' &&
      initialValues &&
      trimmedUsername.toLowerCase() !== initialValues.username.toLowerCase() &&
      existingUsernames.some(
        (name) => name.toLowerCase() === trimmedUsername.toLowerCase(),
      )
    ) {
      nextErrors.username = 'Username already exists.'
    }

    if (mode === 'add' && (!form.password || form.password.length < 4)) {
      nextErrors.password = 'Password must be at least 4 characters.'
    } else if (
      mode === 'edit' &&
      form.password.length > 0 &&
      form.password.length < 4
    ) {
      nextErrors.password = 'Password must be at least 4 characters.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await onSubmit({
        username: form.username.trim(),
        displayName: form.displayName.trim() || form.username.trim(),
        password: form.password,
        role: form.role,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="user-form-title" className="text-lg font-semibold text-slate-100">
              {mode === 'add' ? 'Add user' : 'Edit user'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Manage sign-in details and permission level.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="user-username"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Username
            </label>
            <input
              id="user-username"
              type="text"
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-rose-400">{errors.username}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="user-display-name"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Display name
            </label>
            <input
              id="user-display-name"
              type="text"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="user-password"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Password{mode === 'edit' ? ' (leave blank to keep unchanged)' : ''}
            </label>
            <input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-rose-400">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="user-role"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Permission
            </label>
            <select
              id="user-role"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as Role,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : mode === 'add' ? 'Add' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
