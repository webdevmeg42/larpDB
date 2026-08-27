export interface ApiError extends Error {
  status: number
  data: unknown
}

export interface RequestOptions {
  headers?: Record<string, string>
}

export function createApiClient(
  baseUrl: string,
  getGameId?: () => string | null,
) {
  async function request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const gameId = getGameId?.()

    let res: Response
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        credentials: 'include',
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(gameId ? { 'X-Game-Id': gameId } : {}),
          ...options?.headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
    } catch (err) {
      console.error(`[api] ${method} ${path} — network error or request aborted`, err)
      throw err
    }

    if (res.status === 204) return undefined as T

    const data: unknown = await res.json()
    if (!res.ok) {
      // Build an error that carries the HTTP status and response body so callers
      // can branch on status codes without re-parsing the response themselves
      console.warn(`[api] ${method} ${path} → ${res.status}`, data)
      const err = Object.assign(new Error((data as { error?: string }).error ?? 'Request failed'), {
        status: res.status,
        data,
      }) as ApiError
      throw err
    }
    return data as T
  }

  return {
    get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
    patch: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
    delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
