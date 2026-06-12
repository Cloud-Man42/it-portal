import { useMemo } from 'react'
import { filterApplications } from '../../lib/applicationFilters'
import type { CategoryGroup } from '../../types/category'
import type { Application } from '../../types/application'
import type { CategoryFilterValue } from '../filters/CategoryFilter'
import { AppCard } from './AppCard'

interface DashboardProps {
  applications: Application[]
  categories: CategoryGroup[]
  searchQuery: string
  categoryFilter: CategoryFilterValue
  onEdit: (application: Application) => void
  onDelete: (application: Application) => void
  canEdit?: boolean
}

export function Dashboard({
  applications,
  categories,
  searchQuery,
  categoryFilter,
  onEdit,
  onDelete,
  canEdit = true,
}: DashboardProps) {
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const filteredApplications = useMemo(
    () => filterApplications(applications, searchQuery, categoryFilter),
    [applications, searchQuery, categoryFilter],
  )

  if (filteredApplications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
        <h2 className="text-lg font-medium text-slate-200">
          {canEdit ? 'No applications found' : 'No shared connections'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {canEdit
            ? 'Try adjusting your search or filter, or add a new application.'
            : 'No connections have been shared with you yet. Contact your administrator.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredApplications.map((application) => (
        <AppCard
          key={application.id}
          application={application}
          category={categoryMap.get(application.category)}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={application.canEdit ?? canEdit}
        />
      ))}
    </div>
  )
}

export function useFilteredCount(
  applications: Application[],
  searchQuery: string,
  categoryFilter: CategoryFilterValue,
) {
  return useMemo(
    () => filterApplications(applications, searchQuery, categoryFilter).length,
    [applications, searchQuery, categoryFilter],
  )
}
