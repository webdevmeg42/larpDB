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
  return (
    <div className="fixed bottom-0 left-56 right-0 border-t bg-background px-6 py-3 flex items-center justify-between z-40 shadow-md">
      <span className="text-sm text-muted-foreground">
        Total cost:{' '}
        <span className="font-medium text-foreground">{cost} XP</span>
        {' — '}
        You have{' '}
        <span className={cost > balance ? 'font-medium text-destructive' : 'font-medium text-foreground'}>
          {balance} XP
        </span>
      </span>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={cost > balance || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
