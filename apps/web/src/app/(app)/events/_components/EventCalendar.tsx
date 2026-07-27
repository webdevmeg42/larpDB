'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { formatDateRange } from '@plotrunner/shared'

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

const PALETTE = [
  'hsl(var(--primary))',
  'hsl(220 60% 55%)',
  'hsl(160 50% 45%)',
  'hsl(35 80% 55%)',
  'hsl(290 45% 55%)',
  'hsl(10 70% 55%)',
]

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

type BarPosition = 'solo' | 'start' | 'mid' | 'end'

function getBarPosition(
  cellDate: Date,
  rowDates: Date[],
  eventStart: Date,
  eventEnd: Date,
): BarPosition | null {
  const s = startOfDay(eventStart)
  const e = startOfDay(eventEnd)
  const d = startOfDay(cellDate)
  if (d < s || d > e) return null

  const covered = rowDates.map(startOfDay).filter(rd => rd >= s && rd <= e)
  if (covered.length === 0) return null
  const first = covered[0]!
  const last = covered[covered.length - 1]!

  const isFirst = isSameDay(d, first)
  const isLast = isSameDay(d, last)
  if (isFirst && isLast) return 'solo'
  if (isFirst) return 'start'
  if (isLast) return 'end'
  return 'mid'
}

export function EventCalendar({
  events,
  games,
  month,
  onMonthChange,
  onDayFilter,
}: EventCalendarProps) {
  const [showAllAdventures, setShowAllAdventures] = useState(false)
  const today = new Date()
  const weeks = buildWeeks(month)

  interface EventEntry {
    event: CalendarEvent
    color: string
  }

  const activeEvents: EventEntry[] = showAllAdventures
    ? games.flatMap((g, gi) =>
        g.events.map(e => ({ event: e, color: PALETTE[gi % PALETTE.length]! }))
      )
    : events.map(e => ({ event: e, color: PALETTE[0]! }))

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedEventId) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedEventId(null)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedEventId(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [selectedEventId])

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

            const bars: Array<{ entry: EventEntry; pos: BarPosition }> = []
            for (const entry of activeEvents) {
              const evtStart = new Date(entry.event.startAt)
              const evtEnd = entry.event.endAt ? new Date(entry.event.endAt) : evtStart
              const pos = getBarPosition(day, week, evtStart, evtEnd)
              if (pos) bars.push({ entry, pos })
            }

            const SHOW_MAX = 2
            const overflowCount = bars.length - SHOW_MAX
            const visibleBars = bars.slice(0, SHOW_MAX)

            // Show popover only anchored to the bar's start/solo cell so it renders exactly once
            const selectedBar = selectedEventId
              ? bars.find(b => b.entry.event.id === selectedEventId && (b.pos === 'start' || b.pos === 'solo'))
              : null
            const selectedEvent = selectedBar?.entry.event ?? null

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

                <div className="flex flex-col gap-[2px]">
                  {visibleBars.map(({ entry, pos }, bi) => (
                    <div
                      key={`${entry.event.id}-${bi}`}
                      data-testid="event-bar"
                      data-event-id={entry.event.id}
                      title={entry.event.title}
                      onClick={() => setSelectedEventId(entry.event.id)}
                      style={{
                        backgroundColor: entry.color,
                        borderRadius:
                          pos === 'solo'  ? '3px' :
                          pos === 'start' ? '3px 0 0 3px' :
                          pos === 'end'   ? '0 3px 3px 0' :
                          '0',
                        marginLeft:  pos === 'start' || pos === 'solo' ? '0' : '-4px',
                        marginRight: pos === 'end'   || pos === 'solo' ? '0' : '-4px',
                      }}
                      className="h-[18px] flex items-center overflow-hidden cursor-pointer hover:opacity-80"
                    >
                      {(pos === 'start' || pos === 'solo') && (
                        <span className="text-[10px] text-white font-medium truncate leading-none px-1">
                          {entry.event.title}
                        </span>
                      )}
                    </div>
                  ))}

                  {overflowCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onDayFilter?.(startOfDay(day))}
                      className="text-[10px] text-muted-foreground hover:text-foreground text-left px-1 leading-tight"
                    >
                      +{overflowCount} more
                    </button>
                  )}
                </div>

                {selectedEvent && (
                  <div
                    ref={popoverRef}
                    data-testid="event-popover"
                    className="absolute z-50 bg-background border border-border rounded-md shadow-lg p-3 w-56 text-sm"
                    style={{ top: '100%', left: 0 }}
                  >
                    <p className="font-medium truncate">{selectedEvent.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateRange(selectedEvent.startAt, selectedEvent.endAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEvent.location ?? '—'}
                    </p>
                    <Link
                      href={`/events/${selectedEvent.id}`}
                      className="text-xs text-primary hover:underline mt-2 block"
                    >
                      View →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
