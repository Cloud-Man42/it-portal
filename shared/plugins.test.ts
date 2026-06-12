import { describe, expect, it } from 'vitest'
import { findPluginById, isPluginDefinition, parsePluginCatalog } from './plugins.js'

const validCatalog = {
  version: 1,
  updatedAt: '2026-06-11T00:00:00.000Z',
  source: 'https://github.com/example/it-portal/plugins',
  plugins: [
    {
      id: 'wake-on-lan',
      name: 'Wake on LAN',
      description: 'Wake machines remotely.',
      url: 'https://wakeonlan.local',
      category: 'Network',
      tags: ['network'],
    },
    {
      id: 'vpn-portal',
      name: 'VPN Portal',
      description: 'VPN management portal.',
      url: 'https://vpn.local',
      category: 'VPN',
      tags: ['vpn', 'security'],
    },
  ],
}

describe('plugins', () => {
  it('validates plugin definitions', () => {
    expect(isPluginDefinition(validCatalog.plugins[0])).toBe(true)
    expect(isPluginDefinition({ id: 'bad', url: 'not-a-url' })).toBe(false)
  })

  it('parses a valid catalog', () => {
    const catalog = parsePluginCatalog(validCatalog)
    expect(catalog.plugins).toHaveLength(2)
    expect(findPluginById(catalog, 'vpn-portal')?.name).toBe('VPN Portal')
  })

  it('rejects catalogs with duplicate plugin ids', () => {
    expect(() =>
      parsePluginCatalog({
        ...validCatalog,
        plugins: [validCatalog.plugins[0], validCatalog.plugins[0]],
      }),
    ).toThrow(/Duplicate plugin id/)
  })

  it('rejects invalid catalog shape', () => {
    expect(() => parsePluginCatalog(null)).toThrow(/JSON object/)
    expect(() => parsePluginCatalog({ ...validCatalog, plugins: [] })).toThrow(
      /no valid plugins/,
    )
  })
})
