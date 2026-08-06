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
let adventureSlug = ''
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
  taglineInput: '[data-testid="tagline-input"]',
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
  templateCardHumanoid: '[data-testid="template-card-humanoid"]',
  templateCardCreature: '[data-testid="template-card-creature"]',
  templateCardSupernatural: '[data-testid="template-card-supernatural"]',
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
  // dashboard / browse
  discoverGameRow:  '[data-testid="discover-game-row"]',
  browseSearchInput:'[data-testid="browse-search-input"]',
  browseGameRow:    '[data-testid="browse-game-row"]',
  // adventures list
  gamesSearchInput: '[data-testid="games-search-input"]',
  deleteAdvBtn: '[data-testid="delete-adv-btn"]',
  confirmDeleteBtn: '[data-testid="confirm-delete-btn"]',
  // nav
  navAdvBuilder:   '[data-testid="nav-adv-builder"]',
  navEvents:       '[data-testid="nav-events"]',
  navRulebook:     '[data-testid="nav-rulebook"]',
  // rulebook nav page
  rulebookSearchInput:  '[data-testid="rulebook-search-input"]',
  rulebookAdventureRow: '[data-testid="rulebook-adventure-row"]',
  chapterTitleInput:    '[data-testid="chapter-title-input"]',
  rulebookChapterItem:  '[data-testid="rulebook-chapter-item"]',
  // builds tab (race + class list)
  buildsSearchInput: '[data-testid="builds-search-input"]',
  buildsExpandBtn: '[data-testid="builds-expand-btn"]',
  buildsActivateBtn: '[data-testid="builds-activate-btn"]',
  // adventures list — enable/disable toggle
  enableAdvBtn:         '[data-testid="enable-adv-btn"]',
  advNameAvailability: '[data-testid="adv-name-availability"]',
  draftList: '[data-testid="draft-list"]',
  saveDraftBtn: '[data-testid="save-draft-btn"]',
  draftResumeBtn: '[data-testid="draft-resume-btn"]',
  draftDeleteBtn: '[data-testid="draft-delete-btn"]',
  advSlugDisplay:      '[data-testid="adv-slug-display"]',
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
  calendarToggle:        '[data-testid="calendar-toggle"]',
  // new event form
  createEventBtn:        '[data-testid="create-event-btn"]',
  eventTitleInput:       '#title',
  eventStartAtInput:     '#startAt',
  // setup checklist / onboarding wizard
  setupChecklist:        '[data-testid="setup-checklist"]',
  wizardNameInput:       '[data-testid="wizard-name-input"]',
  wizardContinueBtn:     '[data-testid="wizard-continue-btn"]',
  wizardGoToEdit:        '[data-testid="wizard-go-to-edit"]',
  // adventure panel (shared left panel in Rulebook and Posts pages)
  adventurePanelItem: '[data-testid="adventure-panel-item"]',
  // posts landing page
  newPostBtn:         '[data-testid="new-post-btn"]',
  navPosts:           '[data-testid="nav-posts"]',
}

