import { describe, expect, it } from 'vitest'
import { filterApplications } from './applicationFilters'
import { sampleApplication } from '../test/fixtures'

describe('filterApplications', () => {
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
  ]

  it('returns all applications when no filters are applied', () => {
    expect(filterApplications(applications, '', 'All')).toHaveLength(2)
  })

  it('filters by category', () => {
    const filtered = filterApplications(applications, '', sampleApplication.category)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.name).toBe('Firewall Admin')
  })

  it('filters by search query across name, description, and url', () => {
    expect(filterApplications(applications, 'vpn', 'All')).toHaveLength(1)
    expect(filterApplications(applications, 'firewall.local', 'All')).toHaveLength(1)
    expect(filterApplications(applications, 'policies', 'All')).toHaveLength(1)
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterApplications(applications, 'missing-tool', 'All')).toEqual([])
    expect(filterApplications(applications, '', 'missing-category')).toEqual([])
  })

  it('ignores surrounding whitespace in the search query', () => {
    expect(filterApplications(applications, '   vpn   ', 'All')).toHaveLength(1)
  })
})
