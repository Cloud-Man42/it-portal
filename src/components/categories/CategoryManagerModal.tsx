import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { CategoryIcon } from './CategoryIcon'
import { getCategoryMeta } from '../../lib/categories'
import type { CategoryGroup } from '../../types/category'

interface CategoryManagerModalProps {
  open: boolean
  categories: CategoryGroup[]
  applicationCounts: Record<string, number>
  onClose: () => void
  onAdd: () => void
  onEdit: (category: CategoryGroup) => void
  onDelete: (category: CategoryGroup) => void
}

export function CategoryManagerModal({
  open,
  categories,
  applicationCounts,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: CategoryManagerModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div>
            <h2
              id="category-manager-title"
              className="text-lg font-semibold text-slate-100"
            >
              Manage groups
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Organize applications into custom groups.
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
            Add group
          </button>

          <ul className="space-y-2">
            {categories.map((category) => {
              const meta = getCategoryMeta(category)
              const count = applicationCounts[category.id] ?? 0

              return (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badgeClass}`}
                    >
                      {meta.label}
                      <CategoryIcon iconId={meta.iconId} size="badge" />
                    </span>
                    <span className="text-xs text-slate-500">
                      {count} app{count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(category)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-sky-300"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(category)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
