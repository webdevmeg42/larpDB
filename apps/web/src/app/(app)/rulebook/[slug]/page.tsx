import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { RulebookDetailClient } from './_components/RulebookDetailClient'
import type { SiteConfig, Game } from '@plotrunner/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function fetchJson<T>(url: string, reqHeaders: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers: reqHeaders, cache: 'no-store' })
  if (!res.ok) throw Object.assign(new Error(res.statusText), { status: res.status })
  return res.json() as Promise<T>
}

export default async function RulebookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = (await cookies()).get('token')?.value ?? ''

  try {
    const [config, game] = await Promise.all([
      fetchJson<SiteConfig>(`${API_URL}/config`, { Cookie: `token=${token}`, 'X-Game-Id': slug }),
      fetchJson<Game>(`${API_URL}/game`, { Cookie: `token=${token}`, 'X-Game-Id': slug }),
    ])
    return <RulebookDetailClient slug={slug} initialConfig={config} initialGame={game} />
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 401 || status === 403) redirect('/login')
    if (status === 404) notFound()
    throw err
  }
}
