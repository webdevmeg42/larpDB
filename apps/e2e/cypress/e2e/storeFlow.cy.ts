import { testDateTime } from '../support/helpers'

const ts = testDateTime(new Date())
const ownerDisplayName = `Store Owner ${ts}`
const ownerEmail = `webdevmeg+storeowner${ts}@gmail.com`
const ownerPassword = 'TestPassword1!'
const adventureName = `Store Test Adventure ${ts}`
const eventTitle = `Store Test Event ${ts}`

let gameId = ''
let gameSlug = ''
let eventId = ''
let adventureEditUrl = ''

describe('Store Flow', () => {
  before(() => {
    // 1. Create the owner account via UI
    cy.signUpNewUser(ownerDisplayName, ownerEmail, ownerPassword)

    // 2. Establish an API session so cy.request() calls to localhost:3001 are authenticated
    cy.request('POST', `${Cypress.env('API_URL')}/auth/login`, {
      email: ownerEmail,
      password: ownerPassword,
    })

    // 3. Create the adventure (requires auth only, not game context)
    cy.request('POST', `${Cypress.env('API_URL')}/games`, {
      name: adventureName,
      isPublic: true,
    }).then(res => {
      gameId = res.body.id as string
      gameSlug = res.body.slug as string
      adventureEditUrl = `/adventures/${gameId}/edit`

      // Activate the game so it appears on public routes (games are created as 'inactive')
      cy.request('PATCH', `${Cypress.env('API_URL')}/games/${gameId}/status`, {
        status: 'active',
      })

      // 4. Create event (game-scoped — requires x-game-id header) and publish it
      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/events`,
        headers: { 'x-game-id': gameId },
        body: {
          title: eventTitle,
          startAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      }).then(evRes => {
        eventId = evRes.body.id as string
        // Public store only shows published events — publish immediately
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/events/${eventId}/publish`,
          headers: { 'x-game-id': gameId },
        })
      })
    })
  })

  after(() => {
    cy.request('POST', `${Cypress.env('API_URL')}/auth/login`, {
      email: ownerEmail,
      password: ownerPassword,
    })
    cy.request('DELETE', `${Cypress.env('API_URL')}/games/${gameId}`)
  })

  describe('Owner: store management', () => {
    before(() => {
      // Stub Stripe status so the store tab renders unlocked
      cy.intercept('GET', '**/stripe/status', {
        statusCode: 200,
        body: { stripeAccountId: 'acct_test', stripeOnboardingComplete: true },
      }).as('stripeStatus')

      cy.intercept('POST', /\/adventures\/.*\/edit/).as('builderContext')
      cy.visit(adventureEditUrl)
      cy.wait('@builderContext', { timeout: 30000 })

      // Click Payments tab to trigger the stripe status fetch
      cy.get('[data-testid="tab-payments"]', { timeout: 30000 }).should('be.visible')
      cy.get('[data-testid="tab-payments"]').click()
      cy.wait('@stripeStatus', { timeout: 10000 })

      // Now navigate to Store tab — stripeConnected is true
      cy.get('[data-testid="tab-store"]', { timeout: 30000 }).should('be.visible')
      cy.get('[data-testid="tab-store"]').click()
      cy.get('[data-testid="add-store-item-btn"]', { timeout: 30000 }).should('be.visible')
    })

    it('Store tab is visible and shows Add item button', () => {
      cy.get('[data-testid="add-store-item-btn"]').should('be.visible')
    })

    it('Owner can create an event-scoped merchandise item', () => {
      cy.get('[data-testid="add-store-item-btn"]').click()
      cy.get('[data-testid="store-item-type-merchandise"]').click()
      cy.get('[data-testid="store-scope-event"]').click()
      cy.get('[data-testid="store-event-select"]').select(eventTitle)
      cy.get('[data-testid="store-item-name-input"]').type('Iron Shield')
      cy.get('[data-testid="store-item-price-input"]').clear().type('5.00')
      cy.get('[data-testid="store-item-qty-input"]').clear().type('20')
      cy.intercept('POST', '**/store/items').as('createItem')
      cy.get('[data-testid="store-item-submit-btn"]').click()
      cy.wait('@createItem', { timeout: 30000 })

      // Expand the event group to see the item row
      cy.get(`[data-testid="store-group-event-${eventId}-toggle"]`).click()

      cy.contains('[data-testid="store-item-row"]', 'Iron Shield')
        .should('be.visible')
        .within(() => {
          cy.contains('$5.00').should('be.visible')
          cy.contains('👕 Merchandise').should('be.visible')
        })
    })

    it('Owner can create a game-wide merchandise item', () => {
      cy.get('[data-testid="add-store-item-btn"]').click()
      cy.get('[data-testid="store-item-type-merchandise"]').click()
      cy.get('[data-testid="store-scope-game-wide"]').click()
      cy.get('[data-testid="store-item-name-input"]').type('Game T-Shirt')
      cy.get('[data-testid="store-item-price-input"]').clear().type('25.00')
      cy.intercept('POST', '**/store/items').as('createGameWide')
      cy.get('[data-testid="store-item-submit-btn"]').click()
      cy.wait('@createGameWide', { timeout: 30000 })

      // Expand the game-wide group to see the item row
      cy.get('[data-testid="store-group-game-wide-toggle"]').click()

      cy.get('[data-testid="store-group-game-wide"]').should('be.visible')
      cy.contains('[data-testid="store-item-row"]', 'Game T-Shirt')
        .should('be.visible')
        .within(() => {
          cy.contains('$25.00').should('be.visible')
          cy.contains('👕 Merchandise').should('be.visible')
        })
    })

    it('Owner can create an XP item with xpAmount', () => {
      cy.get('[data-testid="add-store-item-btn"]').click()
      cy.get('[data-testid="store-item-type-xp"]').click()
      cy.get('[data-testid="store-scope-event"]').click()
      cy.get('[data-testid="store-event-select"]').select(eventTitle)
      cy.get('[data-testid="store-item-name-input"]').type('Weekend XP Boost')
      cy.get('[data-testid="store-item-price-input"]').clear().type('10.00')
      cy.get('[data-testid="store-item-xp-input"]').clear().type('100')
      cy.intercept('POST', '**/store/items').as('createXp')
      cy.get('[data-testid="store-item-submit-btn"]').click()
      cy.wait('@createXp', { timeout: 30000 })

      // Event group already expanded from test 2 (state persists with testIsolation: false)
      cy.contains('[data-testid="store-item-row"]', 'Weekend XP Boost')
        .should('be.visible')
        .within(() => {
          cy.contains('⭐ Bonus XP').should('be.visible')
        })
    })

    it('Ticket type requires event — submit blocked when no event selected', () => {
      cy.get('[data-testid="add-store-item-btn"]').click()
      cy.get('[data-testid="store-item-type-ticket"]').click()

      // Scope toggle hidden for ticket type (always event-scoped)
      cy.get('[data-testid="store-scope-event"]').should('not.exist')
      cy.get('[data-testid="store-scope-game-wide"]').should('not.exist')

      // Event select exists but has no value
      cy.get('[data-testid="store-event-select"]').should('have.value', '')
      cy.get('[data-testid="store-item-name-input"]').type('General Admission')
      cy.get('[data-testid="store-item-price-input"]').clear().type('35.00')

      // HTML `required` on event select blocks form submission
      cy.get('[data-testid="store-item-submit-btn"]').click()
      cy.wait(500)
      cy.contains('[data-testid="store-item-row"]', 'General Admission').should('not.exist')

      // Cancel and leave form clean
      cy.contains('button', 'Cancel').click()
    })

    it('XP type without xpAmount is blocked by HTML required', () => {
      cy.get('[data-testid="add-store-item-btn"]').click()
      cy.get('[data-testid="store-item-type-xp"]').click()
      cy.get('[data-testid="store-scope-event"]').click()
      cy.get('[data-testid="store-event-select"]').select(eventTitle)
      cy.get('[data-testid="store-item-name-input"]').type('No XP Amount Item')
      cy.get('[data-testid="store-item-price-input"]').clear().type('5.00')
      // Leave xpAmount blank — xp input has required attribute

      cy.get('[data-testid="store-item-submit-btn"]').click()
      cy.wait(500)
      cy.contains('[data-testid="store-item-row"]', 'No XP Amount Item').should('not.exist')

      cy.contains('button', 'Cancel').click()
    })

    it('Owner can edit item price', () => {
      cy.contains('[data-testid="store-item-row"]', 'Iron Shield')
        .find('[data-testid="store-item-edit-btn"]').click()
      cy.get('[data-testid="store-item-price-input"]').clear().type('7.50')
      cy.intercept('PATCH', '**/store/items/**').as('patchItem')
      cy.get('[data-testid="store-item-submit-btn"]').click()
      cy.wait('@patchItem', { timeout: 30000 })

      cy.contains('[data-testid="store-item-row"]', 'Iron Shield').within(() => {
        cy.contains('$7.50').should('be.visible')
      })
    })

    it('Owner can toggle item availability to Unavailable', () => {
      cy.contains('[data-testid="store-item-row"]', 'Iron Shield')
        .find('[data-testid="store-item-availability-badge"]').click()

      cy.contains('[data-testid="store-item-row"]', 'Iron Shield').within(() => {
        cy.get('[data-testid="store-item-availability-badge"]').should('contain', 'Unavailable')
      })
      // Leave Iron Shield as Unavailable — verified hidden in the public store tests
    })

    it('Owner can delete an item with no purchases', () => {
      // window.confirm() must be auto-accepted before the click fires it
      cy.on('window:confirm', () => true)
      cy.contains('[data-testid="store-item-row"]', 'Weekend XP Boost')
        .find('[data-testid="store-item-delete-btn"]').click()
      cy.contains('[data-testid="store-item-row"]', 'Weekend XP Boost', { timeout: 15000 }).should('not.exist')
    })
  })

  describe('Public store page', () => {
    before(() => {
      cy.visit(`/adventures/${gameSlug}/store`)
    })

    it('Game-wide item visible with USD price and type badge', () => {
      // Game T-Shirt is game-wide and always available
      cy.contains('[data-testid="store-item-card"]', 'Game T-Shirt').should('be.visible')
      cy.contains('[data-testid="store-item-card"]', 'Game T-Shirt').within(() => {
        cy.get('[data-testid="store-item-price"]').should('contain', '$25.00')
        cy.get('[data-testid="store-item-type-badge"]').should('contain', '👕 Merchandise')
      })
    })

    it('Game-wide section is present on the public store page', () => {
      cy.get('[data-testid="store-game-wide-section"]').should('exist')
      cy.contains('[data-testid="store-game-wide-section"]', 'Game T-Shirt').should('be.visible')
    })

    it('Price is formatted as $X.XX', () => {
      cy.get('[data-testid="store-item-price"]').first()
        .invoke('text')
        .should('match', /^\$\d+\.\d{2}$/)
    })

    it('Unavailable item is hidden from public page', () => {
      // Iron Shield was toggled to Unavailable in the owner tests
      cy.contains('[data-testid="store-item-card"]', 'Iron Shield').should('not.exist')
    })
  })
})
