'use client'

import { Label } from '@/components/ui/label'

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

export function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}

export function LevelSelect({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(parseInt(e.target.value))}
      className="rounded border border-input bg-background px-2 py-1 text-sm"
    >
      {Array.from({ length: max + 5 }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  )
}

export function getLevelingSystemLabel(sys: string): string {
  switch (sys) {
    case 'percentage': return 'Percentage (×1.5 per level)'
    case 'doubling': return 'Doubling (×2 per level)'
    case 'flat': return 'Flat (constant increment)'
    case 'linear': return 'Linear (constant increment)'
    case 'triangular': return 'Triangular sequence'
    case 'fibonacci': return 'Fibonacci sequence'
    default: return sys
  }
}
