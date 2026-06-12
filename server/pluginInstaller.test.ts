import { describe, expect, it } from 'vitest'
import {
  buildPluginHealthUrl,
  buildPluginServiceUrl,
  parsePluginCatalog,
  findPluginById,
} from '../shared/plugins.js'
import {
  canDeployOnThisHost,
  getInstallScriptPath,
  getPluginInstallDir,
  getServerHost,
} from './pluginInstaller.js'

const catalog = parsePluginCatalog({
  version: 2,
  updatedAt: '2026-06-11T00:00:00.000Z',
  source: 'https://github.com/example/it-portal/plugins',
  plugins: [
    {
      id: 'wifi-optimizer',
      name: 'WiFi Optimizer',
      description: 'Optimize WiFi.',
      category: 'Network',
      tags: ['wifi'],
      deploy: {
        repository: 'https://github.com/example/unifi-ai-optimizer.git',
        branch: 'main',
        installScript: 'wifi-optimizer.sh',
        installDir: 'wifi-optimizer',
        port: 8088,
        healthPath: '/health',
        urlPath: '/ui/',
        serviceName: 'it-portal-plugin-wifi-optimizer',
      },
    },
  ],
})

describe('plugin installer helpers', () => {
  it('resolves install paths and server host', () => {
    const plugin = findPluginById(catalog, 'wifi-optimizer')!
    process.env.IT_PORTAL_PLUGINS_DIR = '/tmp/it-portal-plugins'
    process.env.IT_PORTAL_SERVER_HOST = '192.168.0.100'

    expect(getPluginInstallDir(plugin)).toMatch(/it-portal-plugins[\\/]wifi-optimizer$/)
    expect(getInstallScriptPath('wifi-optimizer.sh')).toMatch(/wifi-optimizer\.sh$/)
    expect(getServerHost()).toBe('192.168.0.100')
    expect(buildPluginServiceUrl(getServerHost(), plugin.deploy!)).toBe(
      'https://192.168.0.100:8088/ui/',
    )
    expect(buildPluginHealthUrl('127.0.0.1', plugin.deploy!)).toBe(
      'https://127.0.0.1:8088/health',
    )

    delete process.env.IT_PORTAL_PLUGINS_DIR
    delete process.env.IT_PORTAL_SERVER_HOST
  })

  it('reports unsupported deployment host on non-linux platforms', () => {
    expect(canDeployOnThisHost()).toBe(process.platform === 'linux')
  })
})
