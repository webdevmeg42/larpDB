export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
}

export function formatDateRange(startAt: string, endAt: string | null): string {
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : null
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (!end || end.toDateString() === start.toDateString()) {
    return start.toLocaleDateString(undefined, { ...opts, year: 'numeric' })
  }
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString(undefined, opts)}–${end.getDate()}, ${start.getFullYear()}`
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}, ${start.getFullYear()}`
  }
  // Different years: show year on both ends
  return `${start.toLocaleDateString(undefined, { ...opts, year: 'numeric' })} – ${end.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`
}

export function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return 'just now'
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  const years = Math.floor(months / 12)
  if (years === 0) return `${months} months ago`
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}
