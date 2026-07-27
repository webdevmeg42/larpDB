import './commands'

// Next.js App Router throws NEXT_NOT_FOUND as a client-side signal when a server
// component calls notFound(). It's an internal framework mechanism, not an app error.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('NEXT_NOT_FOUND')) return false
})
