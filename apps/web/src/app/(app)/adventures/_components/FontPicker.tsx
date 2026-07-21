'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FONTS } from '@/lib/fonts'
import { cn } from '@/lib/utils'

interface FontPickerProps {
  fontHeading: string | undefined
  fontBody: string | undefined
  onChange: (key: 'fontHeading' | 'fontBody', value: string) => void
  headingError?: string
  bodyError?: string
}

export function FontPicker({ fontHeading, fontBody, onChange, headingError, bodyError }: FontPickerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Typography <span className="text-destructive text-base font-normal">*</span></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <fieldset className="border-none p-0 m-0 space-y-2">
            <legend className="text-xs text-muted-foreground uppercase tracking-wide">
              Heading Font <span className="text-destructive">*</span>
            </legend>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {FONTS.map(font => {
                const isSelected = fontHeading === font.name
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => onChange('fontHeading', font.name)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    <span className="block font-medium" style={{ fontFamily: font.family }}>{font.name}</span>
                    <span className="block text-xs opacity-70">{font.theme}</span>
                  </button>
                )
              })}
            </div>
            {headingError && <p className="text-xs text-destructive">{headingError}</p>}
          </fieldset>
          <fieldset className="border-none p-0 m-0 space-y-2">
            <legend className="text-xs text-muted-foreground uppercase tracking-wide">
              Body Font <span className="text-destructive">*</span>
            </legend>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {FONTS.map(font => {
                const isSelected = fontBody === font.name
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => onChange('fontBody', font.name)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    <span className="block font-medium" style={{ fontFamily: font.family }}>{font.name}</span>
                    <span className="block text-xs opacity-70">{font.theme}</span>
                  </button>
                )
              })}
            </div>
            {bodyError && <p className="text-xs text-destructive">{bodyError}</p>}
          </fieldset>
        </div>
      </CardContent>
    </Card>
  )
}
