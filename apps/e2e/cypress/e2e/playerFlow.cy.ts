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

    it('shows the Adventure Builder tab', () => {
      cy.get(sel.navAdvBuilder).should('exist')
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

  context('Rulebook page — editor controls are hidden for players', () => {
    it('shows the rulebook in read-only mode', () => {
      cy.visit('/rulebook')
      cy.url().should('include', '/rulebook')
      cy.get('h1').should('contain', 'Rulebook')
      cy.contains('+ Add chapter').should('not.exist')
    })
  })

  context('Direct URL access — restricted pages are blocked', () => {
    it('blocks direct navigation to /admin/community', () => {
      cy.visit('/admin/community')
      cy.contains("This page doesn't exist.").should('be.visible')
    })

    it('allows direct navigation to /adventures', () => {
      cy.visit('/adventures')
      cy.url().should('include', '/adventures')
      cy.contains('h1', 'Adventure Builder').should('be.visible')
    })
  })
})
