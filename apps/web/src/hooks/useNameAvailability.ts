'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { getBaseSlug } from '@/lib/slug'

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid-slug'

export interface NameAvailabilityResult {
  status: AvailabilityStatus
  baseSlug: string
}

export function useNameAvailability(
  name: string,
  options?: { excludeId?: string; originalName?: string },
): NameAvailabilityResult {
  const [status, setStatus] = useState<AvailabilityStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = name.trim()

    if (!trimmed) {
      setStatus('idle')
      return
    }

    if (options?.originalName && trimmed.toLowerCase() === options.originalName.trim().toLowerCase()) {
      setStatus('idle')
      return
    }

    const slug = getBaseSlug(trimmed)
    if (!slug) {
      setStatus('invalid-slug')
      return
    }

    setStatus('checking')
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams({ name: trimmed })
      if (options?.excludeId) params.set('excludeId', options.excludeId)

      api.get<{ available: boolean }>(`/games/check-name?${params.toString()}`)
        .then(data => setStatus(data.available ? 'available' : 'taken'))
        .catch(() => setStatus('idle'))
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [name, options?.excludeId, options?.originalName])

  const baseSlug = getBaseSlug(name.trim())
  return { status, baseSlug }
}
