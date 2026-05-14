'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { setToken } from '@/lib/auth'
import type { SiteConfig, ApiError } from '@larpdb/shared'

export default function SetupPage() {
  const router = useRouter()
  const [gameName, setGameName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<SiteConfig>('/config')
      .then(() => router.replace('/login'))
      .catch(() => {})
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.post<{ token: string }>('/auth/setup', {
        email,
        password,
        displayName,
        gameName,
      })
      setToken(res.token)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError((err as ApiError).message ?? 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to larpDB</CardTitle>
          <CardDescription>Set up your game and create the owner account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1">
              <Label htmlFor="gameName">Game name</Label>
              <Input id="gameName" value={gameName} onChange={e => setGameName(e.target.value)} required placeholder="The Fellowship of the Ring" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="displayName">Your display name</Label>
              <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create game'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
