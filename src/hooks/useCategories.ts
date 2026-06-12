import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { CategoryGroup, CategoryGroupInput } from '../types/category'

interface CategoriesResponse {
  categories: CategoryGroup[]
}

interface CategoryResponse {
  category: CategoryGroup
}

export function useCategories(enabled: boolean) {
  const [categories, setCategories] = useState<CategoryGroup[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCategories([])
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch<CategoriesResponse>('/api/categories')
      setCategories(data.categories)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addCategory = useCallback(async (input: CategoryGroupInput) => {
    const data = await apiFetch<CategoryResponse>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setCategories((current) =>
      [...current, data.category].sort((a, b) => a.name.localeCompare(b.name, 'en')),
    )
    return data.category
  }, [])

  const updateCategory = useCallback(async (id: string, input: CategoryGroupInput) => {
    const data = await apiFetch<CategoryResponse>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    setCategories((current) =>
      current
        .map((category) => (category.id === id ? data.category : category))
        .sort((a, b) => a.name.localeCompare(b.name, 'en')),
    )
  }, [])

  const deleteCategory = useCallback(async (id: string) => {
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
    setCategories((current) => current.filter((category) => category.id !== id))
  }, [])

  return {
    categories,
    loading,
    refresh,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
