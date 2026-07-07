import { testDateTime } from '../support/helpers'

const larpName = `Cypress ownerFlow Test ${testDateTime(new Date())}`
let larpEditUrl = ''
const characterName = `Character ${testDateTime(new Date())}`

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
  tabClassBuilds: '[data-testid="tab-class-builds"]',
  // branding/codex save button
  saveChangesBtn: '[data-testid="save-changes-btn"]',
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
  // new schema page — generic (matches all cards)
  templateCard: '[data-testid^="template-card"]',
  // race templates
  templateCardBlank: '[data-testid="template-card-blank"]',
  templateCardFantasyAdventure: '[data-testid="template-card-fantasy-adventure"]',
  templateCardSciFiOperative: '[data-testid="template-card-sci-fi-operative"]',
  templateCardModernThriller: '[data-testid="template-card-modern-thriller"]',
  templateCardHorrorSurvivor: '[data-testid="template-card-horror-survivor"]',
  templateCardPostApocalyptic: '[data-testid="template-card-post-apocalyptic"]',
  // class templates
  templateCardWarrior: '[data-testid="template-card-warrior"]',
  templateCardDruid: '[data-testid="template-card-druid"]',
  templateCardWizard: '[data-testid="template-card-wizard"]',
  templateCardSorcerer: '[data-testid="template-card-sorcerer"]',
  templateCardMedic: '[data-testid="template-card-medic"]',
  templateCardBerserker: '[data-testid="template-card-berserker"]',
  templateCardPaladin: '[data-testid="template-card-paladin"]',
  schemaNameInput: '[data-testid="schema-name-input"]',
  schemaNameError: '[data-testid="schema-name-error"]',
  startBuildingBtn: '[data-testid="start-building-btn"]',
  // schema builder
  schemaActivateBtn: '[data-testid="schema-activate-btn"]',
  // larps list
  gamesSearchInput: '[data-testid="games-search-input"]',
  deleteLarpBtn: '[data-testid="delete-larp-btn"]',
  confirmDeleteBtn: '[data-testid="confirm-delete-btn"]',
  // nav
  navLarpBuilder: '[data-testid="nav-larp-builder"]',
  // builds tab (race + class list)
  buildsSearchInput: '[data-testid="builds-search-input"]',
  buildsExpandBtn: '[data-testid="builds-expand-btn"]',
  buildsActivateBtn: '[data-testid="builds-activate-btn"]',
  // larps list — enable/disable toggle
  enableLarpBtn:         '[data-testid="enable-larp-btn"]',
  // my characters page
  navMyCharacters:       '[data-testid="nav-my-characters"]',
  charactersSearchInput: '[data-testid="characters-search-input"]',
  newCharacterBtn:       '[data-testid="new-character-btn"]',
  // character creation wizard
  continueBtn:           '[data-testid="continue-btn"]',
  createCharacterBtn:    '[data-testid="create-character-btn"]',
  characterNameInput:    '#aaaaaaaa-0000-0000-0000-000000000001',
}

