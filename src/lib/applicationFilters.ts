import type { Application } from '../types/application'
import type { CategoryGroup } from '../types/category'
import type { CategoryFilterValue } from '../components/filters/CategoryFilter'

export function resolveCategoryFilterIds(
  categories: CategoryGroup[],
  categoryFilter: CategoryFilterValue,
): Set<string> | null {
  if (categoryFilter === 'All') return null

  const selected = categories.find((category) => category.id === categoryFilter)
  return new Set(selected?.matchingCategoryIds ?? [categoryFilter])
}

export function buildCategoryLookup(categories: CategoryGroup[]): Map<string, CategoryGroup> {
  const lookup = new Map<string, CategoryGroup>()

  for (const category of categories) {
    lookup.set(category.id, category)
    for (const aliasId of category.matchingCategoryIds ?? []) {
      lookup.set(aliasId, category)
    }
  }

  return lookup
}

export function filterApplications(
  applications: Application[],
  categories: CategoryGroup[],
  searchQuery: string,
  categoryFilter: CategoryFilterValue,
): Application[] {
  const query = searchQuery.trim().toLowerCase()
  const matchingCategoryIds = resolveCategoryFilterIds(categories, categoryFilter)

  return applications.filter((app) => {
    const matchesCategory =
      matchingCategoryIds === null || matchingCategoryIds.has(app.category)

    const matchesSearch =
      query.length === 0 ||
      app.name.toLowerCase().includes(query) ||
      app.description.toLowerCase().includes(query) ||
      app.url.toLowerCase().includes(query)

    return matchesCategory && matchesSearch
  })
}
