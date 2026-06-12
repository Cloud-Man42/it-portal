import { describe, expect, it } from 'vitest'
import {
  buildPluginHealthUrl,
  buildPluginServiceUrl,
  findPluginById,
  isPluginDefinition,
  parsePluginCatalog,
} from './plugins.js'

const validCatalog = {
  version: 2,
  updatedAt: '2026-06-11T00:00:00.000Z',
  source: 'https://github.com/example/it-portal/plugins',
  plugins: [
    {
      id: 'wake-on-lan',
      name: 'Wake on LAN',
      description: 'Wake machines remotely.',
      category: 'Network',
      tags: ['network'],
      deploy: {
        repository: 'https://github.com/example/wol-admin.git',
        branch: 'main',
        installScript: 'wake-on-lan.sh',
        installDir: 'wake-on-lan',
        port: 3001,
        healthPath: '/api/devices',
        urlPath: '/',
        serviceName: 'it-portal-plugin-wake-on-lan',
      },
    },
    {
      id: 'vpn-portal',
      name: 'VPN Portal',
      description: 'VPN management portal.',
      category: 'VPN',
      tags: ['vpn', 'security'],
      deploy: {
        repository: 'https://github.com/example/openvpn.git',
        branch: 'main',
        installScript: 'vpn-portal.sh',
        installDir: 'vpn-portal',
        port: 3000,
        healthPath: '/api/health',
        urlPath: '/',
        serviceName: 'it-portal-plugin-vpn-portal',
        privateRepository: true,
      },
    },
  ],
}

describe('plugins', () => {
  it('validates deployable plugin definitions', () => {
    expect(isPluginDefinition(validCatalog.plugins[0])).toBe(true)
    expect(isPluginDefinition({ id: 'bad', url: 'not-a-url' })).toBe(false)
    expect(
      isPluginDefinition({
        id: 'missing-deploy-fields',
        name: 'Broken',
        description: 'Broken plugin',
        category: 'Other',
        tags: [],
        deploy: { repository: 'https://github.com/example/repo.git' },
      }),
    ).toBe(false)
  })

  it('parses a valid catalog', () => {
    const catalog = parsePluginCatalog(validCatalog)
    expect(catalog.plugins).toHaveLength(2)
    expect(findPluginById(catalog, 'vpn-portal')?.deploy?.port).toBe(3000)
  })

  it('builds plugin URLs from deploy metadata', () => {
    const plugin = findPluginById(parsePluginCatalog(validCatalog), 'wake-on-lan')!
    expect(buildPluginServiceUrl('192.168.0.100', plugin.deploy!)).toBe(
      'https://192.168.0.100:3001/',
    )
    expect(buildPluginHealthUrl('127.0.0.1', plugin.deploy!)).toBe(
      'https://127.0.0.1:3001/api/devices',
    )
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
