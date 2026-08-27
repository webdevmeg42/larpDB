'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { StripeStatus } from '@plotrunner/shared'

interface PaymentsTabProps {
  gameId: string
  onStripeConnectedChange?: (connected: boolean) => void
}

export default function PaymentsTab({ gameId: _gameId, onStripeConnectedChange }: PaymentsTabProps) {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)

  async function fetchStatus() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<StripeStatus>('/stripe/status')
      setStatus(data)
      onStripeConnectedChange?.(data.stripeOnboardingComplete)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load Stripe status'))
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    setConnectLoading(true)
    try {
      const result = await api.post<{ url: string }>('/stripe/connect')
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
      await api.delete('/stripe/disconnect')
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

    if (params.get('refresh') === 'true') {
      // Immediately trigger a new connect flow
      void handleConnect()
      return
    }

    if (params.get('connected') === 'true') {
      // Re-fetch to confirm the connection
      void fetchStatus()
      return
    }

    void fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        {new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('connected') === 'true'
          ? 'Checking connection…'
          : 'Loading…'}
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
          <a
            data-testid="stripe-dashboard-link"
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            View Stripe dashboard
          </a>
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
