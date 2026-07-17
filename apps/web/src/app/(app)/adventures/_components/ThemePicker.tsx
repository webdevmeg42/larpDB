'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PALETTES, type Palette } from '@/lib/palettes'
import { getContrastColor } from '@/lib/contrast'
import { cn } from '@/lib/utils'

interface ThemePickerProps {
  themeName: string | null | undefined
  onApply: (palette: Palette) => void
  validationError?: string
}

export function ThemePicker({ themeName, onApply, validationError }: ThemePickerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme <span className="text-destructive text-base font-normal">*</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {PALETTES.map(palette => {
            const isSelected = themeName === palette.id
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => onApply(palette)}
                title={palette.name}
                className={cn(
                  'rounded-lg overflow-hidden border-2 transition-all',
                  isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:border-border'
                )}
              >
                <div className="flex h-8">
                  <div className="flex-1" style={{ background: palette.colorPrimary }} />
                  <div className="flex-1" style={{ background: palette.colorSecondary }} />
                  <div className="flex-1" style={{ background: palette.colorBackground }} />
                  <div className="flex-1" style={{ background: palette.colorAccent }} />
                </div>
                <div
                  className="px-1 py-0.5 text-center"
                  style={{ background: palette.colorBackground, color: getContrastColor(palette.colorBackground) }}
                >
                  <span className="text-[9px] font-medium leading-none block truncate">{palette.name}</span>
                </div>
              </button>
            )
          })}
        </div>
        {themeName ? (
          <p className="text-xs text-muted-foreground">
            {PALETTES.find(p => p.id === themeName)?.emoji}{' '}
            {PALETTES.find(p => p.id === themeName)?.name} selected
          </p>
        ) : validationError ? (
          <p className="text-xs text-destructive">{validationError}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
