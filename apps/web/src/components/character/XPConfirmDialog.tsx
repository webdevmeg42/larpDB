'use client'

import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface XPConfirmDialogProps {
  open: boolean
  cost: number
  balance: number
  onConfirm: () => void
  onCancel: () => void
}

export function XPConfirmDialog({ open, cost, balance, onConfirm, onCancel }: XPConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Spend XP?</DialogTitle>
      <DialogDescription>
        Saving these changes will spend {cost} XP. You will have {balance - cost} XP remaining. Continue?
      </DialogDescription>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm}>Confirm</Button>
      </div>
    </Dialog>
  )
}
