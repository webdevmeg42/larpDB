# @larpdb/e2e

Cypress end-to-end tests for the larpDB web app.

## Setup

**1. Install dependencies** (from repo root):

```bash
pnpm install
```

**2. Copy the env sample and fill in credentials:**

```bash
cp cypress/.env.sample cypress/.env
```

Then open `cypress/.env` and set your owner account credentials:

```
OWNER_EMAIL=your-email@example.com
OWNER_PASSWORD=your-password
```

`cypress/.env` is gitignored — never commit it.

## Running tests

First, start the web app in a separate terminal:

```bash
pnpm --filter @larpdb/web dev
```

Then run Cypress from the repo root:

```bash
# Headless (CI)
pnpm --filter @larpdb/e2e cy:run

# Interactive UI
pnpm --filter @larpdb/e2e cy:open
```

## Structure

```
cypress/
  e2e/              test files (*.cy.ts)
  support/
    commands.ts     custom commands: cy.loginOwner(), cy.logout()
    helpers.ts      utility functions: testDateTime()
    e2e.ts          support entry point
  fixtures/         static test data
cypress.config.ts   Cypress configuration
```
