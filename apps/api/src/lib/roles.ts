export const gmOrOwner = (role: string) => role === 'owner' || role === 'gm'

export function buildPatch<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}
