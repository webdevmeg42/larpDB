const sel = {
  navAdmin: '[data-testid="nav-admin"]',
  navAdvBuilder: '[data-testid="nav-adv-builder"]',
  navNewPost: '[data-testid="nav-new-post"]',
  newEventBtn: '[data-testid="new-event-btn"]',
}

describe('Player role — restricted UI not accessible', () => {
  before(() => {
    cy.loginPlayer()
  })

  context('Navigation — restricted tabs are hidden', () => {
    beforeEach(() => {
      cy.visit('/dashboard')
    })

    it('does not show the Admin tab', () => {
      cy.get(sel.navAdmin).should('not.exist')
    })

    it('does not show the Adventure Builder tab', () => {
      cy.get(sel.navAdvBuilder).should('not.exist')
    })

    it('does not show the New Post tab', () => {
      cy.get(sel.navNewPost).should('not.exist')
    })
  })

  context('Events page — Create Event button is hidden', () => {
    it('does not show the New Event button', () => {
      cy.visit('/events')
      cy.get(sel.newEventBtn).should('not.exist')
    })
  })

  context('Rulebook page — Edit Rulebook is not shown', () => {
    it('shows View Rulebook but not Edit Rulebook', () => {
      cy.visit('/rulebook')
      cy.contains('Edit Rulebook').should('not.exist')
      cy.contains('View Rulebook').should('exist')
    })
  })

  context('Direct URL access — restricted pages are blocked', () => {
    it('blocks direct navigation to /admin/community', () => {
      cy.visit('/admin/community')
      cy.contains("This page doesn't exist.").should('be.visible')
    })

    it('blocks direct navigation to /adventures', () => {
      cy.visit('/adventures')
      cy.contains("This page doesn't exist.").should('be.visible')
    })
  })
})
