export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message =
      typeof data.error === 'string' ? data.error : 'An unexpected error occurred.'
    throw new ApiError(response.status, message)
  }

  return data as T
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  return parseResponse<T>(response)
}
