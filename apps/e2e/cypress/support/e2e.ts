import 'cypress-axe'
import './commands'

// Suppress transient errors from Next.js App Router internals that Cypress catches
// but that are framework signals, not application bugs.
Cypress.on('uncaught:exception', (err) => {
  // Server component notFound() signal — internal framework mechanism.
  if (err.message.includes('NEXT_NOT_FOUND')) return false
  // Router teardown during cy.visit() — the old page's document reference becomes
  // null as Cypress unloads it; Next.js router cleanup fires after that point.
  if (err.message.includes("Cannot read properties of null (reading 'document')")) return false
})
