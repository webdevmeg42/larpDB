describe('Mobile navigation', () => {
  before(() => {
    cy.loginOwner()
  })

  beforeEach(() => {
    cy.viewport(375, 667)
    cy.visit('/events')
  })

  it('hides the sidebar and shows the mobile header on narrow viewport', () => {
    // Desktop sidebar nav is hidden (the Sidebar component has hidden md:flex)
    // On 375px viewport, md: classes don't apply, so sidebar is hidden
    cy.get('[data-testid="nav-adv-builder"]').should('not.be.visible')
    // Mobile menu button is visible
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
    cy.get('[data-testid="nav-events"]').click()
    cy.get('[data-testid="mobile-drawer"]').should('have.attr', 'data-state', 'closed')
    cy.url().should('include', '/events')
  })

  it('opens the adventure picker dropdown when the chip is clicked', () => {
    cy.get('[data-testid="adventure-chip"]').should('be.visible').click()
    cy.get('[data-testid="adventure-picker-dropdown"]').should('be.visible')
  })

  it('closes the adventure picker when clicking outside', () => {
    cy.get('[data-testid="adventure-chip"]').click()
    cy.get('[data-testid="adventure-picker-dropdown"]').should('be.visible')
    cy.get('h1').click()
    cy.get('[data-testid="adventure-picker-dropdown"]').should('not.exist')
  })
})
