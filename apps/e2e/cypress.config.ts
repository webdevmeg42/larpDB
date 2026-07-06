import { defineConfig } from 'cypress'
import { config as loadEnv } from 'dotenv'
import path from 'path'

const { error } = loadEnv({ path: path.resolve(__dirname, 'cypress/.env') })
if (error) {
  console.warn('[e2e] cypress/.env not found — copy cypress/.env.sample to cypress/.env and fill in credentials')
}

export default defineConfig({
  e2e: {
    testIsolation: false,
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    env: {
      OWNER_EMAIL: process.env.OWNER_EMAIL ?? '',
      OWNER_PASSWORD: process.env.OWNER_PASSWORD ?? '',
    },
  },
})
