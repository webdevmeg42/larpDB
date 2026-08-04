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

  // ── Helper: verify fields in a loaded schema builder (no save)
  function verifyBuilderFields(fields: Array<{ label: string; type: string }>) {
    fields.forEach(({ label }) => {
      cy.get(sel.fieldList).should('contain', label)
    })
    const last = fields[fields.length - 1]!
    cy.get(sel.fieldList).contains(last.label).click()
    const typeLabel = last.type === 'select' ? 'Dropdown Select field' : `${last.type} field`
    cy.contains(typeLabel, { matchCase: false }).should('be.visible')
  }

  // ── Race template checks ──────────────────────────────────────────

  it('Humanoid race template has correct pre-built fields', () => {
    cy.visit(adventureEditUrl)
    cy.get(sel.tabRaceBuilds).click()
    cy.intercept('GET', '**/schema-templates*').as('templates')
    cy.get(sel.newRaceLink).click()
    cy.wait('@templates', { timeout: 10000 })

    cy.get('[data-testid="template-card-humanoid"]').click()
    cy.get(sel.schemaNameInput).type('Verify Humanoid')
    cy.get(sel.startBuildingBtn).click()

    verifyBuilderFields([
      { label: 'Appearance', type: 'appearance' },
      { label: 'Languages', type: 'languages' },
      { label: 'Personality', type: 'personality' },
      { label: 'Racial Features', type: 'features' },
    ])

    cy.visit(adventureEditUrl)
  })

  it('Creature race template has correct pre-built fields', () => {
    cy.get(sel.tabRaceBuilds).click()
    cy.intercept('GET', '**/schema-templates*').as('templates')
    cy.get(sel.newRaceLink).click()
    cy.wait('@templates', { timeout: 10000 })

    cy.get('[data-testid="template-card-creature"]').click()
    cy.get(sel.schemaNameInput).type('Verify Creature')
    cy.get(sel.startBuildingBtn).click()

    verifyBuilderFields([
      { label: 'Appearance', type: 'appearance' },
      { label: 'Natural Features', type: 'features' },
      { label: 'Languages', type: 'languages' },
    ])

    cy.visit(adventureEditUrl)
  })

  it('Supernatural race template has correct pre-built fields', () => {
    cy.get(sel.tabRaceBuilds).click()
    cy.intercept('GET', '**/schema-templates*').as('templates')
    cy.get(sel.newRaceLink).click()
    cy.wait('@templates', { timeout: 10000 })

    cy.get('[data-testid="template-card-supernatural"]').click()
    cy.get(sel.schemaNameInput).type('Verify Supernatural')
    cy.get(sel.startBuildingBtn).click()

    verifyBuilderFields([
      { label: 'Appearance', type: 'appearance' },
      { label: 'Personality', type: 'personality' },
      { label: 'Supernatural Features', type: 'features' },
      { label: 'Languages', type: 'languages' },
    ])

    cy.visit(adventureEditUrl)
  })

  // ── Class template checks (3 random from 7) ──────────────────────

  CLASS_TEMPLATES_TO_TEST.forEach(({ testid, fields }) => {
    it(`${testid} class template has correct pre-built fields`, () => {
      cy.visit(adventureEditUrl)
      cy.get(sel.tabClassBuilds).click()
      cy.intercept('GET', '**/schema-templates*').as('templates')
      cy.get(sel.newClassLink).click()
      cy.wait('@templates', { timeout: 10000 })

      cy.get(`[data-testid="template-card-${testid}"]`).click()
      cy.get(sel.schemaNameInput).type(`Verify ${testid}`)
      cy.get(sel.startBuildingBtn).click()

      verifyBuilderFields(fields)

      cy.visit(adventureEditUrl)
    })
  })

  // ── Schema builds ────────────────────────────────────────────────

  it('Owner builds Elven Heritage race from Humanoid template with Homeland field', () => {
    cy.visit(adventureEditUrl)
    cy.get(sel.tabRaceBuilds).click()
    cy.intercept('GET', '**/schema-templates*').as('templates')
    cy.get(sel.newRaceLink).click()
    cy.wait('@templates', { timeout: 10000 })

    cy.get(sel.schemaNameInput).type('Elven Heritage')
    cy.get('[data-testid="template-card-humanoid"]').click()
    cy.get(sel.startBuildingBtn).click()

    cy.get(sel.fieldList).should('contain', 'Appearance')
    cy.get(sel.fieldList).should('contain', 'Languages')
    cy.get(sel.fieldList).should('contain', 'Racial Features')

    cy.schemaBuilderAddField('palette-btn-text')
    cy.get(sel.fieldLabelInput).clear().type('Homeland')

    cy.intercept('GET', '/admin/schemas/*').as('schemaEditRsc')
    cy.schemaBuilderSave()
    cy.wait('@schemaEditRsc', { timeout: 15000 })
    cy.url().should('match', /\/admin\/schemas\/[a-f0-9-]{36}/)

    cy.get(sel.schemaActivateBtn, { timeout: 10000 }).should('be.visible').click()
    cy.get(sel.schemaActivateBtn).should('contain', 'Active')
  })

  it('Owner builds Shadow Scout class from blank builder with locked and XP-costed fields', () => {
    cy.visit(adventureEditUrl)
    cy.get(sel.tabClassBuilds).click()
    cy.intercept('GET', '**/schema-templates*').as('templates')
    cy.get(sel.newClassLink).click()
    cy.wait('@templates', { timeout: 10000 })

    cy.get(sel.schemaNameInput).type('Shadow Scout')
    // Blank card is selected by default
    cy.get(sel.startBuildingBtn).click()

    cy.get(sel.fieldList).should('not.contain', 'Hit Points')

    // "Sneak Points" — locked for players (gmOnly)
    cy.schemaBuilderAddField('palette-btn-number')
    cy.get(sel.fieldLabelInput).clear().type('Sneak Points')
    cy.contains('Lock for players').click()

    // "Focus Points" — XP cost per point = 10
    cy.schemaBuilderAddField('palette-btn-number')
    cy.get(sel.fieldLabelInput).clear().type('Focus Points')
    cy.contains('XP per point').parent().find('input[type="number"]').clear().type('10')

    // "Scout Abilities" — features field
    cy.schemaBuilderAddField('palette-btn-features')
    cy.get(sel.fieldLabelInput).clear().type('Scout Abilities')

    cy.intercept('GET', '/admin/schemas/*').as('schemaEditRsc')
    cy.schemaBuilderSave()
    cy.wait('@schemaEditRsc', { timeout: 15000 })
    cy.url().should('match', /\/admin\/schemas\/[a-f0-9-]{36}/)

    cy.get(sel.schemaActivateBtn, { timeout: 10000 }).should('be.visible').click()
    cy.get(sel.schemaActivateBtn).should('contain', 'Active')
  })

  it('Owner creates character Talon Ashveil with Elven Heritage race and Shadow Scout class', () => {
    // Enable the adventure so New Character button is available
    cy.get(sel.navAdvBuilder).click()
    cy.get(sel.gamesSearchInput, { timeout: 10000 }).clear().type(adventureName)
    cy.get(sel.enableAdvBtn, { timeout: 10000 }).first().click()
    cy.get(sel.enableAdvBtn).first().should('contain', 'Disable')

    cy.intercept('POST', /\/adventures\/.*\/edit/).as('builderContextSet')
    cy.visit(adventureEditUrl)
    cy.wait('@builderContextSet', { timeout: 10000 })

    cy.intercept('GET', '/characters*').as('charactersRsc')
    cy.get(sel.navMyCharacters).click()
    cy.wait('@charactersRsc', { timeout: 10000 })

    cy.get('[data-testid="adventure-list-panel"]').contains('button', adventureName, { timeout: 10000 }).click()
    cy.intercept('GET', '/characters/new*').as('newCharRsc')
    cy.get(sel.newCharacterBtn).first().click()
    cy.wait('@newCharRsc', { timeout: 10000 })

    // Race step
    cy.get('[data-testid="race-select-grid"]', { timeout: 10000 }).should('be.visible')
    cy.get(sel.continueBtn).should('be.disabled')
    cy.get('[data-testid="race-select-grid"]').contains('button', 'Elven Heritage').click()
    cy.get(sel.continueBtn).click()

    // Class step
    cy.get('[data-testid="class-select-grid"]', { timeout: 10000 }).should('be.visible')
    cy.get(sel.continueBtn).should('be.disabled')
    cy.get('[data-testid="class-select-grid"]').contains('button', 'Shadow Scout').click()
    cy.get(sel.continueBtn).click()

    // Name step
    cy.get(sel.characterNameInput, { timeout: 10000 }).type('Talon Ashveil')
    cy.get(sel.createCharacterBtn).click()

    cy.url({ timeout: 15000 }).should('match', /\/characters\/[a-f0-9-]{36}/)
    cy.url().then(url => { characterUrl = url })
  })

  // ── Character sheet verification ──────────────────────────────────

  it('Homeland field from template extra appears on character sheet view', () => {
    cy.visit(characterUrl)
    cy.contains('Homeland').should('be.visible')
  })

  it('Homeland field is editable (not locked) in edit mode', () => {
    cy.visit(characterUrl)
    cy.contains('button', 'Edit').click()
    cy.contains('label', 'Homeland').should('be.visible')
    cy.contains('button', 'Cancel').click()
  })

  it('Locked Sneak Points field is visible in view mode but absent from edit form', () => {
    cy.visit(characterUrl)

    // View mode: CharacterSheet renders all fields including gmOnly
    cy.contains('Sneak Points').should('be.visible')

    // Edit mode: editFields excludes gmOnly fields
    cy.contains('button', 'Edit').click()
    cy.contains('label', 'Sneak Points').should('not.exist')

    // Focus Points IS editable (not locked)
    cy.contains('label', 'Focus Points').should('be.visible')

    cy.contains('button', 'Cancel').click()
  })

  // ── Schema versioning ─────────────────────────────────────────────

  it('Owner edits Elven Heritage race schema to create v2 and activates it', () => {
    cy.visit(adventureEditUrl)
    cy.get(sel.tabRaceBuilds).click()

    cy.get(sel.buildsSearchInput, { timeout: 10000 }).type('Elven Heritage')
    cy.contains('Elven Heritage', { timeout: 10000 }).should('be.visible')

    cy.contains('tr', 'Elven Heritage').contains('a', 'Edit').click()
    cy.url({ timeout: 10000 }).should('match', /\/admin\/schemas\/[a-f0-9-]{36}/)

    cy.schemaBuilderAddField('palette-btn-text')
    cy.get(sel.fieldLabelInput).clear().type('Eye Color')

    cy.schemaBuilderSave()

    cy.visit(adventureEditUrl)
    cy.get(sel.tabRaceBuilds).click()
    cy.get(sel.buildsSearchInput).clear().type('Elven Heritage')

    // 2 versions now → expand button appears
    cy.get(sel.buildsExpandBtn, { timeout: 10000 }).first().click()

    // v2 (newest, inactive) has the activate button; v1 (active) does not
    cy.get(sel.buildsActivateBtn).first().click()

    // After activation re-expand if collapsed
    cy.contains('Elven Heritage', { timeout: 10000 })
    cy.get('[data-testid="builds-expand-btn"]').first().then(($btn) => {
      if ($btn.find('svg').hasClass('lucide-chevron-right')) {
        cy.wrap($btn).click()
      }
    })

    cy.get('tr.bg-muted\\/40').first().contains('Active').should('be.visible')
    cy.get('tr.bg-muted\\/40').eq(1).contains('Inactive').should('be.visible')
  })
})