describe('Owner Flow', () => {
  before(() => {
    cy.loginOwner()
    cy.get(sel.navAdvBuilder, { timeout: 10000 }).should('be.visible')
  })

  it('Owner cannot build an incorrect Adventure', () => {
    cy.intercept('GET', '/adventures*').as('advBuilderRsc')
    cy.get(sel.navAdvBuilder).click()
    cy.wait('@advBuilderRsc', { timeout: 10000 })
    cy.contains('Build New Adventure').click()

    cy.get(sel.visibilityPrivateBtn).click()
    cy.contains('button', 'Create Adventure').click()
    cy.get(sel.advNameError)
      .should('be.visible').and('contain', 'Adventure Name is required')

    cy.intercept('POST', '**/games').as('createGame')
    cy.contains('button', 'Public').click()
    cy.get(sel.advNameInput).type(adventureName)
    cy.contains('button', 'Create Adventure').click()
    cy.wait('@createGame', { timeout: 10000 })

    cy.url({ timeout: 15000 }).should('include', '/edit')
    cy.get(sel.tabBranding).should('be.visible')
    cy.url().then(url => { adventureEditUrl = url })
    cy.get(sel.advSlugDisplay)
      .should('be.visible')
      .invoke('attr', 'data-slug')
      .then(slug => { adventureSlug = slug as string })
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

    // Rulebook chapter editor is at /rulebook (admin view), not the public viewer
    cy.visit('/rulebook')
    cy.contains(sel.adventurePanelItem, adventureName).click()
    cy.contains('+ Add chapter').click()
    cy.contains('button', 'Save chapter').click()
    cy.get(sel.chapterTitleError)
      .scrollIntoView().should('be.visible').and('contain', 'Chapter title is required')
  })

  it('Setup checklist appears on the edit page before setup is complete', () => {
    cy.visit(adventureEditUrl)
    // Checklist should be visible because setup is not yet complete
    cy.get(sel.setupChecklist).should('be.visible')
    // "Set a tagline" is not yet set
    cy.contains(sel.setupChecklist, 'Set a tagline').should('be.visible')
    // Clicking "→ Branding" action button switches to the Branding tab
    cy.contains('button', '→ Branding').click()
    cy.get(sel.tabBranding).should('have.attr', 'data-state', 'active')
  })

  it('Owner can save branding changes', () => {
    cy.visit(adventureEditUrl)
    cy.get(sel.taglineInput).should('not.be.disabled').clear().type('Test tagline')
    cy.get(sel.saveChangesBtn).click()
    cy.contains('[data-testid="toast"]', 'Branding saved').should('be.visible')
    cy.reload()
    cy.get(sel.taglineInput).should('have.value', 'Test tagline')
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
    cy.get(sel.saveChangesBtn).should('not.be.disabled')

    cy.get(sel.tabRaceBuilds).click()
    // Wait for config reload to propagate (leveling system now set → link becomes enabled)
    cy.get(sel.newRaceLink).should('not.have.attr', 'aria-disabled', 'true')
    // Intercept before click so we can wait for the async template fetch after navigation
    cy.intercept('GET', '**/schema-templates*').as('schemaTemplates')
    cy.get(sel.newRaceLink).click()
    cy.wait('@schemaTemplates', { timeout: 10000 })

    cy.get(sel.templateCardHumanoid).click()
    cy.get(sel.schemaNameError)
      .should('be.visible').and('contain', 'Name is required')

    cy.get(sel.schemaNameInput).click().type(adventureName)
    // Switch to Blank so the builder starts with no pre-populated fields
    // (Humanoid would duplicate Appearance/Languages/Personality from the palette adds below)
    cy.get(sel.templateCardBlank).click()
    cy.get(sel.startBuildingBtn).click()

    // Add common fields — labels auto-populate on click, then one save (POST)
    cy.schemaBuilderAddField('palette-btn-equipment', 'Equipment')
    cy.schemaBuilderAddField('palette-btn-appearance', 'Appearance')
    cy.schemaBuilderAddField('palette-btn-personality', 'Personality')
    cy.schemaBuilderAddField('palette-btn-features', 'Features')
    cy.schemaBuilderAddField('palette-btn-influences', 'Influences')
    cy.schemaBuilderAddField('palette-btn-languages', 'Languages')
    cy.intercept('GET', '/admin/schemas/*').as('schemaEditRsc')
    cy.schemaBuilderSave()
    cy.wait('@schemaEditRsc', { timeout: 10000 })

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
    cy.schemaBuilderLabelField(`${adventureName} testRace 1`)
    cy.schemaBuilderLabelField(`${adventureName} testRace 2`)
    cy.schemaBuilderLabelField(`${adventureName} testRace 3`)
    cy.schemaBuilderLabelField(`${adventureName} testRace 4`)
    cy.schemaBuilderLabelField(`${adventureName} testRace 5`)
    cy.schemaBuilderLabelField(`${adventureName} testRace 6`)
    cy.schemaBuilderLabelField(`${adventureName} testRace 7`)
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
    // Switch to Blank — Warrior template includes hitpoints and attacks fields that
    // require ≥ 3 entries defined to pass class schema validation
    cy.get(sel.templateCardBlank).click()
    cy.get(sel.startBuildingBtn).click()

    // Add labeled fields — auto-populate on click, then one save (POST)
    cy.schemaBuilderAddField('palette-btn-features', 'Features')
    cy.schemaBuilderAddField('palette-btn-influences', 'Influences')
    cy.schemaBuilderSave()
    cy.url({ timeout: 10000 }).should('match', /\/admin\/schemas\/[a-f0-9-]{36}/)

    // schema-activate-btn only renders on the edit page (schemaId is a real UUID)
    cy.get(sel.schemaActivateBtn, { timeout: 10000 })

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
    cy.schemaBuilderLabelField(`${adventureName} testClass 1`)
    cy.schemaBuilderLabelField(`${adventureName} testClass 2`)
    cy.schemaBuilderLabelField(`${adventureName} testClass 3`)
    cy.schemaBuilderLabelField(`${adventureName} testClass 4`)
    cy.schemaBuilderLabelField(`${adventureName} testClass 5`)
    cy.schemaBuilderLabelField(`${adventureName} testClass 6`)
    cy.schemaBuilderLabelField(`${adventureName} testClass 7`)
    cy.schemaBuilderLabelField(`${adventureName} testClass 8`)
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

    // Public adventure page is accessible once active
    cy.intercept('GET', `**/games/${adventureSlug}/public`).as('publicPage')
    cy.visit(`/adventures/${adventureSlug}`)
    cy.wait('@publicPage', { timeout: 10000 })
    cy.contains(adventureName)
    // Intercept before the edit visit so we can wait for BuilderPageClient's
    // setCurrentGameAction() server action to complete — it calls revalidatePath('/', 'layout')
    // and if still in-flight during a soft navigation, it can cancel it.
    cy.intercept('POST', /\/adventures\/.*\/edit/).as('builderContextSet')
    cy.visit(adventureEditUrl)
    cy.wait('@builderContextSet', { timeout: 10000 })

    // Navigate to My Characters and locate the Adventure
    cy.intercept('GET', '/characters*').as('charactersRsc')
    cy.get(sel.navMyCharacters).click()
    cy.wait('@charactersRsc', { timeout: 10000 })
    cy.get('[data-testid="adventure-list-panel"]').contains('button', adventureName, { timeout: 10000 }).click()
    cy.intercept('GET', '/characters/new*').as('newCharacterRsc')
    cy.get(sel.newCharacterBtn).first().click()
    cy.wait('@newCharacterRsc', { timeout: 10000 })

    // Race step — Continue is disabled until a race is selected
    cy.get(sel.continueBtn).should('be.disabled')
    cy.get('[data-testid="race-select-grid"]').contains('button', adventureName).click()
    cy.get(sel.continueBtn).click()

    // Class step — wait for class grid before checking button state
    cy.get('[data-testid="class-select-grid"]', { timeout: 10000 }).should('be.visible')
    cy.get(sel.continueBtn).should('be.disabled')
    cy.get('[data-testid="class-select-grid"]').contains('button', `Warrior ${adventureName}`).click()
    cy.get(sel.continueBtn).click()

    // Character form: validate name required before submitting
    cy.get(sel.createCharacterBtn).click()
    cy.contains('Character name is required').should('be.visible')

    // Fill in name and successfully create the character
    cy.intercept('POST', '**/characters').as('createCharacter')
    cy.get(sel.characterNameInput).type(characterName)
    cy.get(sel.createCharacterBtn).click()
    cy.wait('@createCharacter', { timeout: 10000 })
    cy.url({ timeout: 15000 }).should('match', /\/characters\/[a-f0-9-]{36}/)
  })

  it('Owner can create an event', () => {
    cy.intercept('GET', '/events*').as('eventsRsc')
    cy.get(sel.navEvents).click()
    cy.wait('@eventsRsc', { timeout: 10000 })
    cy.get('[data-testid="adventure-list-panel"]').contains('button', adventureName, { timeout: 10000 }).click()
    cy.get(sel.newEventBtn).first().click()

    cy.get(sel.createEventBtn).should('be.disabled')

    cy.get(sel.eventTitleInput).type(`Event ${adventureName}`)
    cy.get(sel.createEventBtn).should('be.disabled')

    cy.intercept('POST', '**/events').as('createEvent')
    cy.get(sel.eventStartAtInput).type(tomorrowDatetimeLocal())
    cy.get(sel.createEventBtn).click()
    cy.wait('@createEvent', { timeout: 10000 })

    cy.contains('h1', `Event ${adventureName}`, { timeout: 15000 }).should('be.visible')
  })

  describe('Events calendar', () => {
    it('Owner can toggle calendar view on and off', () => {
      cy.intercept('GET', '/events*').as('eventsRsc')
      cy.get(sel.navEvents).click()
      cy.wait('@eventsRsc', { timeout: 10000 })
      cy.get('[data-testid="adventure-list-panel"]').contains('button', adventureName, { timeout: 10000 }).click()
      cy.get(sel.calendarToggle).click()
      cy.get('[data-testid="event-calendar"]').should('be.visible')
      cy.get(sel.calendarToggle).click()
      cy.get('[data-testid="event-calendar"]').should('not.exist')
    })

    it('Owner sees event bar and popover in calendar view', () => {
      cy.intercept('GET', '/events*').as('eventsRsc')
      cy.visit('/events')
      cy.wait('@eventsRsc', { timeout: 10000 })
      cy.get('[data-testid="adventure-list-panel"]').contains('button', adventureName, { timeout: 10000 }).click()
      cy.get(sel.calendarToggle).click()
      cy.get('[data-testid="event-calendar"]').should('be.visible')
      cy.get('[data-testid="event-bar"]', { timeout: 10000 }).first().click()
      cy.get('[data-testid="event-popover"]').should('be.visible')
      cy.get('[data-testid="event-popover"]').contains('View').should('have.attr', 'href')
    })
  })

  it('Owner can save a draft and resume it', () => {
    const draftTitle = `Draft ${Date.now()}`

    cy.clearLocalStorage('plotrunner_game_id')
    cy.clearCookie('gameId')
    cy.visit('/admin/posts/new')
    cy.get('#adventure').select(adventureName)
    cy.get('#title').type(draftTitle)
    cy.get('#body').type('draft body content')

    cy.get(sel.saveDraftBtn).click()
    cy.get(sel.saveDraftBtn).should('contain', 'Draft saved!')

    // Revisit the page — draft appears in the list
    cy.visit('/admin/posts/new')
    cy.get(sel.draftList).should('be.visible')
    cy.contains(sel.draftList, draftTitle).should('be.visible')

    // Resume populates the form
    cy.get(sel.draftResumeBtn).first().click()
    cy.get('#title').should('have.value', draftTitle)
    cy.get('#body').should('have.value', 'draft body content')
    cy.get(sel.draftList).should('not.exist')
  })

  it('Owner can publish from a resumed draft', () => {
    const draftTitle = `Publish Draft ${Date.now()}`

    // Create a draft
    cy.clearLocalStorage('plotrunner_game_id')
    cy.clearCookie('gameId')
    cy.visit('/admin/posts/new')
    cy.get('#adventure').select(adventureName)
    cy.get('#title').type(draftTitle)
    cy.get('#body').type('ready to publish')
    cy.get(sel.saveDraftBtn).click()
    cy.get(sel.saveDraftBtn).should('contain', 'Draft saved!')

    // Revisit and resume
    cy.visit('/admin/posts/new')
    cy.get(sel.draftList).should('be.visible')
    cy.get(sel.draftResumeBtn).first().click()

    // Publish
    cy.contains('button', 'Publish').click()
    cy.url().should('not.include', '/admin/posts/new')

    // Draft no longer appears on revisit
    cy.visit('/admin/posts/new')
    cy.contains(draftTitle).should('not.exist')

    // Cleanup: delete the published post
    cy.visit('/admin/posts')
    cy.contains(sel.adventurePanelItem, adventureName, { timeout: 10000 }).click()
    cy.contains('li', draftTitle, { timeout: 10000 }).find('[data-testid="delete-post-btn"]').click()
    cy.get('[data-testid="confirm-delete-post-btn"]').click()
    cy.contains('li', draftTitle).should('not.exist')
  })

  it('Owner cannot publish a post without required fields', () => {
    cy.clearLocalStorage('plotrunner_game_id')
    cy.visit('/admin/posts/new')
    cy.contains('h1', 'New Post')

    // Publish is disabled until an adventure is selected (2 active games → no default)
    cy.contains('button', 'Publish').should('be.disabled')

    // Selecting an adventure enables the button
    cy.get('#adventure').select(adventureName)
    cy.contains('button', 'Publish').should('not.be.disabled')

    // Clicking Publish with no title shows a title error
    cy.contains('button', 'Publish').click()
    cy.get('[data-testid="post-title-error"]').should('be.visible').and('contain', 'Title is required')

    // Typing in the title clears the error
    cy.get('#title').type('Test post title')
    cy.get('[data-testid="post-title-error"]').should('not.exist')
  })

  describe('Master-detail layout and cross-page persistence', () => {
    it('persists selected adventure from Characters to Events', () => {
      cy.loginOwner()

      // Visit Characters, wait for adventure list to load
      cy.visit('/characters')

      // Click the adventure to select it (writes to localStorage)
      cy.contains('button', adventureName, { timeout: 10000 }).click()

      // Navigate to Events — same adventure should be pre-selected
      cy.intercept('GET', '/events*').as('eventsRsc')
      cy.get(sel.navEvents).click()
      cy.wait('@eventsRsc', { timeout: 10000 })
      cy.url().should('include', '/events')

      // The adventure should be highlighted (bg-muted class indicates selection)
      cy.contains('button', adventureName, { timeout: 10000 })
        .should('have.class', 'bg-muted')
    })

    it('Posts page shows adventures and navigates to compose with no dropdown', () => {
      cy.loginOwner()
      cy.visit('/admin/posts')

      // Left panel shows adventures
      cy.get(sel.adventurePanelItem, { timeout: 10000 }).should('have.length.gte', 1)

      // Click the adventure we created
      cy.contains(sel.adventurePanelItem, adventureName, { timeout: 5000 }).click()

      // Right panel shows "New Post" button
      cy.get(sel.newPostBtn).should('be.visible')

      // Navigate to compose via "New Post"
      cy.get(sel.newPostBtn).click()
      cy.url().should('include', '/admin/posts/new')
      cy.contains('h1', 'New Post').should('be.visible')

      // Adventure dropdown hidden — game pre-selected from localStorage
      cy.get('select#adventure').should('not.exist')
    })

    it('Rulebook page shows master-detail layout with inline editor for owner', () => {
      cy.loginOwner()
      cy.visit('/rulebook')

      // Old search+table not present
      cy.get(sel.rulebookSearchInput).should('not.exist')
      cy.get(sel.rulebookAdventureRow).should('not.exist')

      // Left panel with AdventurePanel items
      cy.get(sel.adventurePanelItem, { timeout: 10000 }).should('have.length.gte', 1)

      // Click the adventure
      cy.contains(sel.adventurePanelItem, adventureName, { timeout: 5000 }).click()

      // Inline editor appears (not a navigation away)
      cy.url().should('match', /\/rulebook$/)
      // Open the new-chapter form to confirm the editor is present
      cy.contains('+ Add chapter', { timeout: 10000 }).click()
      cy.get(sel.chapterTitleInput, { timeout: 10000 }).should('exist')
    })
  })

  it('Owner can publish a post with a photo and see it in the Dashboard feed', () => {
    const postTitle = `Test Post ${adventureName}`

    // Subscribe to the adventure so the post appears in the feed
    cy.visit('/dashboard')
    cy.contains(sel.discoverGameRow, adventureName).within(() => {
      cy.contains('button', /Follow/).click()
      cy.contains('button', /Following/).should('be.visible')
    })

    cy.visit('/admin/posts/new')
    cy.get('#adventure').select(adventureName)
    cy.get('#title').type(postTitle)
    cy.get('#body').type('test')
    cy.get('input[type="file"][accept="image/*"]').selectFile('cypress/fixtures/PRLogo.png', { force: true })

    // Wait for upload to finish (button is disabled while uploading)
    cy.contains('button', 'Publish', { timeout: 15000 }).should('not.be.disabled')
    cy.contains('button', 'Publish').click()

    // Successful publish redirects away from the form
    cy.url().should('not.include', '/admin/posts/new')

    // Post appears in the Dashboard feed
    cy.visit('/dashboard')
    cy.contains('h1', 'Feed')
    cy.contains(postTitle).should('be.visible')

    // Cleanup: delete the test post
    cy.visit('/admin/posts')
    cy.contains(sel.adventurePanelItem, adventureName, { timeout: 10000 }).click()
    cy.contains('li', postTitle, { timeout: 10000 }).find('[data-testid="delete-post-btn"]').click()
    cy.get('[data-testid="confirm-delete-post-btn"]').click()
    cy.contains('li', postTitle).should('not.exist')
  })

  it('Owner cannot create an adventure with a duplicate name', () => {
    cy.get(sel.navAdvBuilder).click()
    cy.contains('Build New Adventure').click()

    cy.get(sel.advNameInput).type(adventureName)
    cy.get(sel.advNameAvailability, { timeout: 3000 }).should('contain', '✗ Already taken')
    cy.contains('button', 'Create Adventure').should('be.disabled')
  })

  it('Owner can view and edit the Rulebook via the navbar', () => {
    cy.intercept('GET', '/rulebook*').as('rulebookRsc')
    cy.get(sel.navRulebook).click()
    cy.wait('@rulebookRsc', { timeout: 10000 })
    cy.contains('h1', 'Rulebook')

    // Old search+table UI is gone
    cy.get(sel.rulebookSearchInput).should('not.exist')
    cy.get(sel.rulebookAdventureRow).should('not.exist')

    // Adventure appears in the AdventurePanel left panel
    cy.get(sel.adventurePanelItem).should('have.length.gte', 1)
    cy.contains(sel.adventurePanelItem, adventureName).should('be.visible')

    // Click the adventure to load it inline
    cy.contains(sel.adventurePanelItem, adventureName).click()

    // Owner sees the inline rulebook editor (not navigating away)
    cy.url().should('match', /\/rulebook$/)

    // Add a chapter
    cy.contains('+ Add chapter', { timeout: 10000 }).click()
    cy.get(sel.chapterTitleInput).type('Introduction')
    cy.contains('button', 'Save chapter').click()

    // Chapter is visible in the list
    cy.contains(sel.rulebookChapterItem, 'Introduction').should('be.visible')

    // Data persists after reload
    cy.reload()
    cy.contains(sel.rulebookChapterItem, 'Introduction').should('be.visible')
  })

  it('Dashboard shows feed heading, empty state, and Discover section', () => {
    cy.intercept('GET', /\/games(\?|$)/).as('dashGames')
    cy.visit('/dashboard')
    cy.wait('@dashGames', { timeout: 10000 })
    cy.contains('h1', 'Feed')
    // cy.contains("You're not following any Adventures yet.")
    cy.contains('h2', 'Discover Adventures')
    cy.get(sel.discoverGameRow).should('have.length.gte', 1)
    cy.contains(sel.discoverGameRow, adventureName).scrollIntoView().should('be.visible')
    cy.contains('a', 'Browse all →').should('have.attr', 'href', '/browse')
  })

  it('Disabled adventure disappears from Dashboard Discover section', () => {
    cy.get(sel.navAdvBuilder).click()
    cy.get(sel.gamesSearchInput).clear().type(adventureName)
    cy.get(sel.enableAdvBtn).first().click()
    cy.get(sel.enableAdvBtn).first().should('contain', 'Enable')

    cy.visit('/dashboard')
    cy.contains('h2', 'Discover Adventures')
    cy.contains(sel.discoverGameRow, adventureName).should('not.exist')
  })

  it('Browse page shows adventures, search filter, and join mode filter', () => {
    // Re-enable the adventure disabled by the previous test so it appears in browse
    cy.get(sel.navAdvBuilder).click()
    cy.get(sel.gamesSearchInput).clear().type(adventureName)
    cy.get(sel.enableAdvBtn).first().click()
    cy.get(sel.enableAdvBtn).first().should('contain', 'Disable')

    cy.intercept('GET', /\/games(\?|$)/).as('browseGames')
    cy.visit('/browse')
    cy.wait('@browseGames', { timeout: 10000 })
    cy.contains('h1', 'Browse Adventures')
    cy.contains('a', 'My feed →').should('have.attr', 'href', '/dashboard')

    cy.get(sel.browseGameRow).should('have.length.gte', 1)
    cy.get(sel.browseGameRow).first().within(() => {
      cy.contains('button', /Follow|Following/).should('be.visible')
    })

    // Search filters the list
    cy.get(sel.browseSearchInput).type(adventureName)
    cy.contains(sel.browseGameRow, adventureName).should('be.visible')
    cy.get(sel.browseSearchInput).clear()
    cy.get(sel.browseGameRow).should('have.length.gte', 1)

    // Join mode filter toggles active state
    cy.contains('button', 'Open only').click()
    cy.contains('button', 'Open only').should('have.class', 'bg-primary')
    cy.contains(sel.browseGameRow, adventureName).should('be.visible')
    cy.contains('button', 'Any').click()
    cy.contains('button', 'Any').should('have.class', 'bg-primary')
    cy.contains(sel.browseGameRow, adventureName).should('be.visible')
  })

  after(() => {
    // Radix dialog timing bug in after() hooks: the pointerup from clicking
    // deleteAdvBtn propagates to the freshly-rendered overlay and immediately
    // closes the dialog. Skip the UI and delete via API instead.
    cy.loginOwner()
    const match = adventureEditUrl.match(/\/adventures\/([a-f0-9-]{36})/)
    if (match) {
      cy.request('DELETE', `${Cypress.env('API_URL')}/games/${match[1]}`)
    }
  })
})
