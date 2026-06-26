Cypress.Commands.add('loginOwner', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/login')
  cy.get('#email').type(Cypress.env('OWNER_EMAIL') as string)
  cy.get('#password').type(Cypress.env('OWNER_PASSWORD') as string)
  cy.contains('button', 'Sign in').click()
  cy.url().should('not.include', '/login')
})

Cypress.Commands.add('logout', () => {
  cy.get('body').then(($body) => {
    if ($body.find('button:contains("Sign out")').length > 0) {
      cy.contains('button', 'Sign out').click()
      cy.url().should('include', '/login')
    }
  })
})

declare global {
  namespace Cypress {
    interface Chainable {
      loginOwner(): Chainable<void>
      logout(): Chainable<void>
    }
  }
}

export {}
