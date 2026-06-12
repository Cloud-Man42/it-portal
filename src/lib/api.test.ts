import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './api'

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON for successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ok: true, value: 42 }),
      }),
    )

    const result = await apiFetch<{ value: number }>('/api/example')
    expect(result.value).toBe(42)
  })

  it('throws ApiError with server error messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: 'You do not have permission for this action.' }),
      }),
    )

    await expect(apiFetch('/api/forbidden')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'You do not have permission for this action.',
    } satisfies Partial<ApiError>)
  })

  it('uses a fallback message when the response body has no error field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ details: 'broken' }),
      }),
    )

    await expect(apiFetch('/api/broken')).rejects.toThrow('An unexpected error occurred.')
  })

  it('sends JSON requests with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/example', {
      method: 'POST',
      body: JSON.stringify({ name: 'Example' }),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/example',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ name: 'Example' }),
      }),
    )
  })
})
