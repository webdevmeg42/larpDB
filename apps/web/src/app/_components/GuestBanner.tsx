'use client'

import { useAuthContext } from '@/providers/AuthProvider'

export function GuestBanner() {
  const { user } = useAuthContext()
  if (!user?.isGuest) return null

  return (
    <div
      style={{
        background: '#c9a84c11',
        borderBottom: '1px solid #c9a84c33',
        padding: '8px 20px',
        textAlign: 'center',
        fontSize: 13,
        color: '#c4d4e6',
      }}
    >
      You&apos;re in guest mode — your data resets in 24 hours.{' '}
      <a href="/login" style={{ color: '#c9a84c', textDecoration: 'underline' }}>
        Create a free account →
      </a>
    </div>
  )
}
