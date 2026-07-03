import { testDateTime } from '../support/helpers'

const larpName = `Cypress ownerFlow Test ${testDateTime(new Date())}`

describe('Owner Flow', () => {
  before(() => {
    cy.loginOwner()
  })

  it('Owner cannot build an incorrect LARP', () => {
    cy.contains('LARP Builder').click()
    cy.contains('Build New LARP').click()

    cy.get('[data-testid="visibility-private-btn"]').click()
    cy.contains('button', 'Create LARP').click()
    cy.get('[data-testid="larp-name-error"]')
      .should('be.visible').and('contain', 'LARP Name is required')

    cy.get('[data-testid="larp-name-input"]').type(larpName)
    cy.contains('button', 'Create LARP').click()

    cy.contains('Branding').should('be.visible')
    cy.contains('button', 'Save changes').click()
    cy.get('[data-testid="form-error-banner"]')
      .should('be.visible').and('contain', 'Tagline')
    cy.get('[data-testid="tagline-error"]')
      .scrollIntoView().should('be.visible').and('contain', 'Tagline is required')

    cy.contains('The Codex').click()
    cy.contains('button', 'Save changes').click()
    cy.get('[data-testid="form-error-banner"]')
      .should('be.visible').and('contain', 'Safety mechanics in use, Leveling System')
    cy.get('[data-testid="safety-error"]')
      .scrollIntoView().should('be.visible').and('contain', 'Safety mechanics in use is required')
    cy.get('[data-testid="leveling-error"]')
      .scrollIntoView().should('be.visible').and('contain', 'Please select a leveling system')

    cy.contains('button', 'Rulebook').click()
    cy.contains('+ Add chapter').click()
    cy.contains('button', 'Save chapter').click()
    cy.get('[data-testid="chapter-title-error"]')
      .scrollIntoView().should('be.visible').and('contain', 'Chapter title is required')
  })

  it('Owner can build a race with all common fields pre-populated', () => {
    cy.contains('Race Builds').click()
    cy.get('[data-testid="new-race-link"]').click()

    cy.get('[data-testid="no-leveling-warning"]')
      .should('be.visible')
      .and('contain', 'No leveling system selected.')

    cy.contains('The Codex').click()
    cy.get('input[placeholder="X-card, BRAKE/GAS, Lookdown"]').type('X-card')
    cy.get('[data-testid="leveling-radio-percentage"]').click()
    cy.contains('button', 'Save changes').click()

    cy.contains('Race Builds').click()
    cy.get('[data-testid="new-race-link"]').click()

    cy.get('[data-testid="template-card"]').first().click()
    cy.get('[data-testid="schema-name-error"]')
      .should('be.visible').and('contain', 'Name is required')

    cy.get('[data-testid="schema-name-input"]').click().type(larpName)
    cy.get('[data-testid="start-building-btn"]').click()

    // Add common fields — labels auto-populate on click, then one save (POST)
    cy.schemaBuilderAddField('palette-btn-equipment', 'Equipment')
    cy.schemaBuilderAddField('palette-btn-appearance', 'Appearance')
    cy.schemaBuilderAddField('palette-btn-personality', 'Personality')
    cy.schemaBuilderAddField('palette-btn-features', 'Features')
    cy.schemaBuilderAddField('palette-btn-influences', 'Influences')
    cy.schemaBuilderAddField('palette-btn-languages', 'Languages')
    cy.schemaBuilderSave()

    // schema-activate-btn only renders on the edit page (schemaId is a real UUID)
    // — this is the navigation guard; Cypress retries until it appears
    cy.get('[data-testid="schema-activate-btn"]')

    // Add all OTHER fields unlabeled, then one save to trigger validation error (PATCH)
    cy.schemaBuilderAddField('palette-btn-text')
    cy.schemaBuilderAddField('palette-btn-longtext')
    cy.schemaBuilderAddField('palette-btn-number')
    cy.schemaBuilderAddField('palette-btn-select')
    cy.schemaBuilderAddField('palette-btn-multiselect')
    cy.schemaBuilderAddField('palette-btn-toggle')
    cy.schemaBuilderAddField('palette-btn-statblock')
    cy.schemaBuilderSave('All fields must have a label before saving.')

    // Label all 7 unlabeled fields, then one passing save (PATCH)
    cy.schemaBuilderLabelField(`${larpName} testRace`)
    cy.schemaBuilderLabelField(`${larpName} testRace`)
    cy.schemaBuilderLabelField(`${larpName} testRace`)
    cy.schemaBuilderLabelField(`${larpName} testRace`)
    cy.schemaBuilderLabelField(`${larpName} testRace`)
    cy.schemaBuilderLabelField(`${larpName} testRace`)
    cy.schemaBuilderLabelField(`${larpName} testRace`)
    cy.schemaBuilderSave()

    cy.url().should('include', '/admin/schemas')
  })

  after(() => {
    cy.visit('/larps')
    // No .should('be.visible') — avoids $el.css stale DOM error during React re-render retry.
    // .type() implicitly waits for actionable state.
    cy.get('[data-testid="games-search-input"]', { timeout: 10000 }).type(larpName)
    cy.get('[data-testid="delete-larp-btn"]').first().click()
    cy.get('[data-testid="confirm-delete-btn"]').click()
  })
})
