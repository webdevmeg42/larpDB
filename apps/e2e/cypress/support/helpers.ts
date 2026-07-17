/**
 * Returns the given date formatted as YYMMDDHHMMSS with no separators.
 * Example: 2026-06-26 12:34:56 → "260626123456"
 */
export function testDateTime(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yy}${mm}${dd}${hh}${min}${ss}`
}
