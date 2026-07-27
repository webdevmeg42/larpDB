export function groupByGame<TRow extends { gameId: string; gameName: string }, TItem>(
  rows: TRow[],
  toItem: (row: TRow) => TItem | null,
): { id: string; name: string; items: TItem[] }[] {
  const map = new Map<string, { id: string; name: string; items: TItem[] }>()
  for (const row of rows) {
    if (!map.has(row.gameId)) {
      map.set(row.gameId, { id: row.gameId, name: row.gameName, items: [] })
    }
    const item = toItem(row)
    if (item !== null) map.get(row.gameId)!.items.push(item)
  }
  return Array.from(map.values())
}
