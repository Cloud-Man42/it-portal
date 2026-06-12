import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { chmodSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import type { PluginInstallRequest } from '../shared/pluginInstall.js'
import type { PluginDefinition, PluginServerStatus } from '../shared/plugins.js'
import {
  buildPluginHealthUrl,
  buildPluginServiceUrl,
  isDeployablePlugin,
} from '../shared/plugins.js'
import {
  getServerPlugin,
  setServerPluginFailed,
  setServerPluginInstalled,
  setServerPluginInstalling,
} from './db.js'
import {
  buildRemoteInstallScript,
  runRemoteShell,
  type RemoteCredentials,
} from './remoteInstaller.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(__dirname, '..')
const defaultPluginsDir = resolve(appRoot, '..', 'it-portal-plugins')

export interface PluginServerState {
  status: PluginServerStatus
  installUrl: string
  installDir: string
  healthy: boolean
  localHealthy: boolean
  targetHost: string
  installTarget: 'local' | 'remote' | ''
  lastError: string
  installedAt: string
}

function getPluginsDir(): string {
  return process.env.IT_PORTAL_PLUGINS_DIR ?? defaultPluginsDir
}

export function getServerHost(): string {
  return (
    process.env.IT_PORTAL_SERVER_HOST ??
    process.env.IT_PORTAL_SERVER_IP ??
    'localhost'
  )
}

export function getInstallScriptPath(installScript: string): string {
  return resolve(appRoot, 'plugins', 'installers', installScript)
}

export function getPluginInstallDir(
  plugin: PluginDefinition,
  targetHost?: string,
): string {
  if (!plugin.deploy) {
    throw new Error(`Plugin "${plugin.id}" is not deployable.`)
  }

  if (!targetHost || targetHost === getServerHost() || targetHost === '127.0.0.1') {
    return resolve(getPluginsDir(), plugin.deploy.installDir)
  }

  return `~/it-portal-plugins/${plugin.deploy.installDir}`
}

export function canDeployOnThisHost(): boolean {
  return process.platform === 'linux'
}

function buildCloneUrl(repository: string, token?: string): string {
  if (!token) return repository

  const parsed = new URL(repository)
  parsed.username = token
  parsed.password = 'x-oauth-basic'
  return parsed.toString()
}

export async function checkPluginHealth(
  plugin: PluginDefinition,
  host = '127.0.0.1',
): Promise<boolean> {
  if (!plugin.deploy) return false

  const healthUrl = buildPluginHealthUrl(host, plugin.deploy)
  return probeHttpsUrl(healthUrl)
}

function probeHttpsUrl(url: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolveHealth) => {
    const request = https.get(url, { rejectUnauthorized: false }, (response) => {
      const ok =
        response.statusCode !== undefined &&
        response.statusCode >= 200 &&
        response.statusCode < 500
      response.resume()
      resolveHealth(ok)
    })

    request.on('error', () => resolveHealth(false))
    request.setTimeout(timeoutMs, () => {
      request.destroy()
      resolveHealth(false)
    })
  })
}

function resolveTargetHost(request: PluginInstallRequest): string {
  if (request.target === 'remote') {
    return request.host!
  }

  return request.host || getServerHost()
}

function resolveInstallTarget(request: PluginInstallRequest): 'local' | 'remote' {
  return request.target
}

export async function getPluginServerState(
  plugin: PluginDefinition,
): Promise<PluginServerState> {
  if (!isDeployablePlugin(plugin)) {
    return {
      status: 'unsupported',
      installUrl: '',
      installDir: '',
      healthy: false,
      localHealthy: false,
      targetHost: '',
      installTarget: '',
      lastError: 'This entry is not deployable on the server.',
      installedAt: '',
    }
  }

  if (!canDeployOnThisHost()) {
    return {
      status: 'unsupported',
      installUrl: '',
      installDir: getPluginInstallDir(plugin),
      healthy: false,
      localHealthy: false,
      targetHost: '',
      installTarget: '',
      lastError: 'Server plugin deployment is only supported on Linux hosts.',
      installedAt: '',
    }
  }

  const record = getServerPlugin(plugin.id)
  const targetHost = record?.target_host || getServerHost()
  const installTarget =
    record?.install_target === 'local' || record?.install_target === 'remote'
      ? record.install_target
      : ''
  const installDir = record?.install_dir || getPluginInstallDir(plugin, targetHost)
  const installUrl =
    record?.install_url || buildPluginServiceUrl(targetHost, plugin.deploy!)
  const localHealthy = await checkPluginHealth(plugin)
  const healthy = record?.target_host
    ? await checkPluginHealth(plugin, record.target_host)
    : localHealthy

  let status: PluginServerStatus = record?.status ?? 'not_installed'
  if (healthy) {
    status = 'installed'
  } else if (status === 'installed') {
    status = 'failed'
  }

  return {
    status,
    installUrl,
    installDir,
    healthy,
    localHealthy,
    targetHost,
    installTarget,
    lastError: record?.last_error ?? '',
    installedAt: record?.installed_at ?? '',
  }
}

function runInstallScript(
  scriptPath: string,
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn('bash', [scriptPath], {
      env: { ...process.env, ...env },
      cwd: dirname(scriptPath),
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => rejectRun(error))
    child.on('close', (code) => {
      if (code === 0) {
        resolveRun({ stdout, stderr })
        return
      }

      rejectRun(
        new Error(
          stderr.trim() ||
            stdout.trim() ||
            `Plugin install script failed with exit code ${code ?? 'unknown'}.`,
        ),
      )
    })
  })
}

