import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { CategoryIcon } from '../categories/CategoryIcon'
import { COLOR_OPTIONS } from '../../lib/categories'
import { DEFAULT_ICON, GROUP_ICONS, type GroupIconId } from '../../lib/groupIcons'
import type { CategoryColor, CategoryGroup, CategoryGroupInput } from '../../types/category'

interface CategoryFormModalProps {
  open: boolean
  mode: 'add' | 'edit'
  initialValues?: CategoryGroup
  existingNames: string[]
  onClose: () => void
  onSubmit: (input: CategoryGroupInput) => void
}

const emptyForm: CategoryGroupInput = {
  name: '',
  color: 'blue',
  icon: DEFAULT_ICON,
}

export function CategoryFormModal({
  open,
  mode,
  initialValues,
  existingNames,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const [form, setForm] = useState<CategoryGroupInput>(emptyForm)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && initialValues) {
      setForm({
        name: initialValues.name,
        color: initialValues.color,
        icon: initialValues.icon,
      })
    } else {
      setForm(emptyForm)
    }
    setError(undefined)
  }, [open, mode, initialValues])

  if (!open) return null

  const validate = () => {
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError('Group name is required.')
      return false
    }

    const duplicate = existingNames.some(
      (name) =>
        name.toLowerCase() === trimmedName.toLowerCase() &&
        (mode === 'add' || name.toLowerCase() !== initialValues?.name.toLowerCase()),
    )
    if (duplicate) {
      setError('A group with this name already exists.')
      return false
    }

    setError(undefined)
    return true
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    onSubmit({
      name: form.name.trim(),
      color: form.color,
      icon: form.icon,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="category-form-title"
              className="text-lg font-semibold text-slate-100"
            >
              {mode === 'add' ? 'Add group' : 'Edit group'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Create custom groups like VPN, VMware, or Network.
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
              htmlFor="group-name"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Group name
            </label>
            <input
              id="group-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
              placeholder="e.g. Backup, DNS, Storage"
            />
            {error && <p className="mt-1 text-sm text-rose-400">{error}</p>}
          </div>

          <div>
            <label
              htmlFor="group-color"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Color
            </label>
            <select
              id="group-color"
              value={form.color}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  color: event.target.value as CategoryColor,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
            >
              {COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Icon</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {GROUP_ICONS.map((icon) => {
                const selected = form.icon === icon.id
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        icon: icon.id as GroupIconId,
                      }))
                    }
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition ${
                      selected
                        ? 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/40'
                        : 'border-slate-700 bg-slate-950 hover:border-slate-600 hover:bg-slate-800/60'
                    }`}
                    aria-label={icon.label}
                    aria-pressed={selected}
                    title={icon.label}
                  >
                    <CategoryIcon iconId={icon.id} size="picker" />
                    <span className="w-full truncate text-center text-[10px] text-slate-400">
                      {icon.label}
                    </span>
                  </button>
                )
              })}
            </div>
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
              {mode === 'add' ? 'Add group' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
