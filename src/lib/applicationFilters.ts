import type { Application } from '../types/application'
import type { CategoryFilterValue } from '../components/filters/CategoryFilter'

export function filterApplications(
  applications: Application[],
  searchQuery: string,
  categoryFilter: CategoryFilterValue,
): Application[] {
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
}
