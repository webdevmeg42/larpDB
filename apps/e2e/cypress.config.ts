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
      API_URL: process.env.API_URL ?? 'http://localhost:3001',
      OWNER_EMAIL: process.env.OWNER_EMAIL ?? '',
      OWNER_PASSWORD: process.env.OWNER_PASSWORD ?? '',
      PLAYER_EMAIL: process.env.PLAYER_EMAIL ?? '',
      PLAYER_PASSWORD: process.env.PLAYER_PASSWORD ?? '',
    },
  },
})