function buildInstallEnv(
  plugin: PluginDefinition,
  targetHost: string,
  installDir: string,
  sudoPassword: string,
): NodeJS.ProcessEnv {
  if (!plugin.deploy) {
    throw new Error(`Plugin "${plugin.id}" is not deployable.`)
  }

  const token = plugin.deploy.privateRepository
    ? process.env.IT_PORTAL_GITHUB_TOKEN
    : undefined

  if (plugin.deploy.privateRepository && !token) {
    throw new Error(
      'Private plugin repository requires IT_PORTAL_GITHUB_TOKEN on the server.',
    )
  }

  return {
    PLUGIN_ID: plugin.id,
    PLUGIN_DIR: installDir,
    PLUGIN_REPO: buildCloneUrl(plugin.deploy.repository, token),
    PLUGIN_BRANCH: plugin.deploy.branch,
    PLUGIN_PORT: String(plugin.deploy.port),
    PLUGIN_HEALTH_PATH: plugin.deploy.healthPath,
    SERVER_HOST: targetHost,
    SERVICE_NAME: plugin.deploy.serviceName,
    SUDO_PASSWORD: sudoPassword,
    APP_ROOT: appRoot,
  }
}

async function waitForHealthy(
  plugin: PluginDefinition,
  host: string,
  timeoutMs: number,
): Promise<boolean> {
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    if (await checkPluginHealth(plugin, host)) {
      return true
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 3000))
  }

  return false
}

async function installPluginLocally(
  plugin: PluginDefinition,
  targetHost: string,
  installDir: string,
  sudoPassword: string,
): Promise<void> {
  if (!plugin.deploy) return

  const scriptPath = getInstallScriptPath(plugin.deploy.installScript)
  if (!existsSync(scriptPath)) {
    throw new Error(`Install script not found: ${plugin.deploy.installScript}`)
  }

  mkdirSync(dirname(installDir), { recursive: true })
  chmodSync(scriptPath, 0o755)

  await runInstallScript(scriptPath, buildInstallEnv(plugin, targetHost, installDir, sudoPassword))
}

async function installPluginRemotely(
  plugin: PluginDefinition,
  credentials: RemoteCredentials,
  targetHost: string,
  installDir: string,
): Promise<void> {
  if (!plugin.deploy) return

  const scriptPath = getInstallScriptPath(plugin.deploy.installScript)
  if (!existsSync(scriptPath)) {
    throw new Error(`Install script not found: ${plugin.deploy.installScript}`)
  }

  const scriptContent = readFileSync(scriptPath, 'utf8')
  const remoteScript = buildRemoteInstallScript(
    scriptContent,
    buildInstallEnv(
      plugin,
      targetHost,
      installDir,
      credentials.password,
    ),
  )

  await runRemoteShell(credentials, remoteScript)
}

export async function ensurePluginInstalled(
  plugin: PluginDefinition,
  request: PluginInstallRequest,
): Promise<{ installUrl: string; installDir: string; targetHost: string; installTarget: 'local' | 'remote' }> {
  if (!isDeployablePlugin(plugin) || !plugin.deploy) {
    throw new Error('This plugin cannot be installed on the server.')
  }

  if (!canDeployOnThisHost()) {
    throw new Error('Server plugin deployment is only supported on Linux hosts.')
  }

  const installTarget = resolveInstallTarget(request)
  const targetHost = resolveTargetHost(request)
  const installDir = getPluginInstallDir(plugin, targetHost)
  const installUrl = buildPluginServiceUrl(targetHost, plugin.deploy)

  const localHealthy = await checkPluginHealth(plugin)
  const remoteHealthy =
    installTarget === 'remote' ? await checkPluginHealth(plugin, targetHost) : false

  if (
    (installTarget === 'local' && localHealthy) ||
    (installTarget === 'remote' && remoteHealthy)
  ) {
    setServerPluginInstalled(
      plugin.id,
      installUrl,
      installDir,
      targetHost,
      installTarget,
    )
    return { installUrl, installDir, targetHost, installTarget }
  }

  setServerPluginInstalling(plugin.id, installDir, targetHost, installTarget)

  try {
    if (installTarget === 'remote') {
      await installPluginRemotely(
        plugin,
        {
          host: request.host!,
          username: request.username!,
          password: request.password!,
        },
        targetHost,
        installDir,
      )
    } else {
      await installPluginLocally(
        plugin,
        targetHost,
        installDir,
        process.env.IT_PORTAL_SUDO_PASSWORD ?? '',
      )
    }

    const healthHost = installTarget === 'remote' ? targetHost : '127.0.0.1'
    const healthy = await waitForHealthy(plugin, healthHost, 180_000)
    if (!healthy) {
      throw new Error(
        `Plugin installed but health check failed on ${targetHost}:${plugin.deploy.port}.`,
      )
    }

    setServerPluginInstalled(
      plugin.id,
      installUrl,
      installDir,
      targetHost,
      installTarget,
    )
    return { installUrl, installDir, targetHost, installTarget }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Plugin installation failed.'
    setServerPluginFailed(plugin.id, installDir, targetHost, installTarget, message)
    throw new Error(message)
  }
}
