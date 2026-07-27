export function parsePagination(
  query: { limit?: unknown; offset?: unknown },
  defaults: { limit: number; maxLimit: number },
): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(parseInt(String(query.limit ?? ''), 10) || defaults.limit, 1),
    defaults.maxLimit,
  )
  const offset = Math.max(parseInt(String(query.offset ?? ''), 10) || 0, 0)
  return { limit, offset }
}
