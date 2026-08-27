'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { StripeStatus } from '@plotrunner/shared'

interface PaymentsTabProps {
  gameId: string
  onStripeConnectedChange?: (connected: boolean) => void
}

export default function PaymentsTab({ gameId, onStripeConnectedChange }: PaymentsTabProps) {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)
  const isCheckingConnectionRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<StripeStatus>('/stripe/status', {
        headers: { 'x-game-id': gameId },
      })
      setStatus(data)
      onStripeConnectedChange?.(data.stripeOnboardingComplete)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load Stripe status'))
    } finally {
      setLoading(false)
    }
  }, [gameId, onStripeConnectedChange])

  async function handleConnect() {
    setConnectLoading(true)
    try {
      const result = await api.post<{ url: string }>('/stripe/connect', undefined, {
        headers: { 'x-game-id': gameId },
      })
      window.location.href = result.url
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to start Stripe Connect'))
      setConnectLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect your Stripe account? Your store will stop accepting payments.')) return
    setDisconnecting(true)
    try {
      await api.delete('/stripe/disconnect', {
        headers: { 'x-game-id': gameId },
      })
      setStatus({ stripeAccountId: null, stripeOnboardingComplete: false })
      onStripeConnectedChange?.(false)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to disconnect Stripe'))
    } finally {
      setDisconnecting(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    isCheckingConnectionRef.current = params.get('connected') === 'true'

    if (params.get('refresh') === 'true') {
      // Immediately trigger a new connect flow
      void handleConnect()
      return
    }

    void fetchStatus()
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        {isCheckingConnectionRef.current ? 'Checking connection…' : 'Loading…'}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6 text-sm text-destructive">{error}</div>
    )
  }

  if (!status) return null

  // State 3: Fully connected
  if (status.stripeOnboardingComplete) {
    return (
      <div data-testid="payments-connected" className="space-y-4">
        <p className="text-sm text-muted-foreground">Your store is ready to accept payments.</p>
        <div className="flex gap-3">
          <Button asChild variant="outline" data-testid="stripe-dashboard-link">
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
              View Stripe dashboard
            </a>
          </Button>
          <Button
            data-testid="stripe-disconnect-btn"
            variant="destructive"
            onClick={() => void handleDisconnect()}
            disabled={disconnecting}
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </div>
      </div>
    )
  }

  // State 2: Connected but incomplete
  if (status.stripeAccountId !== null) {
    return (
      <div data-testid="payments-incomplete" className="space-y-4">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Your Stripe setup isn&apos;t finished. Complete onboarding to unlock your store.
        </p>
        <Button
          data-testid="stripe-continue-btn"
          onClick={() => void handleConnect()}
          disabled={connectLoading}
        >
          {connectLoading ? 'Redirecting…' : 'Continue setup'}
        </Button>
      </div>
    )
  }

  // State 1: Not connected
  return (
    <div data-testid="payments-not-connected" className="space-y-4">
      <h3 className="text-base font-semibold">Accept payments in your store</h3>
      <p className="text-sm text-muted-foreground">
        Connect a Stripe account to start selling tickets, merchandise, and more.
      </p>
      <Button
        data-testid="stripe-connect-btn"
        onClick={() => void handleConnect()}
        disabled={connectLoading}
      >
        {connectLoading ? 'Redirecting…' : 'Connect Stripe'}
      </Button>
    </div>
  )
}
