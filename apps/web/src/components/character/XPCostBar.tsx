'use client'

import { Button } from '@/components/ui/button'

export interface XPCostBarProps {
  cost: number
  balance: number
  onSave: () => void
  onCancel: () => void
  saving: boolean
}

export function XPCostBar({ cost, balance, onSave, onCancel, saving }: XPCostBarProps) {
  const overBudget = cost > balance
  return (
    <div className="fixed bottom-0 left-56 right-0 border-t bg-background px-6 py-3 flex items-center justify-between z-40 shadow-md">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">
          Total cost:{' '}
          <span className={overBudget ? 'font-medium text-destructive' : 'font-medium text-foreground'}>
            {cost} XP
          </span>
          {' — '}
          You have{' '}
          <span className="font-medium text-foreground">{balance} XP</span>
        </span>
        {overBudget && (
          <span className="text-xs text-destructive">
            {cost - balance} XP over budget — reduce your selections before saving.
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || overBudget}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
