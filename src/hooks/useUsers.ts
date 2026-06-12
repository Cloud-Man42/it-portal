import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { User, UserInput, UserUpdateInput } from '../types/user'

interface UsersResponse {
  users: User[]
}

interface UserResponse {
  user: User
}

export function useUsers(enabled: boolean) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUsers([])
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch<UsersResponse>('/api/users')
      setUsers(data.users)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addUser = useCallback(
    async (input: UserInput) => {
      const data = await apiFetch<UserResponse>('/api/users', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      setUsers((current) =>
        [...current, data.user].sort((a, b) => a.username.localeCompare(b.username, 'en')),
      )
      return data.user
    },
    [],
  )

  const updateUser = useCallback(async (id: string, input: UserUpdateInput) => {
    const data = await apiFetch<UserResponse>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    setUsers((current) =>
      current
        .map((user) => (user.id === id ? data.user : user))
        .sort((a, b) => a.username.localeCompare(b.username, 'en')),
    )
    return data.user
  }, [])

  const deleteUser = useCallback(async (id: string) => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
    setUsers((current) => current.filter((user) => user.id !== id))
  }, [])

  return {
    users,
    loading,
    refresh,
    addUser,
    updateUser,
    deleteUser,
  }
}
