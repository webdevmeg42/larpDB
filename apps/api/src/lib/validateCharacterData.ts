import type { SchemaField } from '@plotrunner/shared'

export interface ValidationError {
  fieldId: string
  label: string
  message: string
}

export function validateCharacterData(
  fields: SchemaField[],
  data: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const field of fields) {
    if (field.type === 'section') continue

    const value = data[field.id]
    const isEmpty = value === undefined || value === null || value === ''

    if (field.required && isEmpty) {
      errors.push({ fieldId: field.id, label: field.label, message: 'This field is required' })
      continue
    }

    if (isEmpty) continue

    switch (field.type) {
      case 'text':
      case 'longtext':
        if (typeof value !== 'string') {
          errors.push({ fieldId: field.id, label: field.label, message: 'Must be a string' })
        }
        break

      case 'number':
        if (typeof value !== 'number') {
          errors.push({ fieldId: field.id, label: field.label, message: 'Must be a number' })
        } else {
          if (field.min !== undefined && value < field.min) {
            errors.push({ fieldId: field.id, label: field.label, message: `Must be at least ${field.min}` })
          }
          if (field.max !== undefined && value > field.max) {
            errors.push({ fieldId: field.id, label: field.label, message: `Must be at most ${field.max}` })
          }
        }
        break

      case 'toggle':
        if (typeof value !== 'boolean') {
          errors.push({ fieldId: field.id, label: field.label, message: 'Must be true or false' })
        }
        break

      case 'select': {
        const validValues = (field.options ?? []).map((o) => o.value)
        if (!validValues.includes(value as string)) {
          errors.push({ fieldId: field.id, label: field.label, message: 'Invalid option selected' })
        }
        break
      }

      case 'multiselect': {
        if (!Array.isArray(value)) {
          errors.push({ fieldId: field.id, label: field.label, message: 'Must be an array' })
        } else {
          const validValues = (field.options ?? []).map((o) => o.value)
          for (const v of value as unknown[]) {
            if (!validValues.includes(v as string)) {
              errors.push({ fieldId: field.id, label: field.label, message: `Invalid option: ${String(v)}` })
            }
          }
          if (field.maxSelections !== undefined && (value as unknown[]).length > field.maxSelections) {
            errors.push({ fieldId: field.id, label: field.label, message: `Maximum ${field.maxSelections} selections allowed` })
          }
        }
        break
      }

      case 'statblock': {
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push({ fieldId: field.id, label: field.label, message: 'Must be an object' })
        } else {
          const statValues = value as Record<string, unknown>
          for (const stat of field.stats ?? []) {
            const statVal = statValues[stat.key]
            if (statVal === undefined || statVal === null) continue
            if (typeof statVal !== 'number') {
              errors.push({ fieldId: field.id, label: field.label, message: `Stat "${stat.label}" must be a number` })
            } else {
              if (stat.min !== undefined && statVal < stat.min) {
                errors.push({ fieldId: field.id, label: field.label, message: `Stat "${stat.label}" must be at least ${stat.min}` })
              }
              if (stat.max !== undefined && statVal > stat.max) {
                errors.push({ fieldId: field.id, label: field.label, message: `Stat "${stat.label}" must be at most ${stat.max}` })
              }
            }
          }
        }
        break
      }
    }
  }

  return errors
}
