import type { CategoryGroup } from '../../types/category'

export type CategoryFilterValue = 'All' | string

interface CategoryFilterProps {
  categories: CategoryGroup[]
  value: CategoryFilterValue
  onChange: (value: CategoryFilterValue) => void
}

export function CategoryFilter({
  categories,
  value,
  onChange,
}: CategoryFilterProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
      aria-label="Filter by category"
    >
      <option value="All">All categories</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  )
}
