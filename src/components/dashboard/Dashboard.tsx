import { useMemo } from 'react'
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

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return applications.filter((app) => {
      const matchesCategory =
        categoryFilter === 'All' || app.category === categoryFilter

      const matchesSearch =
        query.length === 0 ||
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.url.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [applications, searchQuery, categoryFilter])

  if (filteredApplications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
        <h2 className="text-lg font-medium text-slate-200">Inga applikationer hittades</h2>
        <p className="mt-2 text-sm text-slate-500">
          Justera sökning eller filter, eller lägg till en ny applikation.
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
          canEdit={canEdit}
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
  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return applications.filter((app) => {
      const matchesCategory =
        categoryFilter === 'All' || app.category === categoryFilter

      const matchesSearch =
        query.length === 0 ||
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.url.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    }).length
  }, [applications, searchQuery, categoryFilter])
}
