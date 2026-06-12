import { sampleApplications } from '../data/sampleApplications'
import { loadCategories } from './categoryStorage'
import { migrateLegacyCategoryId } from './categoryStorage'
import type { Application, ApplicationInput } from '../types/application'

const STORAGE_KEY = 'it-portal-applications'

function isValidApplication(value: unknown): value is Application {
  if (!value || typeof value !== 'object') return false

  const app = value as Application
  return (
    typeof app.id === 'string' &&
    typeof app.name === 'string' &&
    typeof app.url === 'string' &&
    typeof app.description === 'string' &&
    typeof app.category === 'string' &&
    typeof app.createdAt === 'string' &&
    (app.loginUsername === undefined || typeof app.loginUsername === 'string') &&
    (app.loginPassword === undefined || typeof app.loginPassword === 'string') &&
    (app.pluginId === undefined || typeof app.pluginId === 'string')
  )
}

function normalizeApplications(applications: Application[]): Application[] {
  const categories = loadCategories()
  return applications.map((app) => ({
    ...app,
    loginUsername: app.loginUsername ?? '',
    loginPassword: app.loginPassword ?? '',
    pluginId: app.pluginId ?? '',
    category: migrateLegacyCategoryId(app.category, categories),
  }))
}

export function loadApplications(): Application[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      saveApplications(sampleApplications)
      return sampleApplications
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      saveApplications(sampleApplications)
      return sampleApplications
    }

    const apps = normalizeApplications(parsed.filter(isValidApplication))
    if (apps.length === 0) {
      saveApplications(sampleApplications)
      return sampleApplications
    }

    saveApplications(apps)
    return apps
  } catch {
    saveApplications(sampleApplications)
    return sampleApplications
  }
}

export function saveApplications(applications: Application[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
}

export function createApplication(input: ApplicationInput): Application {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
