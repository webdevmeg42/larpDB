import { testDateTime } from '../support/helpers'

const adventureName = `Template XP Test ${testDateTime(new Date())}`
let adventureEditUrl = ''
let characterUrl = ''

const ALL_CLASS_TEMPLATES = [
  {
    testid: 'warrior',
    fields: [
      { label: 'Hit Points', type: 'hitpoints' },
      { label: 'Attacks', type: 'attacks' },
      { label: 'Weapon Proficiencies', type: 'multiselect' },
    ],
  },
  {
    testid: 'berserker',
    fields: [
      { label: 'Hit Points', type: 'hitpoints' },
      { label: 'Attacks', type: 'attacks' },
      { label: 'Rage Charges', type: 'number' },
    ],
  },
  {
    testid: 'paladin',
    fields: [
      { label: 'Hit Points', type: 'hitpoints' },
      { label: 'Attacks', type: 'attacks' },
      { label: 'Divine Spells', type: 'spells' },
    ],
  },
  {
    testid: 'wizard',
    fields: [
      { label: 'Hit Points', type: 'hitpoints' },
      { label: 'Spells', type: 'spells' },
      { label: 'Arcane School', type: 'select' },
    ],
  },
  {
    testid: 'druid',
    fields: [
      { label: 'Hit Points', type: 'hitpoints' },
      { label: 'Spells', type: 'spells' },
      { label: 'Circle', type: 'select' },
    ],
  },
  {
    testid: 'sorcerer',
    fields: [
      { label: 'Hit Points', type: 'hitpoints' },
      { label: 'Spells', type: 'spells' },
      { label: 'Sorcery Points', type: 'number' },
    ],
  },
  {
    testid: 'medic',
    fields: [
      { label: 'Hit Points', type: 'hitpoints' },
      { label: 'Equipment', type: 'equipment' },
      { label: 'Medical Specialty', type: 'select' },
    ],
  },
]
const CLASS_TEMPLATES_TO_TEST = Cypress._.sampleSize(ALL_CLASS_TEMPLATES, 3)

const sel = {
  navAdvBuilder: '[data-testid="nav-adv-builder"]',
  gamesSearchInput: '[data-testid="games-search-input"]',
  deleteAdvBtn: '[data-testid="delete-adv-btn"]',
  confirmDeleteBtn: '[data-testid="confirm-delete-btn"]',
  enableAdvBtn: '[data-testid="enable-adv-btn"]',
  tabBranding: '[data-testid="tab-branding"]',
  tabCodex: '[data-testid="tab-codex"]',
  tabRaceBuilds: '[data-testid="tab-race-builds"]',
  tabClassBuilds: '[data-testid="tab-class-builds"]',
  saveChangesBtn: '[data-testid="save-changes-btn"]',
  taglineInput: '[data-testid="tagline-input"]',
  newRaceLink: '[data-testid="new-race-link"]',
  newClassLink: '[data-testid="new-class-link"]',
  buildsSearchInput: '[data-testid="builds-search-input"]',
  buildsExpandBtn: '[data-testid="builds-expand-btn"]',
  buildsActivateBtn: '[data-testid="builds-activate-btn"]',
  schemaNameInput: '[data-testid="schema-name-input"]',
  startBuildingBtn: '[data-testid="start-building-btn"]',
  fieldList: '[data-testid="field-list"]',
  fieldLabelInput: '[data-testid="field-label-input"]',
  schemaSaveBtn: '[data-testid="schema-save-btn"]',
  schemaActivateBtn: '[data-testid="schema-activate-btn"]',
  navMyCharacters: '[data-testid="nav-my-characters"]',
  newCharacterBtn: '[data-testid="new-character-btn"]',
  continueBtn: '[data-testid="continue-btn"]',
  createCharacterBtn: '[data-testid="create-character-btn"]',
  characterNameInput: '#aaaaaaaa-0000-0000-0000-000000000001',
}

describe('Template and XP Flow', { testIsolation: false }, () => {
  before(() => {
    cy.loginOwner()

    // Create adventure
    cy.intercept('GET', '/adventures*').as('advBuilderRsc')
    cy.get(sel.navAdvBuilder, { timeout: 10000 }).should('be.visible').click()
    cy.wait('@advBuilderRsc', { timeout: 10000 })
    cy.contains('Build New Adventure').click()
    cy.contains('button', 'Public').click()
    cy.get('[data-testid="adv-name-input"]').type(adventureName)
    cy.contains('button', 'Create Adventure').click()
    cy.url({ timeout: 10000 }).should('include', '/edit')
    cy.url().then(url => { adventureEditUrl = url })

    // Set tagline (required branding field)
    cy.get(sel.taglineInput).should('not.be.disabled').clear().type('A test adventure for template validation')
    cy.get(sel.saveChangesBtn).click()
    cy.get(sel.saveChangesBtn).should('not.be.disabled')

    // Configure Codex: safety + flat leveling (100 XP/level, max Level 3, base Level 1)
    cy.get(sel.tabCodex).click()
    cy.get('input[placeholder="X-card, BRAKE/GAS, Lookdown"]').type('X-card')
    cy.get('[data-testid="leveling-radio-flat"]').click()
    cy.get('#codex-flat-cost').clear().type('100')
    cy.get('#codex-max-level').clear().type('3')
    cy.get('#codex-base-level').select('1')
    cy.get(sel.saveChangesBtn).click()
    cy.get(sel.saveChangesBtn, { timeout: 10000 }).should('not.be.disabled')
  })

  after(() => {
    cy.visit('/adventures')
    cy.get(sel.gamesSearchInput, { timeout: 10000 }).clear().type(adventureName)
    cy.contains(adventureName, { timeout: 10000 }).should('be.visible')
    cy.get(sel.deleteAdvBtn).first().click()
    cy.get(sel.confirmDeleteBtn, { timeout: 10000 }).should('be.visible').click()
  })

  it('Adventure is created with leveling system configured', () => {
    // Smoke test that before() succeeded
    cy.visit(adventureEditUrl)
    cy.get(sel.tabRaceBuilds).click()
    cy.get(sel.newRaceLink, { timeout: 10000 }).should('not.have.attr', 'aria-disabled', 'true')
  })
})
