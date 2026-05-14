'use client'

import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Welcome back, {user.displayName}</h1>
      <p className="mt-1 text-muted-foreground capitalize">Role: {user.role}</p>
    </div>
  )
}
