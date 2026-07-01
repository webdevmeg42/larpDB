import { testDateTime } from '../support/helpers'

const larpName = `Cypress ownerFlow Test ${testDateTime(new Date())}`

describe('Owner Flow', () => {
  before(() => {
    cy.loginOwner()
  })

  it('Owner cannot build an incorrect LARP', () => {

    // Navigate to LARP Builder and start a new LARP
    cy.contains('LARP Builder').click()
    cy.contains('Build New LARP').click()

    // Select Private visibility
    cy.get('body > div > main > div > form > div > div.p-6.pt-0.space-y-4 > div:nth-child(3) > div > button.px-3.py-1.rounded.text-sm.border.bg-primary.text-primary-foreground.border-primary').click()

    // Try to create without a name — should show validation error
    cy.contains('button', 'Create LARP').click()
    cy.get('body > div > main > div > form > div > div.p-6.pt-0.space-y-4 > div:nth-child(1) > p.text-xs.text-destructive')
      .should('be.visible')
      .and('contain', 'LARP Name is required')

    // Fill in the name and create the LARP
    cy.get('body > div > main > div > form > div > div.p-6.pt-0.space-y-4 > div:nth-child(1)').find('input').type(larpName)
    cy.contains('button', 'Create LARP').click()

    // Should land on the full builder's Branding tab
    cy.contains('Branding').should('be.visible')
    cy.get('#branding-form > div:nth-child(1) > div.p-6.pt-0.space-y-4 > div:nth-child(1)').find('input')
      .should('have.value', larpName)

    // Save without filling out required fields — should show validation
    cy.contains('button', 'Save changes').click()
    cy.get('body > div > main > div > div > div.mt-2 > div > p')
      .should('be.visible')
      .and('contain', 'Please fill out the following required fields: Tagline')
    cy.get('#branding-form > div:nth-child(1) > div.p-6.pt-0.space-y-4 > div:nth-child(2) > p.text-xs.text-destructive')
      .scrollIntoView()
      .should('be.visible')
      .and('contain', 'Tagline is required')

    // Navigate to The Codex tab and try to save without required fields
    cy.contains('The Codex').click()
    cy.contains('button', 'Save changes').click()
    cy.get('body > div > main > div > div > div.mt-2 > div > p')
      .should('be.visible')
      .and('contain', 'Please fill out the following required fields: Safety mechanics in use, Leveling System')
    cy.get('body > div > main > div > div > div.mt-2 > div > div:nth-child(1) > div.p-6.pt-0 > div > div:nth-child(5) > p')
      .scrollIntoView()
      .should('be.visible')
      .and('contain', 'Safety mechanics in use is required')
    cy.get('body > div > main > div > div > div.mt-2 > div > div:nth-child(2) > div.p-6.pt-0 > div > p')
      .scrollIntoView()
      .should('be.visible')
      .and('contain', 'Please select a leveling system')

    // Navigate to Rulebook tab, add a chapter, try to save without a title
    cy.contains('button','Rulebook').click()
    cy.contains('+ Add chapter').click()
    cy.contains('button', 'Save chapter').click()
    cy.get('body > div > main > div > div > div.mt-2 > div > div:nth-child(2) > div:nth-child(1) > div:nth-child(3)')
      .scrollIntoView()
      .should('be.visible')
      .and('contain', 'Chapter title is required')
  })
  
  after(() => {
    cy.visit('/larps')
    cy.contains('body > div > main > div > div.rounded-lg.border.overflow-hidden > table > tbody > tr.border-b.last\\:border-0.opacity-60 > td:nth-child(1) > div', larpName)
      .closest('tr')
      .find('button.text-xs.text-destructive.hover\\:underline')
      .click()
    cy.get('body > div > main > div > div.fixed.inset-0.z-50.flex.items-center.justify-center > div.relative.z-50.w-full.max-w-lg.rounded-lg.bg-background.p-6.shadow-lg > div > button.inline-flex.items-center.justify-center.whitespace-nowrap.rounded-md.text-sm.font-medium.ring-offset-background.transition-colors.focus-visible\\:outline-none.focus-visible\\:ring-2.focus-visible\\:ring-ring.focus-visible\\:ring-offset-2.disabled\\:pointer-events-none.disabled\\:opacity-50.bg-destructive.text-destructive-foreground.hover\\:bg-destructive\\/90.h-10.px-4.py-2')
      .click()
  })
})
