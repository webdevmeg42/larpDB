/// <reference types="cypress-axe" />
import { testDateTime } from './helpers'

Cypress.Commands.add('loginOwner', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.request('POST', `${Cypress.env('API_URL')}/auth/login`, {
    email: Cypress.env('OWNER_EMAIL'),
    password: Cypress.env('OWNER_PASSWORD'),
  }).then(() => {
    cy.request('GET', `${Cypress.env('API_URL')}/my-games`).then((res) => {
      const first = res.body[0]
      if (first) cy.setCookie('gameId', first.id, { path: '/', sameSite: 'lax' })
      cy.visit('/dashboard')
    })
  })
})

Cypress.Commands.add('loginPlayer', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.request('POST', `${Cypress.env('API_URL')}/auth/login`, {
    email: Cypress.env('PLAYER_EMAIL'),
    password: Cypress.env('PLAYER_PASSWORD'),
  }).then(() => {
    cy.request('GET', `${Cypress.env('API_URL')}/my-games`).then((res) => {
      const first = res.body[0]
      if (first) cy.setCookie('gameId', first.id, { path: '/', sameSite: 'lax' })
      cy.visit('/dashboard')
    })
  })
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

Cypress.Commands.add('schemaBuilderAddField', (testId: string, expectedLabel?: string) => {
  cy.get(`[data-testid="${testId}"]`).click()
  if (expectedLabel) {
    cy.get('[data-testid="field-label-input"]').should('have.value', expectedLabel)
  }
})

Cypress.Commands.add('schemaBuilderSave', (expectError?: string) => {
  cy.get('[data-testid="schema-save-btn"]').click()
  if (expectError) {
    cy.get('[data-testid="schema-save-error"]')
      .should('be.visible')
      .and('contain', expectError)
  }
})

Cypress.Commands.add('schemaBuilderLabelField', (label: string) => {
  cy.get('[data-testid="field-list"]').contains('(Unnamed').click()
  cy.get('[data-testid="field-label-input"]').clear().type(label)
})

declare global {
  namespace Cypress {
    interface Chainable {
      createUser(): Chainable<void>
      loginOwner(): Chainable<void>
      loginPlayer(): Chainable<void>
      loginUser(email: string, password: string): Chainable<void>
      logout(): Chainable<void>
      schemaBuilderAddField(testId: string, expectedLabel?: string): Chainable<void>
      schemaBuilderSave(expectError?: string): Chainable<void>
      schemaBuilderLabelField(label: string): Chainable<void>
    }
  }
}

export {}
