export type PluginInstallTarget = 'local' | 'remote'

export interface PluginInstallRequest {
  target: PluginInstallTarget
  host?: string
  username?: string
  password?: string
}

const HOST_PATTERN =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*|(?:\d{1,3}\.){3}\d{1,3})$/

export function isValidInstallHost(host: string): boolean {
  const trimmed = host.trim()
  if (!trimmed || trimmed.length > 253) return false
  return HOST_PATTERN.test(trimmed)
}

export function parsePluginInstallRequest(body: unknown): PluginInstallRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Install request body is required.')
  }

  const input = body as PluginInstallRequest
  const target = input.target

  if (target !== 'local' && target !== 'remote') {
    throw new Error('Install target must be "local" or "remote".')
  }

  if (target === 'local') {
    const host = typeof input.host === 'string' ? input.host.trim() : ''
    if (host && !isValidInstallHost(host)) {
      throw new Error('Server hostname or IP address is invalid.')
    }

    return { target: 'local', host: host || undefined }
  }

  const host = typeof input.host === 'string' ? input.host.trim() : ''
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''

  if (!host) {
    throw new Error('Remote server hostname or IP address is required.')
  }
  if (!isValidInstallHost(host)) {
    throw new Error('Remote server hostname or IP address is invalid.')
  }
  if (!username) {
    throw new Error('SSH username is required for remote installation.')
  }
  if (!password) {
    throw new Error('SSH password is required for remote installation.')
  }

  return { target: 'remote', host, username, password }
}
