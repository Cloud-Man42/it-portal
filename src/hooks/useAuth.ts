import { useCallback, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../lib/api'
import type { User } from '../types/user'

interface AuthResponse {
  user: User
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<AuthResponse>('/api/auth/me')
      setUser(data.user)
      setError(null)
      return data.user
    } catch (err) {
      setUser(null)
      if (err instanceof ApiError && err.status === 401) {
        setError(null)
      } else if (err instanceof Error) {
        setError(err.message)
      }
      return null
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await refresh()
      setLoading(false)
    })()
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    setUser(data.user)
    setError(null)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  return {
    user,
    loading,
    error,
    login,
    logout,
    refresh,
    isAuthenticated: user !== null,
  }
}
