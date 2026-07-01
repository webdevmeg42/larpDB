import { testDateTime } from './helpers'

Cypress.Commands.add('loginOwner', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/login')
  cy.get('#email').type(Cypress.env('OWNER_EMAIL') as string)
  cy.get('#password').type(Cypress.env('OWNER_PASSWORD') as string)
  cy.contains('button', 'Sign in').click()
  cy.url().should('not.include', '/login')
})

Cypress.Commands.add('createUser', () => {
  const ts = testDateTime(new Date())
  const username = `Cypress Testuser ${ts}`
  const email = `webdevmeg+testuser${ts}@gmail.com`
  const password = 'password'

  cy.clearCookies()
  cy.visit('/login')
  cy.contains('button', 'Sign up').click()
  cy.get('#displayName').type(username)
  cy.get('#email').type(email)
  cy.get('#password').type(password)
  cy.contains('button', 'Create account').click()
  cy.clearCookies()
  cy.loginUser(email, password)
})

Cypress.Commands.add('loginUser', (email: string, password: string) => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/login')
  cy.get('#email').type(email)
  cy.get('#password').type(password)
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
      createUser(): Chainable<void>
      loginOwner(): Chainable<void>
      loginUser(email: string, password: string): Chainable<void>
      logout(): Chainable<void>
    }
  }
}

export {}
