export interface ApiError extends Error {
  status: number
  data: unknown
}

export function createApiClient(
  baseUrl: string,
  getToken: () => string | null,
  getGameId?: () => string | null,
) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = getToken()
    const gameId = getGameId?.()

    let res: Response
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(gameId ? { 'X-Game-Id': gameId } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
    } catch (err) {
      console.error(`[api] ${method} ${path} — fetch threw, server might be unreachable`, err)
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
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
