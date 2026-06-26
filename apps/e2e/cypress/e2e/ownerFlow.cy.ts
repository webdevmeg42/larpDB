import { testDateTime } from '../support/helpers'

describe('Owner Flow', () => {
  it('logs in, prints testDateTime, then logs out', () => {
    cy.loginOwner()
    cy.log(`testDateTime: ${testDateTime(new Date())}`)
    cy.logout()
  })
})
