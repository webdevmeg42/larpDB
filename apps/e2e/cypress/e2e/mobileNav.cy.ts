describe('Mobile navigation', () => {
  before(() => {
    cy.loginOwner()
  })

  beforeEach(() => {
    cy.viewport(375, 667)
    cy.visit('/events')
  })

  it('hides the sidebar and shows the mobile header on narrow viewport', () => {
    cy.get('[data-testid="nav-adv-builder"]').should('not.be.visible')
    cy.get('[data-testid="mobile-menu-btn"]').should('be.visible')
  })

  it('opens the nav drawer when hamburger is clicked', () => {
    cy.get('[data-testid="mobile-drawer"]').should('have.attr', 'data-state', 'closed')
    cy.get('[data-testid="mobile-menu-btn"]').click()
    cy.get('[data-testid="mobile-drawer"]').should('have.attr', 'data-state', 'open')
  })

  it('closes the drawer when a nav link is clicked', () => {
    cy.get('[data-testid="mobile-menu-btn"]').click()
    cy.get('[data-testid="mobile-drawer"]').should('have.attr', 'data-state', 'open')
    // Mobile drawer prefixes all nav testIds with "mobile-" (see MobileDrawer.tsx)
    cy.get('[data-testid="mobile-drawer"] [data-testid="mobile-nav-events"]').click()
    cy.get('[data-testid="mobile-drawer"]').should('have.attr', 'data-state', 'closed')
    cy.url().should('include', '/events')
  })

  describe('adventure picker (requires at least one game)', () => {
    beforeEach(() => {
      // Stub /my-games so the adventure chip renders regardless of seeded data.
      // The API is at a different origin (localhost:3001), so we match with a glob.
      // Re-visit after registering the intercept so the stub is active during page load
      // (outer beforeEach visits first, then inner beforeEach runs — wrong order otherwise).
      cy.intercept('GET', '**/my-games', {
        statusCode: 200,
        body: [{ id: 'test-game-id', name: 'Test Adventure', slug: 'test-adventure', isPublic: false, joinMode: 'invite', status: 'active', role: 'owner', memberCount: 1 }],
      }).as('myGames')
      cy.visit('/events')
    })

    it('opens the adventure picker dropdown when the chip is clicked', () => {
      cy.get('[data-testid="adventure-chip"]').should('be.visible').click()
      cy.get('[data-testid="adventure-picker-dropdown"]').should('be.visible')
    })

    it('closes the adventure picker when clicking outside', () => {
      cy.get('[data-testid="adventure-chip"]').click()
      cy.get('[data-testid="adventure-picker-dropdown"]').should('be.visible')
      // Click the left edge of the main content area — outside chipRef and not covered
      // by the right-aligned dropdown (min-w-[160px] right-0 on a 375px viewport).
      // cy.contains('PlotRunner') finds the hidden desktop Sidebar first, so avoid it.
      cy.get('main').click('topLeft')
      cy.get('[data-testid="adventure-picker-dropdown"]').should('not.exist')
    })
  })
})
