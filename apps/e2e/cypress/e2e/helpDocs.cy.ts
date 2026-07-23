describe('Help documentation', () => {
  context('Unauthenticated gating', () => {
    before(() => {
      cy.clearCookies()
    })

    it('redirects unauthenticated users from /help to /login', () => {
      cy.visit('/help')
      cy.url().should('include', '/login')
    })
  })

  context('Player role', () => {
    before(() => {
      cy.clearLocalStorage()
      cy.loginPlayer()
    })

    it('shows the Help nav tab in the sidebar', () => {
      cy.visit('/dashboard')
      cy.get('[data-testid="nav-help"]').should('be.visible')
    })

    it('shows player-accessible entries on /help', () => {
      cy.visit('/help')
      cy.contains('h2', 'Events').should('be.visible')
      cy.contains('h2', 'My Characters').should('be.visible')
      cy.contains('h2', 'Rulebook').should('be.visible')
    })

    it('does not show gm/owner-only entries on /help', () => {
      cy.visit('/help')
      cy.contains('h2', 'Events').should('be.visible')
      cy.contains('h2', 'Adventure Builder').should('not.exist')
      cy.contains('h2', 'Members & Users').should('not.exist')
      cy.contains('h2', 'Community & Posts').should('not.exist')
    })

    it('opens the help modal with page-specific content when help button is clicked', () => {
      cy.visit('/events')
      cy.get('[data-testid="help-button"]').click()
      cy.get('[role="dialog"]').should('be.visible')
      cy.contains('What are events?').should('be.visible')
    })

    it('closes the help modal', () => {
      cy.visit('/events')
      cy.get('[data-testid="help-button"]').click()
      cy.contains('What are events?').should('be.visible')
      cy.get('[role="dialog"]').find('[aria-label="Close"]').click()
      cy.contains('What are events?').should('not.exist')
    })
  })
})
