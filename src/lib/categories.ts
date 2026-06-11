import { Monitor } from 'lucide-react'
import type { CategoryColor, CategoryGroup } from '../types/category'
import { resolveCategoryIconId } from './groupIcons'

export const portalIcon = Monitor

export const COLOR_OPTIONS: { value: CategoryColor; label: string }[] = [
  { value: 'blue', label: 'Blue' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'emerald', label: 'Green' },
  { value: 'rose', label: 'Red' },
  { value: 'amber', label: 'Amber' },
  { value: 'violet', label: 'Violet' },
  { value: 'orange', label: 'Orange' },
  { value: 'slate', label: 'Gray' },
]

const colorClasses: Record<CategoryColor, string> = {
  blue: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  rose: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  violet: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  orange: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
}

export function getCategoryMeta(category: CategoryGroup | undefined) {
  if (!category) {
    return {
      label: 'Unknown',
      iconId: 'other' as const,
      badgeClass: colorClasses.slate,
    }
  }

  return {
    label: category.name,
    iconId: resolveCategoryIconId(category),
    badgeClass: colorClasses[category.color] ?? colorClasses.slate,
  }
}

export function getNextColor(index: number): CategoryColor {
  return COLOR_OPTIONS[index % COLOR_OPTIONS.length].value
}
