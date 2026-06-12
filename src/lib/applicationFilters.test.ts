import { describe, expect, it } from 'vitest'
import {
  buildCategoryLookup,
  filterApplications,
  resolveCategoryFilterIds,
} from './applicationFilters'
import { sampleApplication, sampleCategory } from '../test/fixtures'
import type { CategoryGroup } from '../types/category'

describe('filterApplications', () => {
  const vpnCategory: CategoryGroup = {
    id: 'cat-vpn',
    name: 'VPN',
    color: 'emerald',
    icon: 'vpn',
    createdAt: '2026-01-01T00:00:00.000Z',
    matchingCategoryIds: ['cat-vpn'],
  }

  const categories = [
    {
      ...sampleCategory,
      matchingCategoryIds: [sampleCategory.id, 'admin-network'],
    },
    vpnCategory,
  ]

  const applications = [
    sampleApplication,
    {
      ...sampleApplication,
      id: 'app-2',
      name: 'VPN Portal',
      url: 'https://vpn.local/portal',
      description: 'VPN access',
      category: 'cat-vpn',
    },
    {
      ...sampleApplication,
      id: 'app-shared-network',
      name: 'Shared DNS',
      url: 'https://dns.local',
      description: 'Shared network tool',
      category: 'admin-network',
      shared: true,
    },
  ]

  it('returns all applications when no filters are applied', () => {
    expect(filterApplications(applications, categories, '', 'All')).toHaveLength(3)
  })

  it('filters by category', () => {
    const filtered = filterApplications(applications, categories, '', sampleCategory.id)
    expect(filtered).toHaveLength(2)
    expect(filtered.map((app) => app.name)).toEqual(['Firewall Admin', 'Shared DNS'])
  })

  it('filters by search query across name, description, and url', () => {
    expect(filterApplications(applications, categories, 'vpn', 'All')).toHaveLength(1)
    expect(filterApplications(applications, categories, 'firewall.local', 'All')).toHaveLength(1)
    expect(filterApplications(applications, categories, 'policies', 'All')).toHaveLength(1)
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterApplications(applications, categories, 'missing-tool', 'All')).toEqual([])
    expect(filterApplications(applications, categories, '', 'missing-category')).toEqual([])
  })

  it('ignores surrounding whitespace in the search query', () => {
    expect(filterApplications(applications, categories, '   vpn   ', 'All')).toHaveLength(1)
  })
})

describe('resolveCategoryFilterIds', () => {
  it('includes alias category ids with the same group name', () => {
    const categories = [
      {
        ...sampleCategory,
        matchingCategoryIds: ['cat-network', 'admin-network'],
      },
    ]

    expect(resolveCategoryFilterIds(categories, sampleCategory.id)).toEqual(
      new Set(['cat-network', 'admin-network']),
    )
  })
})

describe('buildCategoryLookup', () => {
  it('maps alias category ids to the canonical sidebar group', () => {
    const categories = [
      {
        ...sampleCategory,
        matchingCategoryIds: ['cat-network', 'admin-network'],
      },
    ]

    const lookup = buildCategoryLookup(categories)
    expect(lookup.get('admin-network')).toEqual(categories[0])
  })
})
