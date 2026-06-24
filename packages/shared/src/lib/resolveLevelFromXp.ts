import type { GameCodex } from '../types/game.js'
import { computeCumulativeXp } from './xp.js'

export function resolveLevelFromXp(totalXp: number, codex: GameCodex): number | null {
  if (!codex.levelingSystem) return null
  const maxLevel = codex.maxLevel ?? 20
  const baseLevel = codex.baseLevel ?? 1
  let resolved = baseLevel
  for (let l = baseLevel + 1; l <= maxLevel; l++) {
    const required = computeCumulativeXp(l, codex)
    if (required === null || totalXp < required) break
    resolved = l
  }
  return resolved
}
