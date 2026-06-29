import { describe, it, expect } from 'vitest'
import { getContrastColor } from './contrast'

describe('getContrastColor', () => {
  it('returns black for bright yellow (very high luminance)', () => {
    // Cyberpunk primary: #E8FF00 → luminance ~0.89 → black ratio ~18.8:1
    expect(getContrastColor('#E8FF00')).toBe('#000000')
  })

  it('returns white for near-black background', () => {
    // Cyberpunk background: #0A0A0A → luminance ~0.001 → white ratio ~19.5:1
    expect(getContrastColor('#0A0A0A')).toBe('#ffffff')
  })

  it('returns black for mid-grey (black passes at ~5.3:1, white fails at ~3.9:1)', () => {
    expect(getContrastColor('#808080')).toBe('#000000')
  })

  it('returns black for pure white', () => {
    expect(getContrastColor('#FFFFFF')).toBe('#000000')
  })

  it('returns white for pure black', () => {
    expect(getContrastColor('#000000')).toBe('#ffffff')
  })

  it('returns white for dark navy (Medieval primary #1A3A8B)', () => {
    expect(getContrastColor('#1A3A8B')).toBe('#ffffff')
  })

  it('returns white for dark red (Gothic primary #8B0000)', () => {
    expect(getContrastColor('#8B0000')).toBe('#ffffff')
  })

  it('returns black for hot pink (Cyberpunk secondary #FF2D78)', () => {
    // luminance ~0.24 → black ratio ~5.9:1
    expect(getContrastColor('#FF2D78')).toBe('#000000')
  })

  it('ignores fallback when black already passes', () => {
    // black wins on mid-grey; fallback should not override
    expect(getContrastColor('#808080', '#FF0000')).toBe('#000000')
  })

  it('prefers black over white when both would pass', () => {
    // Very light color where black clearly wins — black is preferred first per spec
    expect(getContrastColor('#EEEEEE')).toBe('#000000')
  })
})
