import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { Application, ApplicationInput } from '../types/application'

interface ApplicationsResponse {
  applications: Application[]
}

interface ApplicationResponse {
  application: Application
}

export function useApplications(enabled: boolean) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setApplications([])
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch<ApplicationsResponse>('/api/applications')
      setApplications(data.applications)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addApplication = useCallback(async (input: ApplicationInput) => {
    const data = await apiFetch<ApplicationResponse>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setApplications((current) => [data.application, ...current])
    return data.application
  }, [])

  const updateApplication = useCallback(async (id: string, input: ApplicationInput) => {
    const data = await apiFetch<ApplicationResponse>(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    setApplications((current) =>
      current.map((app) => (app.id === id ? data.application : app)),
    )
  }, [])

  const deleteApplication = useCallback(async (id: string) => {
    await apiFetch(`/api/applications/${id}`, { method: 'DELETE' })
    setApplications((current) => current.filter((app) => app.id !== id))
  }, [])

  return {
    applications,
    loading,
    refresh,
    addApplication,
    updateApplication,
    deleteApplication,
  }
}
