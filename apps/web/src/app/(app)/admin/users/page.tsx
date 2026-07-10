'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { User, UserRole } from '@plotrunner/shared'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.role !== 'owner') return
    api.get<User[]>('/users')
      .then(setUsers)
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false))
  }, [currentUser])

  if (currentUser?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    if (role === 'owner') return
    setSaving(userId)
    setError(null)
    try {
      const updated = await api.patch<User>(`/users/${userId}/role`, { role })
      setUsers(us => us.map(u => u.id === userId ? { ...u, role: updated.role } : u))
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update role'))
    } finally {
      setSaving(null)
    }
  }

  const roleColor: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
    owner: 'default',
    gm: 'secondary',
    player: 'outline',
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Users</h1>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Change role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-4">{u.displayName}</td>
                    <td className="p-4 text-muted-foreground">{u.email}</td>
                    <td className="p-4">
                      <Badge variant={roleColor[u.role] ?? 'outline'}>{u.role}</Badge>
                    </td>
                    <td className="p-4">
                      {u.role === 'owner' ? (
                        <span className="text-muted-foreground text-xs">Cannot change</span>
                      ) : (
                        <Select
                          value={u.role}
                          onChange={e => void handleRoleChange(u.id, e.target.value as UserRole)}
                          disabled={saving === u.id}
                          className="w-32"
                        >
                          <option value="player">Player</option>
                          <option value="gm">GM</option>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
