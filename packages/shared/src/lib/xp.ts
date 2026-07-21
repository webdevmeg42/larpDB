import type { GameCodex } from '../types/game.js'

export function computeCumulativeXp(level: number, codex: GameCodex): number | null {
  if (!codex.levelingSystem || level < 1) return null
  const sys = codex.levelingSystem
  const linInc = codex.linearIncrement ?? 0
  const flat = codex.flatCost ?? 0
  switch (sys) {
    case 'linear': return linInc > 0 ? linInc * level * (level + 1) / 2 : null
    case 'flat': return flat > 0 ? flat * level : null
    case 'doubling': return 5 * (Math.pow(2, level) - 1)
    case 'triangular': return level * (level + 1) * (level + 2) / 6
    case 'fibonacci': {
      if (level === 1) return 1
      let total = 3, a = 1, b = 2
      for (let n = 3; n <= level; n++) { const next = a + b; total += next; a = b; b = next }
      return total
    }
    case 'percentage': {
      let total = 0
      for (let n = 1; n <= level; n++) total += Math.round(10 * Math.pow(1.5, n - 1))
      return total
    }
    default: return null
  }
}

interface CodexLevelConfig {
  levelingSystem?: string
  linearIncrement?: number
  flatCost?: number
}

export function computeCodexLevel(base: number, level: number, codex: CodexLevelConfig): number {
  if (level <= 1) return base
  const sys = codex.levelingSystem
  const linInc = codex.linearIncrement ?? 1
  const flat = codex.flatCost ?? 1
  switch (sys) {
    case 'percentage':
      return Math.round(base * Math.pow(1.5, level - 1))
    case 'doubling':
      return Math.round(base * Math.pow(2, level - 1))
    case 'flat':
      return Math.round(base + flat * (level - 1))
    case 'linear':
      return Math.round(base + linInc * (level - 1))
    case 'triangular':
      return Math.round(base + (level - 1) * level / 2)
    case 'fibonacci': {
      let a = 1, b = 1
      for (let n = 3; n <= level + 1; n++) { const next = a + b; a = b; b = next }
      return Math.round(base + b - 1)
    }
    default:
      return base
  }
}
