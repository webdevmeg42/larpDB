'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApiError } from '@plotrunner/shared'

export default function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        await register({ email, password, displayName })
      } else {
        await login({ email, password })
      }
    } catch (err: unknown) {
      setError((err as ApiError).message ?? (mode === 'signup' ? 'Registration failed' : 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const isSignUp = mode === 'signup'

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">PlotRunner</CardTitle>
          <CardDescription>
            {isSignUp ? 'Create an account to get started' : 'Sign in to manage your game'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div role="alert" className="min-h-[1.25rem]">
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            {isSignUp && (
              <div className="space-y-1">
                <Label htmlFor="displayName">Username</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus={!isSignUp}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? isSignUp ? 'Creating account…' : 'Signing in…'
                : isSignUp ? 'Create account' : 'Sign in'}
            </Button>
            {isSignUp && (
              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
              </p>
            )}
            <p className="text-sm text-muted-foreground text-center">
              {isSignUp ? (
                <>Already have an account?{' '}
                  <button type="button" className="underline" onClick={() => switchMode('signin')}>
                    Sign in
                  </button>
                </>
              ) : (
                <>Don&apos;t have an account?{' '}
                  <button type="button" className="underline" onClick={() => switchMode('signup')}>
                    Sign up
                  </button>
                </>
              )}
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
