describe('Guest session flow', () => {
  let capturedGameId = ''

  before(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/')
  })

  after(() => {
    if (capturedGameId) {
      cy.request({
        method: 'DELETE',
        url: `${Cypress.env('API_URL')}/games/${capturedGameId}`,
        failOnStatusCode: false,
      })
    }
  })

  it('shows the landing page with tagline and CTAs', () => {
    cy.get('h1').should('contain.text', 'Run your LARP')
    cy.get('h1').should('contain.text', 'not your spreadsheets')
    cy.contains('button', 'Try it free')
    cy.contains('a', 'Log in')
  })

  it('clicking Try it free redirects to the adventure builder', () => {
    cy.contains('button', 'Try it free').click()
    cy.url().should('match', /\/adventures\/[a-f0-9-]{36}\/edit/)
    cy.url().then((url) => {
      const match = url.match(/\/adventures\/([a-f0-9-]{36})\/edit/)
      if (match) capturedGameId = match[1]
    })
    cy.contains('h1', 'Adventure Builder')
  })

  it('shows the guest banner', () => {
    cy.contains("You're in guest mode")
    cy.contains('a', 'Create a free account')
  })

  it('demo game slug starts with thornwood-', () => {
    cy.get('[data-testid="adv-slug-display"]')
      .should('have.attr', 'data-slug')
      .and('match', /^thornwood-/)
  })

  it('adventure name input contains Thornwood Chronicles', () => {
    cy.get('[data-testid="adv-name-input"]').should('have.value', 'Thornwood Chronicles')
  })
})
