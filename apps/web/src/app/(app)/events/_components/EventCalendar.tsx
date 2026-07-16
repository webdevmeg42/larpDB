'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: string
  title: string
  startAt: string
  endAt: string | null
  location: string | null
}

interface EventCalendarProps {
  events: CalendarEvent[]
  games: { id: string; events: CalendarEvent[] }[]
  month: Date
  onMonthChange: (d: Date) => void
  onDayFilter?: (date: Date | null) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function buildWeeks(month: Date): Date[][] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const cursor = new Date(year, m, 1)
  cursor.setDate(cursor.getDate() - cursor.getDay())
  const lastDay = new Date(year, m + 1, 0)
  const weeks: Date[][] = []
  while (cursor <= lastDay || weeks.length === 0) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    if (cursor > lastDay) break
  }
  return weeks
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function EventCalendar({
  events,
  games,
  month,
  onMonthChange,
}: EventCalendarProps) {
  const [showAllAdventures, setShowAllAdventures] = useState(false)
  const today = new Date()
  const weeks = buildWeeks(month)

  return (
    <div data-testid="event-calendar" className="border-b border-border select-none">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Previous month"
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium w-32 text-center">
            {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Next month"
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Adventure scope toggle */}
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowAllAdventures(false)}
            className={cn(
              'px-3 py-1 transition-colors',
              !showAllAdventures
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted',
            )}
          >
            This Adventure
          </button>
          <button
            type="button"
            onClick={() => setShowAllAdventures(true)}
            className={cn(
              'px-3 py-1 transition-colors',
              showAllAdventures
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted',
            )}
          >
            All Adventures
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_HEADERS.map(h => (
          <div key={h} className="py-1 text-center text-xs text-muted-foreground font-medium">
            {h}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <div
          key={wi}
          className={cn('grid grid-cols-7', wi < weeks.length - 1 && 'border-b border-border')}
        >
          {week.map((day, di) => {
            const isCurrentMonth = day.getMonth() === month.getMonth()
            const isToday = isSameDay(day, today)
            return (
              <div
                key={di}
                className={cn(
                  'relative min-h-[72px] p-1 border-r border-border last:border-r-0',
                  !isCurrentMonth && 'opacity-40',
                )}
              >
                <div
                  className={cn(
                    'h-6 w-6 flex items-center justify-center text-xs mb-0.5 rounded-full',
                    isToday && 'bg-primary text-primary-foreground font-medium',
                  )}
                >
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
