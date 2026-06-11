import { sampleCategories } from '../data/sampleCategories'
import { resolveCategoryIconId } from './groupIcons'
import type { CategoryGroup, CategoryGroupInput } from '../types/category'

const STORAGE_KEY = 'it-portal-categories'

const LEGACY_NAME_TO_ID: Record<string, string> = {
  VMware: 'vmware',
  Network: 'network',
  VPN: 'vpn',
  Security: 'security',
  Monitoring: 'monitoring',
  Other: 'other',
}

function migrateCategory(category: CategoryGroup): CategoryGroup {
  return {
    ...category,
    icon: resolveCategoryIconId(category),
  }
}

function isValidCategory(value: unknown): value is CategoryGroup {
  if (!value || typeof value !== 'object') return false

  const category = value as CategoryGroup
  return (
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    typeof category.color === 'string' &&
    typeof category.createdAt === 'string'
  )
}

export function loadCategories(): CategoryGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      saveCategories(sampleCategories)
      return sampleCategories
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      saveCategories(sampleCategories)
      return sampleCategories
    }

    const categories = parsed
      .filter(isValidCategory)
      .map(migrateCategory)
    if (categories.length === 0) {
      saveCategories(sampleCategories)
      return sampleCategories
    }

    saveCategories(categories)
    return categories
  } catch {
    saveCategories(sampleCategories)
    return sampleCategories
  }
}

export function saveCategories(categories: CategoryGroup[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
}

export function createCategory(input: CategoryGroupInput): CategoryGroup {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
}

export function migrateLegacyCategoryId(
  categoryValue: string,
  categories: CategoryGroup[],
): string {
  if (categories.some((category) => category.id === categoryValue)) {
    return categoryValue
  }

  const legacyId = LEGACY_NAME_TO_ID[categoryValue]
  if (legacyId && categories.some((category) => category.id === legacyId)) {
    return legacyId
  }

  const byName = categories.find(
    (category) => category.name.toLowerCase() === categoryValue.toLowerCase(),
  )
  if (byName) return byName.id

  return categories[0]?.id ?? 'other'
}
