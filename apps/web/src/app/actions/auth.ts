'use server'

import { cookies } from 'next/headers'
import type { AuthUser } from '@/lib/auth'
import type { LoginInput, RegisterInput } from '@plotrunner/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  domain: process.env.COOKIE_DOMAIN,
  maxAge: 60 * 60 * 24 * 7,
}

async function callAuth(path: string, body: object): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json() as { user?: AuthUser; error?: string }

  if (!res.ok) {
    throw Object.assign(new Error(data.error ?? 'Request failed'), { status: res.status, data })
  }

  const setCookie = res.headers.get('set-cookie')
  const tokenMatch = setCookie?.match(/(?:^|,)\s*token=([^;,\s]+)/)
  if (tokenMatch?.[1]) {
    const store = await cookies()
    store.set('token', tokenMatch[1], COOKIE_OPTS)
  }

  return { user: data.user! }
}

export async function loginAction(input: LoginInput) {
  return callAuth('/auth/login', input)
}

export async function registerAction(input: RegisterInput) {
  return callAuth('/auth/register', input)
}

export async function logoutAction() {
  const store = await cookies()
  const token = store.get('token')?.value
  if (token) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `token=${token}` },
    }).catch(() => {})
  }
  store.delete('token')
}
