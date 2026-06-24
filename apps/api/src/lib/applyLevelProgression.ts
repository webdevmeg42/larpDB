import type { SchemaField } from '@larpdb/shared'

/**
 * Given a character's current level and their class schema fields, computes the
 * values for all locked progression fields (hitpoints, attacks, spells, statblock
 * with level entries) and merges them into the provided character data object.
 *
 * The highest defined level entry at or below `level` is used for each field.
 */
export function applyLevelProgression(
  level: number,
  classFields: SchemaField[],
  existingData: Record<string, unknown>,
): Record<string, unknown> {
  const data = { ...existingData }

  for (const field of classFields) {
    if (field.type === 'hitpoints') {
      const sorted = [...(field.hitPointEntries ?? [])].sort((a, b) => a.level - b.level)
      const applicable = sorted.filter(e => e.level <= level)
      if (applicable.length > 0) {
        data[field.id] = applicable[applicable.length - 1].hp
      }
    } else if (field.type === 'attacks') {
      data[field.id] = (field.attackEntries ?? []).filter(e => e.level <= level)
    } else if (field.type === 'spells') {
      data[field.id] = (field.spellEntries ?? []).filter(e => e.level <= level)
    } else if (field.type === 'statblock') {
      const stats = field.stats ?? []
      const hasProgression = stats.some(s => (s.levelEntries ?? []).length > 0)
      if (hasProgression) {
        const statValues: Record<string, number> = {}
        for (const stat of stats) {
          const sorted = [...(stat.levelEntries ?? [])].sort((a, b) => a.level - b.level)
          const applicable = sorted.filter(e => e.level <= level)
          if (applicable.length > 0) {
            statValues[stat.key] = applicable[applicable.length - 1].value
          }
        }
        data[field.id] = { ...(data[field.id] as Record<string, unknown> ?? {}), ...statValues }
      }
    }
  }

  return data
}
