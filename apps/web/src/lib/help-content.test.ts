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
})

describe('HELP_ENTRIES', () => {
  it('has at least 8 entries', () => {
    expect(HELP_ENTRIES.length).toBeGreaterThanOrEqual(8)
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
