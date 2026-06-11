import { LayoutGrid, Settings2, Users } from 'lucide-react'
import { CategoryIcon } from '../categories/CategoryIcon'
import { getCategoryMeta, portalIcon } from '../../lib/categories'
import type { CategoryGroup } from '../../types/category'
import type { CategoryFilterValue } from '../filters/CategoryFilter'

interface SidebarProps {
  categories: CategoryGroup[]
  categoryFilter: CategoryFilterValue
  onCategoryChange: (value: CategoryFilterValue) => void
  applicationCount: number
  filteredCount: number
  onManageGroups: () => void
  onManageUsers: () => void
  canEditCategories: boolean
  canManageUsers: boolean
}

export function Sidebar({
  categories,
  categoryFilter,
  onCategoryChange,
  applicationCount,
  filteredCount,
  onManageGroups,
  onManageUsers,
  canEditCategories,
  canManageUsers,
}: SidebarProps) {
  const PortalIcon = portalIcon

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/50 p-5 lg:w-64 lg:shrink-0">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30 ring-inset">
          <PortalIcon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">IT Portal</p>
          <p className="text-xs text-slate-500">Admin-genvägar</p>
        </div>
      </div>

      <nav className="space-y-1">
        <button
          type="button"
          onClick={() => onCategoryChange('All')}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
            categoryFilter === 'All'
              ? 'bg-slate-800 text-slate-100'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          Alla applikationer
        </button>
        {categories.map((category) => {
          const meta = getCategoryMeta(category)
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                categoryFilter === category.id
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span className="flex-1 text-left">{meta.label}</span>
              <CategoryIcon iconId={meta.iconId} size="sidebar" />
            </button>
          )
        })}
      </nav>

      {canEditCategories && (
        <button
          type="button"
          onClick={onManageGroups}
          className="mt-4 flex w-full items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-200"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          Hantera grupper
        </button>
      )}

      {canManageUsers && (
        <button
          type="button"
          onClick={onManageUsers}
          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-200"
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          Användardatabas
        </button>
      )}

      <div className="mt-auto rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-500">
        <p>
          Visar <span className="font-medium text-slate-300">{filteredCount}</span> av{' '}
          <span className="font-medium text-slate-300">{applicationCount}</span>{' '}
          applikationer
        </p>
      </div>
    </aside>
  )
}
