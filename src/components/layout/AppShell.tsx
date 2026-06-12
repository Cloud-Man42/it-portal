import { LogOut, Package, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { ROLE_LABELS } from '../../lib/permissions'
import type { Role } from '../../lib/permissions'
import type { CategoryGroup } from '../../types/category'
import { CategoryFilter, type CategoryFilterValue } from '../filters/CategoryFilter'
import { SearchBar } from '../filters/SearchBar'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: ReactNode
  categories: CategoryGroup[]
  searchQuery: string
  onSearchChange: (value: string) => void
  categoryFilter: CategoryFilterValue
  onCategoryChange: (value: CategoryFilterValue) => void
  applicationCount: number
  filteredCount: number
  onAddClick: () => void
  onAddFromCatalog: () => void
  onManageGroups: () => void
  onManageUsers: () => void
  onLogout: () => void
  userDisplayName: string
  userRole: Role
  canEditApps: boolean
  canInstallPlugins: boolean
  canEditCategories: boolean
  canManageUsers: boolean
}

export function AppShell({
  children,
  categories,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  applicationCount,
  filteredCount,
  onAddClick,
  onAddFromCatalog,
  onManageGroups,
  onManageUsers,
  onLogout,
  userDisplayName,
  userRole,
  canEditApps,
  canInstallPlugins,
  canEditCategories,
  canManageUsers,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryChange={onCategoryChange}
        applicationCount={applicationCount}
        filteredCount={filteredCount}
        onManageGroups={onManageGroups}
        onManageUsers={onManageUsers}
        canEditCategories={canEditCategories}
        canManageUsers={canManageUsers}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
              <p className="text-sm text-slate-500">
                Quick access to your infrastructure tools
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchBar value={searchQuery} onChange={onSearchChange} />
              <CategoryFilter
                categories={categories}
                value={categoryFilter}
                onChange={onCategoryChange}
              />
              {(canInstallPlugins || canEditApps) && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {canInstallPlugins && (
                    <button
                      type="button"
                      onClick={onAddFromCatalog}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-800/60"
                    >
                      <Package className="h-4 w-4" aria-hidden="true" />
                      Install applications
                    </button>
                  )}
                  {canEditApps && (
                  <button
                    type="button"
                    onClick={onAddClick}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add application
                  </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
            <div className="min-w-0 text-sm text-slate-400">
              <span className="font-medium text-slate-200">{userDisplayName}</span>
              <span className="mx-2 text-slate-600">·</span>
              <span>{ROLE_LABELS[userRole]}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-200"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
