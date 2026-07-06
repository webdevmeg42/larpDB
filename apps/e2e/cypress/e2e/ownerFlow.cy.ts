import { testDateTime } from '../support/helpers'

const larpName = `Cypress ownerFlow Test ${testDateTime(new Date())}`

const sel = {
  // new larp form
  visibilityPrivateBtn: '[data-testid="visibility-private-btn"]',
  larpNameInput: '[data-testid="larp-name-input"]',
  larpNameError: '[data-testid="larp-name-error"]',
  // edit tabs
  tabBranding: '[data-testid="tab-branding"]',
  tabCodex: '[data-testid="tab-codex"]',
  tabRulebook: '[data-testid="tab-rulebook"]',
  tabRaceBuilds: '[data-testid="tab-race-builds"]',
  // branding tab
  formErrorBanner: '[data-testid="form-error-banner"]',
  taglineError: '[data-testid="tagline-error"]',
  // codex tab
  safetyError: '[data-testid="safety-error"]',
  levelingError: '[data-testid="leveling-error"]',
  levelingRadioPercentage: '[data-testid="leveling-radio-percentage"]',
  // rulebook tab
  chapterTitleError: '[data-testid="chapter-title-error"]',
  // race/class builds tab
  newRaceLink: '[data-testid="new-race-link"]',
  newClassLink: '[data-testid="new-class-link"]',
  noLevelingWarning: '[data-testid="no-leveling-warning"]',
  // new schema page
  templateCard: '[data-testid="template-card"]',
  schemaNameInput: '[data-testid="schema-name-input"]',
  schemaNameError: '[data-testid="schema-name-error"]',
  startBuildingBtn: '[data-testid="start-building-btn"]',
  // schema builder
  schemaActivateBtn: '[data-testid="schema-activate-btn"]',
  // larps list
  gamesSearchInput: '[data-testid="games-search-input"]',
  deleteLarpBtn: '[data-testid="delete-larp-btn"]',
  confirmDeleteBtn: '[data-testid="confirm-delete-btn"]',
}

describe('Owner Flow', () => {
  before(() => {
    cy.loginOwner()
  })

  it('Owner cannot build an incorrect LARP', () => {
    cy.contains('LARP Builder').click()
    cy.contains('Build New LARP').click()

    cy.get(sel.visibilityPrivateBtn).click()
    cy.contains('button', 'Create LARP').click()
    cy.get(sel.larpNameError)
      .should('be.visible').and('contain', 'LARP Name is required')

    cy.get(sel.larpNameInput).type(larpName)
    cy.contains('button', 'Create LARP').click()

    cy.get(sel.tabBranding).should('be.visible')
    cy.contains('button', 'Save changes').click()
    cy.get(sel.formErrorBanner)
      .should('be.visible').and('contain', 'Tagline')
    cy.get(sel.taglineError)
      .scrollIntoView().should('be.visible').and('contain', 'Tagline is required')

    cy.get(sel.tabCodex).click()
    cy.contains('button', 'Save changes').click()
    cy.get(sel.formErrorBanner)
      .should('be.visible').and('contain', 'Safety mechanics in use, Leveling System')
    cy.get(sel.safetyError)
      .scrollIntoView().should('be.visible').and('contain', 'Safety mechanics in use is required')
    cy.get(sel.levelingError)
      .scrollIntoView().should('be.visible').and('contain', 'Please select a leveling system')

    cy.get(sel.tabRulebook).click()
    cy.contains('+ Add chapter').click()
    cy.contains('button', 'Save chapter').click()
    cy.get(sel.chapterTitleError)
      .scrollIntoView().should('be.visible').and('contain', 'Chapter title is required')
  })

  it('Owner can build a race with all common fields pre-populated', () => {
    cy.get(sel.tabRaceBuilds).click()
    cy.get(sel.newRaceLink).click()

    cy.get(sel.noLevelingWarning)
      .should('be.visible')
      .and('contain', 'No leveling system selected.')

    cy.get(sel.tabCodex).click()
    cy.get('input[placeholder="X-card, BRAKE/GAS, Lookdown"]').type('X-card')
    cy.get(sel.levelingRadioPercentage).click()
    cy.contains('button', 'Save changes').click()

    cy.get(sel.tabRaceBuilds).click()
    cy.get(sel.newRaceLink).click()

    cy.get(sel.templateCard).eq(1).click()
    cy.get(sel.schemaNameError)
      .should('be.visible').and('contain', 'Name is required')

    cy.get(sel.schemaNameInput).click().type(larpName)
    cy.get(sel.startBuildingBtn).click()

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
    cy.get(sel.schemaActivateBtn)

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
    // Wait for the owner view to render (h1 only appears after useAuth resolves to owner role).
    cy.contains('h1', 'LARP Builder')
    cy.get(sel.gamesSearchInput).type(larpName)
    cy.get(sel.deleteLarpBtn).first().click()
    cy.get(sel.confirmDeleteBtn).click()
  })
})
