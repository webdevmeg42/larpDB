import { describe, it, expect } from 'vitest'
import { canSeeEntry, findEntryForPath, HELP_ENTRIES, type HelpEntry } from './help-content'

const playerEntry: HelpEntry = {
  slug: 'test-player',
  title: 'Test Player',
  minRole: 'player',
  paths: ['/test-player'],
  sections: [],
}
const gmEntry: HelpEntry = {
  slug: 'test-gm',
  title: 'Test GM',
  minRole: 'gm',
  paths: ['/test-gm'],
  sections: [],
}
const ownerEntry: HelpEntry = {
  slug: 'test-owner',
  title: 'Test Owner',
  minRole: 'owner',
  paths: ['/test-owner'],
  sections: [],
}
const guestOnlyEntry: HelpEntry = {
  slug: 'test-guest',
  title: 'Test Guest',
  minRole: 'player',
  guestOnly: true,
  paths: [],
  sections: [],
}

describe('canSeeEntry', () => {
  it('player can see player entries', () => {
    expect(canSeeEntry('player', playerEntry)).toBe(true)
  })
  it('player cannot see gm entries', () => {
    expect(canSeeEntry('player', gmEntry)).toBe(false)
  })
  it('player cannot see owner entries', () => {
    expect(canSeeEntry('player', ownerEntry)).toBe(false)
  })
  it('gm can see player entries', () => {
    expect(canSeeEntry('gm', playerEntry)).toBe(true)
  })
  it('gm can see gm entries', () => {
    expect(canSeeEntry('gm', gmEntry)).toBe(true)
  })
  it('gm cannot see owner entries', () => {
    expect(canSeeEntry('gm', ownerEntry)).toBe(false)
  })
  it('owner can see all entries', () => {
    expect(canSeeEntry('owner', playerEntry)).toBe(true)
    expect(canSeeEntry('owner', gmEntry)).toBe(true)
    expect(canSeeEntry('owner', ownerEntry)).toBe(true)
  })
  it('unknown role cannot see any entries', () => {
    expect(canSeeEntry('stranger', playerEntry)).toBe(false)
  })
  it('guest-only entry is visible when isGuest=true', () => {
    expect(canSeeEntry('player', guestOnlyEntry, true)).toBe(true)
  })
  it('guest-only entry is hidden when isGuest=false', () => {
    expect(canSeeEntry('player', guestOnlyEntry, false)).toBe(false)
  })
  it('guest-only entry is hidden when isGuest is undefined', () => {
    expect(canSeeEntry('player', guestOnlyEntry)).toBe(false)
  })
  it('non-guest entry is visible regardless of isGuest flag', () => {
    expect(canSeeEntry('player', playerEntry, true)).toBe(true)
    expect(canSeeEntry('player', playerEntry, false)).toBe(true)
  })
})

describe('findEntryForPath', () => {
  const entries: HelpEntry[] = [
    { slug: 'a', title: 'A', minRole: 'player', paths: ['/events'], sections: [] },
    { slug: 'b', title: 'B', minRole: 'gm', paths: ['/admin/community', '/admin/posts'], sections: [] },
    { slug: 'c', title: 'C', minRole: 'owner', paths: ['/adventures'], sections: [] },
  ]

  it('matches an exact path', () => {
    expect(findEntryForPath('/events', 'player', entries)?.slug).toBe('a')
  })
  it('matches a path prefix', () => {
    expect(findEntryForPath('/events/123', 'player', entries)?.slug).toBe('a')
  })
  it('matches the second path in a multi-path entry', () => {
    expect(findEntryForPath('/admin/posts', 'gm', entries)?.slug).toBe('b')
  })
  it('returns null when no path matches', () => {
    expect(findEntryForPath('/profile', 'player', entries)).toBeNull()
  })
  it('returns null when role is too low', () => {
    expect(findEntryForPath('/adventures', 'player', entries)).toBeNull()
  })
  it('returns null for an unknown path', () => {
    expect(findEntryForPath('/not-a-page', 'owner', entries)).toBeNull()
  })
  it('prefers the longer prefix when two entries overlap', () => {
    const nested: HelpEntry[] = [
      { slug: 'admin',     title: '',  minRole: 'owner', paths: ['/admin'],           sections: [] },
      { slug: 'community', title: '',  minRole: 'owner', paths: ['/admin/community'], sections: [] },
    ]
    expect(findEntryForPath('/admin/community/posts', 'owner', nested)?.slug).toBe('community')
  })
  it('defaults to HELP_ENTRIES when no entries arg is provided', () => {
    expect(findEntryForPath('/dashboard', 'player')?.slug).toBe('dashboard')
  })
})

describe('HELP_ENTRIES', () => {
  it('has exactly 10 entries', () => {
    expect(HELP_ENTRIES.length).toBe(10)
  })
  it('every entry has at least one section', () => {
    for (const entry of HELP_ENTRIES) {
      expect(entry.sections.length).toBeGreaterThan(0)
    }
  })
  it('all slugs are unique', () => {
    const slugs = HELP_ENTRIES.map(e => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
