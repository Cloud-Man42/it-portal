import { describe, expect, it } from 'vitest'
import { isValidInstallHost, parsePluginInstallRequest } from './pluginInstall.js'

describe('plugin install request', () => {
  it('accepts local install without credentials', () => {
    expect(parsePluginInstallRequest({ target: 'local' })).toEqual({ target: 'local' })
  })

  it('accepts remote install with host and credentials', () => {
    expect(
      parsePluginInstallRequest({
        target: 'remote',
        host: '192.168.0.73',
        username: 'hm',
        password: 'secret',
      }),
    ).toEqual({
      target: 'remote',
      host: '192.168.0.73',
      username: 'hm',
      password: 'secret',
    })
  })

  it('rejects remote install without credentials', () => {
    expect(() =>
      parsePluginInstallRequest({
        target: 'remote',
        host: 'wifi.local',
        username: 'hm',
      }),
    ).toThrow(/SSH password is required/)
  })

  it('rejects invalid hostnames', () => {
    expect(isValidInstallHost('not a host!')).toBe(false)
    expect(() =>
      parsePluginInstallRequest({
        target: 'remote',
        host: 'bad host',
        username: 'hm',
        password: 'secret',
      }),
    ).toThrow(/invalid/)
  })

  it('accepts fqdn and ipv4 hosts', () => {
    expect(isValidInstallHost('192.168.0.100')).toBe(true)
    expect(isValidInstallHost('vpn.example.internal')).toBe(true)
  })
})
