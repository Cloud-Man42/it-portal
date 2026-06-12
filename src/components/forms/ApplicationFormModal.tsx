import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { isValidUrl } from '../../lib/storage'
import type { CategoryGroup } from '../../types/category'
import type { Application, ApplicationInput } from '../../types/application'

interface ApplicationFormModalProps {
  open: boolean
  mode: 'add' | 'edit'
  categories: CategoryGroup[]
  initialValues?: Application
  onClose: () => void
  onSubmit: (input: ApplicationInput) => void
}

const emptyForm = (category: string): ApplicationInput => ({
  name: '',
  url: '',
  description: '',
  category,
  loginUsername: '',
  loginPassword: '',
  pluginId: '',
})

interface FormErrors {
  name?: string
  url?: string
  category?: string
}

export function ApplicationFormModal({
  open,
  mode,
  categories,
  initialValues,
  onClose,
  onSubmit,
}: ApplicationFormModalProps) {
  const defaultCategory = categories[0]?.id ?? ''
  const [form, setForm] = useState<ApplicationInput>(emptyForm(defaultCategory))
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && initialValues) {
      setForm({
        name: initialValues.name,
        url: initialValues.url,
        description: initialValues.description,
        category: initialValues.category,
        loginUsername: initialValues.loginUsername,
        loginPassword: initialValues.loginPassword,
        pluginId: initialValues.pluginId,
      })
    } else {
      setForm(emptyForm(defaultCategory))
    }
    setErrors({})
  }, [open, mode, initialValues, defaultCategory])

  if (!open) return null

  const validate = () => {
    const nextErrors: FormErrors = {}
    const trimmedName = form.name.trim()
    const trimmedUrl = form.url.trim()

    if (!trimmedName) {
      nextErrors.name = 'Application name is required.'
    }

    if (!trimmedUrl) {
      nextErrors.url = 'URL is required.'
    } else if (!isValidUrl(trimmedUrl)) {
      nextErrors.url = 'Enter a valid URL starting with http:// or https://.'
    }

    if (!form.category) {
      nextErrors.category = 'Select a group.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    onSubmit({
      name: form.name.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      category: form.category,
      loginUsername: form.loginUsername.trim(),
      loginPassword: form.loginPassword,
      pluginId: form.pluginId,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-form-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="application-form-title"
              className="text-lg font-semibold text-slate-100"
            >
              {mode === 'add' ? 'Add application' : 'Edit application'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Store shortcuts and login credentials for your admin tools.
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
              htmlFor="app-name"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Application name
            </label>
            <input
              id="app-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
              placeholder="VMware vCenter"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-rose-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="app-url"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              URL
            </label>
            <input
              id="app-url"
              type="url"
              value={form.url}
              onChange={(event) =>
                setForm((current) => ({ ...current, url: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
              placeholder="https://vcenter.local"
            />
            {errors.url && (
              <p className="mt-1 text-sm text-rose-400">{errors.url}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="app-description"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Description
            </label>
            <textarea
              id="app-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
              placeholder="Short description of the tool"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">
              Application login
            </p>
            <p className="mb-4 text-xs text-slate-500">Optional — shown on the dashboard card.</p>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="app-login-username"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Username
                </label>
                <input
                  id="app-login-username"
                  type="text"
                  autoComplete="off"
                  value={form.loginUsername}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      loginUsername: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
                  placeholder="admin@domain.local"
                />
              </div>

              <div>
                <label
                  htmlFor="app-login-password"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <input
                  id="app-login-password"
                  type="text"
                  autoComplete="off"
                  value={form.loginPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      loginPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
                  placeholder="Password for the application"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="app-category"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Group
            </label>
            <select
              id="app-category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-rose-400">{errors.category}</p>
            )}
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
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              {mode === 'add' ? 'Add' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
