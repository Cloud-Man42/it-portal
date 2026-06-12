import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { Application } from '../types/application'
import type { Role } from '../lib/permissions'

export interface ShareableUser {
  id: string
  username: string
  displayName: string
  role: Role
  applicationIds: string[]
}

interface SharesResponse {
  shareableApplications: Application[]
  users: ShareableUser[]
}

export function useShares(enabled: boolean) {
  const [shareableApplications, setShareableApplications] = useState<Application[]>([])
  const [users, setUsers] = useState<ShareableUser[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setShareableApplications([])
      setUsers([])
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch<SharesResponse>('/api/shares')
      setShareableApplications(data.shareableApplications)
      setUsers(data.users)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveUserShares = useCallback(async (userId: string, applicationIds: string[]) => {
    await apiFetch(`/api/shares/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ applicationIds }),
    })
    setUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, applicationIds } : user,
      ),
    )
  }, [])

  return {
    shareableApplications,
    users,
    loading,
    refresh,
    saveUserShares,
  }
}
