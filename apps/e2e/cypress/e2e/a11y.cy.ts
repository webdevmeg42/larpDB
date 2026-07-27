const A11Y_OPTIONS: Parameters<typeof cy.checkA11y>[1] = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
  // Suppress false positive: closed MobileDrawer has cream-on-cream text when offscreen.
  exclude: [['[data-testid="mobile-drawer"][data-state="closed"]']],
}

describe('WCAG 2.1 AA — authenticated routes', () => {
  before(() => {
    cy.loginOwner()
  })

  const routes = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Events', path: '/events' },
    { name: 'Characters', path: '/characters' },
    { name: 'Help', path: '/help' },
    { name: 'Profile', path: '/profile' },
    { name: 'Admin — Community', path: '/admin/community' },
    { name: 'Admin — Posts', path: '/admin/posts' },
    { name: 'Adventure Builder', path: '/adventures' },
    { name: 'Rulebook', path: '/rulebook' },
    { name: 'Browse', path: '/browse' },
  ]

  routes.forEach(({ name, path }) => {
    it(`${name} (${path}) has no WCAG AA violations`, () => {
      cy.visit(path)
      cy.injectAxe()
      cy.checkA11y(undefined, A11Y_OPTIONS)
    })
  })
})

describe('WCAG 2.1 AA — public routes', () => {
  it('Login page has no WCAG AA violations', () => {
    cy.visit('/login')
    cy.injectAxe()
    cy.checkA11y(undefined, A11Y_OPTIONS)
  })

  it('Public adventure page has no WCAG AA violations', () => {
    cy.request({ url: `${Cypress.env('API_URL')}/games?public=true&limit=1`, failOnStatusCode: false })
      .then(res => {
        const slug = res.body?.items?.[0]?.slug
        if (!slug) return cy.log('No public adventures seeded — skipping')
        cy.visit(`/adventures/${slug}`)
        cy.injectAxe()
        cy.checkA11y(undefined, A11Y_OPTIONS)
      })
  })
})
