import { cookies, headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])

  const token = cookieStore.get('token')?.value
  const gameId = cookieStore.get('gameId')?.value
  const bypassCache = headerStore.get('x-bypass-cache') === '1'

  const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) reqHeaders['Cookie'] = `token=${token}`
  if (gameId) reqHeaders['X-Game-Id'] = gameId
  if (bypassCache) reqHeaders['X-Bypass-Cache'] = '1'

  const fetchInit: RequestInit = {
    method,
    headers: reqHeaders,
    cache: 'no-store',
  }
  if (body !== undefined) {
    fetchInit.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_URL}${path}`, fetchInit)

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status })
  }
  return res.json() as Promise<T>
}

export const apiServer = {
  get:    <T>(path: string)                => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH',  path, body),
  delete: <T>(path: string)               => request<T>('DELETE', path),
}

export async function fetchOrRedirect<T>(fetcher: () => Promise<T>): Promise<T> {
  try {
    return await fetcher()
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 401 || status === 403) redirect('/login')
    if (status === 404) notFound()
    throw err
  }
}