describe('Owner Flow', () => {
  before(() => {
    cy.loginOwner()
  })

  it('Owner cannot build an incorrect LARP', () => {
    cy.get(sel.navLarpBuilder).click()
    cy.contains('Build New LARP').click()

    cy.get(sel.visibilityPrivateBtn).click()
    cy.contains('button', 'Create LARP').click()
    cy.get(sel.larpNameError)
      .should('be.visible').and('contain', 'LARP Name is required')

    cy.get(sel.larpNameInput).type(larpName)
    cy.contains('button', 'Create LARP').click()

    cy.get(sel.tabBranding).should('be.visible')
    cy.url().then(url => { larpEditUrl = url })
    cy.get(sel.saveChangesBtn).click()
    cy.get(sel.formErrorBanner)
      .should('be.visible').and('contain', 'Tagline')
    cy.get(sel.taglineError)
      .scrollIntoView().should('be.visible').and('contain', 'Tagline is required')

    cy.get(sel.tabCodex).click()
    cy.get(sel.saveChangesBtn).click()
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
    cy.get(sel.saveChangesBtn).click()
    cy.get(sel.saveChangesBtn).should('contain', 'Saved!')

    cy.get(sel.tabRaceBuilds).click()
    cy.get(sel.newRaceLink).click()

    cy.get(sel.templateCardFantasyAdventure).click()
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

    // Activate the race schema from the LARP Builder
    cy.visit(larpEditUrl)
    cy.get(sel.tabRaceBuilds).click()
    cy.get(sel.buildsSearchInput).type(larpName)
    cy.get(sel.buildsExpandBtn).first().click()
    cy.get(sel.buildsActivateBtn).first().click()
  })

  it('Owner can build a class with all common fields pre-populated', () => {
    cy.visit(larpEditUrl)
    cy.get(sel.tabClassBuilds).click()
    cy.get(sel.newClassLink).click()

    // Click Warrior before entering name → triggers name validation
    cy.get(sel.templateCardWarrior).click()
    cy.get(sel.schemaNameError)
      .should('be.visible').and('contain', 'Name is required')

    cy.get(sel.schemaNameInput).click().type(`Warrior ${larpName}`)
    cy.get(sel.startBuildingBtn).click()

    // Add common fields — labels auto-populate on click, then one save (POST)
    cy.schemaBuilderAddField('palette-btn-hitpoints', 'Hit Points')
    cy.schemaBuilderAddField('palette-btn-attacks', 'Attacks')
    cy.schemaBuilderAddField('palette-btn-spells', 'Spells')
    cy.schemaBuilderAddField('palette-btn-features', 'Features')
    cy.schemaBuilderSave()

    // schema-activate-btn only renders on the edit page (schemaId is a real UUID)
    // — this is the navigation guard; Cypress retries until it appears
    cy.get(sel.schemaActivateBtn)

    // Add all OTHER fields unlabeled, then one save to trigger validation error (PATCH)
    cy.schemaBuilderAddField('palette-btn-statblock')
    cy.schemaBuilderAddField('palette-btn-multiselect')
    cy.schemaBuilderAddField('palette-btn-number')
    cy.schemaBuilderAddField('palette-btn-section')
    cy.schemaBuilderAddField('palette-btn-text')
    cy.schemaBuilderAddField('palette-btn-longtext')
    cy.schemaBuilderAddField('palette-btn-select')
    cy.schemaBuilderAddField('palette-btn-toggle')
    cy.schemaBuilderSave('All fields must have a label before saving.')

    // Label all 8 unlabeled fields, then one passing save (PATCH)
    cy.schemaBuilderLabelField(`${larpName} testClass`)
    cy.schemaBuilderLabelField(`${larpName} testClass`)
    cy.schemaBuilderLabelField(`${larpName} testClass`)
    cy.schemaBuilderLabelField(`${larpName} testClass`)
    cy.schemaBuilderLabelField(`${larpName} testClass`)
    cy.schemaBuilderLabelField(`${larpName} testClass`)
    cy.schemaBuilderLabelField(`${larpName} testClass`)
    cy.schemaBuilderLabelField(`${larpName} testClass`)
    cy.schemaBuilderSave()

    cy.url().should('include', '/admin/schemas')

    // Activate the class schema from the LARP Builder
    cy.visit(larpEditUrl)
    cy.get(sel.tabClassBuilds).click()
    cy.get(sel.buildsSearchInput).type(larpName)
    cy.get(sel.buildsExpandBtn).first().click()
    cy.get(sel.buildsActivateBtn).first().click()
  })

  it('Owner can create a character', () => {
    // Enable the LARP so isActive is true and New Character button is not disabled
    cy.get(sel.navLarpBuilder).click()
    cy.get(sel.gamesSearchInput).clear().type(larpName)
    cy.get(sel.enableLarpBtn).first().click()
    cy.get(sel.enableLarpBtn).first().should('contain', 'Disable')

    // Navigate to My Characters and locate the LARP
    cy.get(sel.navMyCharacters).click()
    cy.get(sel.charactersSearchInput).type(larpName)
    cy.contains('button', larpName).first().click()
    cy.get(sel.newCharacterBtn).first().click()

    // Race step — Continue is disabled until a race is selected
    cy.get(sel.continueBtn).should('be.disabled')
    cy.contains('button', larpName).first().click()
    cy.get(sel.continueBtn).click()

    // Class step — Continue is disabled until a class is selected
    cy.get(sel.continueBtn).should('be.disabled')
    cy.contains('button', `Warrior ${larpName}`).first().click()
    cy.get(sel.continueBtn).click()

    // Character form: validate name required before submitting
    cy.get(sel.createCharacterBtn).click()
    cy.contains('Character name is required').should('be.visible')

    // Fill in name and successfully create the character
    cy.get(sel.characterNameInput).type(characterName)
    cy.get(sel.createCharacterBtn).click()
    cy.url().should('match', /\/characters\/[a-f0-9-]{36}/)
  })

  after(() => {
    cy.visit('/larps')
    cy.contains('h1', 'LARP Builder')
    cy.get(sel.gamesSearchInput).clear().type(larpName)
    cy.get(sel.deleteLarpBtn).first().click()
    cy.get(sel.confirmDeleteBtn).click()
  })
})
