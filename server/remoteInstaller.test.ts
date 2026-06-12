import { describe, expect, it } from 'vitest'
import { buildRemoteInstallScript, shellQuote } from './remoteInstaller.js'

describe('remote installer helpers', () => {
  it('quotes shell values safely', () => {
    expect(shellQuote("it's fine")).toBe("'it'\\''s fine'")
  })

  it('builds a remote install script with exported env vars', () => {
    const script = buildRemoteInstallScript('echo hello', {
      PLUGIN_DIR: '/tmp/plugin',
      SERVER_HOST: '192.168.0.73',
    })

    expect(script).toContain('export PLUGIN_DIR=')
    expect(script).toContain('192.168.0.73')
    expect(script).toContain('echo hello')
  })
})
