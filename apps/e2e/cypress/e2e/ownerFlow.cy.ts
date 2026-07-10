import { testDateTime } from '../support/helpers'

function tomorrowDatetimeLocal(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(12, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`
}

const adventureName = `Cypress ownerFlow Test ${testDateTime(new Date())}`
let adventureEditUrl = ''
const characterName = `Character ${testDateTime(new Date())}`

const sel = {
  // new adventure form
  visibilityPrivateBtn: '[data-testid="visibility-private-btn"]',
  advNameInput: '[data-testid="adv-name-input"]',
  advNameError: '[data-testid="adv-name-error"]',
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
  // adventures list
  gamesSearchInput: '[data-testid="games-search-input"]',
  deleteAdvBtn: '[data-testid="delete-adv-btn"]',
  confirmDeleteBtn: '[data-testid="confirm-delete-btn"]',
  // nav
  navAdvBuilder: '[data-testid="nav-adv-builder"]',
  navEvents:      '[data-testid="nav-events"]',
  // builds tab (race + class list)
  buildsSearchInput: '[data-testid="builds-search-input"]',
  buildsExpandBtn: '[data-testid="builds-expand-btn"]',
  buildsActivateBtn: '[data-testid="builds-activate-btn"]',
  // adventures list — enable/disable toggle
  enableAdvBtn:         '[data-testid="enable-adv-btn"]',
  // my characters page
  navMyCharacters:       '[data-testid="nav-my-characters"]',
  charactersSearchInput: '[data-testid="characters-search-input"]',
  newCharacterBtn:       '[data-testid="new-character-btn"]',
  // character creation wizard
  continueBtn:           '[data-testid="continue-btn"]',
  createCharacterBtn:    '[data-testid="create-character-btn"]',
  characterNameInput:    '#aaaaaaaa-0000-0000-0000-000000000001',
  // events page
  eventsSearchInput:     '[data-testid="events-search-input"]',
  newEventBtn:           '[data-testid="new-event-btn"]',
  // new event form
  createEventBtn:        '[data-testid="create-event-btn"]',
  eventTitleInput:       '#title',
  eventStartAtInput:     '#startAt',
}

describe('Owner Flow', () => {
  before(() => {
    cy.loginOwner()
  })

  it('Owner cannot build an incorrect Adventure', () => {
    cy.get(sel.navAdvBuilder).click()
    cy.contains('Build New Adventure').click()

    cy.get(sel.visibilityPrivateBtn).click()
    cy.contains('button', 'Create Adventure').click()
    cy.get(sel.advNameError)
      .should('be.visible').and('contain', 'Adventure Name is required')

    cy.get(sel.advNameInput).type(adventureName)
    cy.contains('button', 'Create Adventure').click()

    cy.get(sel.tabBranding).should('be.visible')
    cy.url().then(url => { adventureEditUrl = url })
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

    cy.get(sel.schemaNameInput).click().type(adventureName)
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
    cy.schemaBuilderLabelField(`${adventureName} testRace`)
    cy.schemaBuilderLabelField(`${adventureName} testRace`)
    cy.schemaBuilderLabelField(`${adventureName} testRace`)
    cy.schemaBuilderLabelField(`${adventureName} testRace`)
    cy.schemaBuilderLabelField(`${adventureName} testRace`)
    cy.schemaBuilderLabelField(`${adventureName} testRace`)
    cy.schemaBuilderLabelField(`${adventureName} testRace`)
    cy.schemaBuilderSave()

    cy.url().should('include', '/admin/schemas')

    // Activate the race schema from the Adventure Builder
    cy.visit(adventureEditUrl)
    cy.get(sel.tabRaceBuilds).click()
    cy.get(sel.buildsSearchInput).type(adventureName)
    cy.get(sel.buildsExpandBtn).first().click()
    cy.get(sel.buildsActivateBtn).first().click()
  })

  it('Owner can build a class with all common fields pre-populated', () => {
    cy.visit(adventureEditUrl)
    cy.get(sel.tabClassBuilds).click()
    cy.get(sel.newClassLink).click()

    // Click Warrior before entering name → triggers name validation
    cy.get(sel.templateCardWarrior).click()
    cy.get(sel.schemaNameError)
      .should('be.visible').and('contain', 'Name is required')

    cy.get(sel.schemaNameInput).click().type(`Warrior ${adventureName}`)
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
    cy.schemaBuilderLabelField(`${adventureName} testClass`)
    cy.schemaBuilderLabelField(`${adventureName} testClass`)
    cy.schemaBuilderLabelField(`${adventureName} testClass`)
    cy.schemaBuilderLabelField(`${adventureName} testClass`)
    cy.schemaBuilderLabelField(`${adventureName} testClass`)
    cy.schemaBuilderLabelField(`${adventureName} testClass`)
    cy.schemaBuilderLabelField(`${adventureName} testClass`)
    cy.schemaBuilderLabelField(`${adventureName} testClass`)
    cy.schemaBuilderSave()

    cy.url().should('include', '/admin/schemas')

    // Activate the class schema from the Adventure Builder
    cy.visit(adventureEditUrl)
    cy.get(sel.tabClassBuilds).click()
    cy.get(sel.buildsSearchInput).type(adventureName)
    cy.get(sel.buildsExpandBtn).first().click()
    cy.get(sel.buildsActivateBtn).first().click()
  })

  it('Owner can create a character', () => {
    // Enable the Adventure so isActive is true and New Character button is not disabled
    cy.get(sel.navAdvBuilder).click()
    cy.get(sel.gamesSearchInput).clear().type(adventureName)
    cy.get(sel.enableAdvBtn).first().click()
    cy.get(sel.enableAdvBtn).first().should('contain', 'Disable')

    // Navigate to My Characters and locate the Adventure
    cy.get(sel.navMyCharacters).click()
    cy.get(sel.charactersSearchInput).type(adventureName)
    cy.contains('button', adventureName).first().click()
    cy.get(sel.newCharacterBtn).first().click()

    // Race step — Continue is disabled until a race is selected
    cy.get(sel.continueBtn).should('be.disabled')
    cy.contains('button', adventureName).first().click()
    cy.get(sel.continueBtn).click()

    // Class step — Continue is disabled until a class is selected
    cy.get(sel.continueBtn).should('be.disabled')
    cy.contains('button', `Warrior ${adventureName}`).first().click()
    cy.get(sel.continueBtn).click()

    // Character form: validate name required before submitting
    cy.get(sel.createCharacterBtn).click()
    cy.contains('Character name is required').should('be.visible')

    // Fill in name and successfully create the character
    cy.get(sel.characterNameInput).type(characterName)
    cy.get(sel.createCharacterBtn).click()
    cy.url().should('match', /\/characters\/[a-f0-9-]{36}/)
  })

  it('Owner can create an event', () => {
    cy.get(sel.navEvents).click()
    cy.get(sel.eventsSearchInput).type(adventureName)
    cy.contains('button', adventureName).first().click()
    cy.get(sel.newEventBtn).first().click()

    cy.get(sel.createEventBtn).should('be.disabled')

    cy.get(sel.eventTitleInput).type(`Event ${adventureName}`)
    cy.get(sel.createEventBtn).should('be.disabled')

    cy.get(sel.eventStartAtInput).type(tomorrowDatetimeLocal())
    cy.get(sel.createEventBtn).click()

    cy.contains('h1', `Event ${adventureName}`)
  })

  after(() => {
    cy.visit('/adventures')
    cy.contains('h1', 'Adventure Builder')
    cy.get(sel.gamesSearchInput).clear().type(adventureName)
    cy.get(sel.deleteAdvBtn).first().click()
    cy.get(sel.confirmDeleteBtn).click()
  })
})
