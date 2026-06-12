import { spawn } from 'node:child_process'

export interface RemoteCredentials {
  host: string
  username: string
  password: string
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

async function assertSshpassAvailable(): Promise<void> {
  await new Promise<void>((resolveCheck, rejectCheck) => {
    const child = spawn('sshpass', ['-V'], { stdio: 'ignore' })
    child.on('error', () => {
      rejectCheck(
        new Error(
          'Remote installation requires sshpass on the IT Portal server. Install it with: sudo apt install sshpass',
        ),
      )
    })
    child.on('close', (code) => {
      if (code === 0) resolveCheck()
      else rejectCheck(new Error('sshpass is not available on the IT Portal server.'))
    })
  })
}

export async function runRemoteShell(
  credentials: RemoteCredentials,
  script: string,
): Promise<{ stdout: string; stderr: string }> {
  await assertSshpassAvailable()

  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      'sshpass',
      [
        '-p',
        credentials.password,
        'ssh',
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'UserKnownHostsFile=/dev/null',
        `${credentials.username}@${credentials.host}`,
        'bash -s',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )

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
            `Remote install failed with exit code ${code ?? 'unknown'}.`,
        ),
      )
    })

    child.stdin.write(script)
    child.stdin.end()
  })
}

export function buildRemoteInstallScript(
  installScriptContent: string,
  env: NodeJS.ProcessEnv,
): string {
  const exports = Object.entries(env)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([key, value]) => `export ${key}=${shellQuote(value)}`)
    .join('\n')

  return `#!/usr/bin/env bash
set -euo pipefail
${exports}
${installScriptContent}
`
}
