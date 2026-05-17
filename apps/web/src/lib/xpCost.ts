import type { SchemaField } from '@larpdb/shared'

export function fieldHasXpCost(field: SchemaField): boolean {
  if (field.xpCostPerPoint !== undefined) return true
  if (field.xpCost !== undefined) return true
  if (field.options?.some(o => o.xpCost !== undefined)) return true
  if (field.stats?.some(s => s.xpCostPerPoint !== undefined)) return true
  return false
}

export function calculateXpDelta(
  fields: SchemaField[],
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): number {
  let total = 0
  for (const field of fields) {
    const oldVal = oldValues[field.id]
    const newVal = newValues[field.id]
    switch (field.type) {
      case 'number': {
        if (field.xpCostPerPoint === undefined) break
        const oldNum = typeof oldVal === 'number' ? oldVal : 0
        const newNum = typeof newVal === 'number' ? newVal : 0
        total += Math.max(0, (newNum - oldNum) * field.xpCostPerPoint)
        break
      }
      case 'toggle': {
        // Intentional: toggling off does not refund XP — one-way purchase
        if (field.xpCost === undefined) break
        if (oldVal !== true && newVal === true) total += field.xpCost
        break
      }
      case 'select': {
        const opts = field.options ?? []
        const oldCost = opts.find(o => o.value === oldVal)?.xpCost ?? 0
        const newCost = opts.find(o => o.value === newVal)?.xpCost ?? 0
        total += Math.max(0, newCost - oldCost)
        break
      }
      case 'multiselect': {
        const opts = field.options ?? []
        const oldArr = Array.isArray(oldVal) ? oldVal.filter((x): x is string => typeof x === 'string') : []
        const newArr = Array.isArray(newVal) ? newVal.filter((x): x is string => typeof x === 'string') : []
        const oldSet = new Set(oldArr)
        const newSet = new Set(newArr)
        let delta = 0
        for (const opt of opts) {
          if (!oldSet.has(opt.value) && newSet.has(opt.value)) delta += opt.xpCost ?? 0
          if (oldSet.has(opt.value) && !newSet.has(opt.value)) delta -= opt.xpCost ?? 0
        }
        total += Math.max(0, delta)
        break
      }
      case 'statblock': {
        const stats = field.stats ?? []
        const oldBlock = (typeof oldVal === 'object' && oldVal !== null) ? oldVal as Record<string, unknown> : {}
        const newBlock = (typeof newVal === 'object' && newVal !== null) ? newVal as Record<string, unknown> : {}
        for (const stat of stats) {
          if (stat.xpCostPerPoint === undefined) continue
          const oldStatVal = oldBlock[stat.key]
          const newStatVal = newBlock[stat.key]
          const oldNum = typeof oldStatVal === 'number' ? oldStatVal : 0
          const newNum = typeof newStatVal === 'number' ? newStatVal : 0
          total += Math.max(0, (newNum - oldNum) * stat.xpCostPerPoint)
        }
        break
      }
    }
  }
  return total
}
