function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '')
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ]
}

function toLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// Returns '#000000' or '#ffffff' — whichever achieves WCAG AA (4.5:1) against `background`.
// Black is preferred: it is checked first and returned if it passes.
// One of black/white always passes for any valid hex input, so `fallback` and the final
// tiebreaker are structural guards that are never reached in practice.
// Note: contrast is computed for fully-opaque text. Callers that apply CSS opacity will
// reduce the effective contrast ratio below the guaranteed 4.5:1.
export function getContrastColor(background: string, fallback?: string): string {
  const [r, g, b] = hexToRgb(background)
  const bgL = relativeLuminance(r, g, b)

  if (contrastRatio(0, bgL) >= 4.5) return '#000000'
  if (contrastRatio(1, bgL) >= 4.5) return '#ffffff'

  if (fallback) {
    const [fr, fg, fb] = hexToRgb(fallback)
    const fallbackL = relativeLuminance(fr, fg, fb)
    if (contrastRatio(fallbackL, bgL) >= 4.5) return fallback
  }

  return contrastRatio(0, bgL) >= contrastRatio(1, bgL) ? '#000000' : '#ffffff'
}
