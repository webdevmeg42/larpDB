import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { db } from '../db/index.js'
import { game, storeItems, purchases } from '../db/schema.js'
import { env } from '../env.js'

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) throw Object.assign(new Error('Stripe not configured'), { statusCode: 503 })
  return new Stripe(env.STRIPE_SECRET_KEY)
}

function getReturnUrl() {
  return env.STRIPE_RETURN_URL ?? 'http://localhost:3000'
}

export const stripeConnectRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /stripe/connect — creates Express account and returns Account Link URL
  fastify.post(
    '/stripe/connect',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ gameId, role }, 'non-owner tried to connect Stripe')
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const stripe = getStripe()

      const [gameRow] = await db
        .select({ id: game.id, stripeAccountId: game.stripeAccountId })
        .from(game)
        .where(eq(game.id, gameId))
        .limit(1)
      if (!gameRow) return reply.status(404).send({ error: 'Game not found' })

      let accountId = gameRow.stripeAccountId
      if (!accountId) {
        const account = await stripe.accounts.create({ type: 'express' })
        accountId = account.id
        await db.update(game).set({ stripeAccountId: accountId }).where(eq(game.id, gameId))
        request.log.info({ gameId, accountId }, 'Stripe Express account created')
      }

      const returnBase = getReturnUrl()
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${returnBase}/adventures/${gameId}/edit?tab=payments&refresh=true`,
        return_url: `${returnBase}/adventures/${gameId}/edit?tab=payments&connected=true`,
        type: 'account_onboarding',
      })

      return reply.send({ url: accountLink.url })
    },
  )

  // GET /stripe/status — returns Stripe connection state for the current game
  fastify.get(
    '/stripe/status',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const [gameRow] = await db
        .select({ stripeAccountId: game.stripeAccountId, stripeOnboardingComplete: game.stripeOnboardingComplete })
        .from(game)
        .where(eq(game.id, gameId))
        .limit(1)
      if (!gameRow) return reply.status(404).send({ error: 'Game not found' })

      return reply.send({
        stripeAccountId: gameRow.stripeAccountId,
        stripeOnboardingComplete: gameRow.stripeOnboardingComplete,
      })
    },
  )

  // DELETE /stripe/disconnect — clears Stripe account, blocks if purchases exist
  fastify.delete(
    '/stripe/disconnect',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const [hasPurchase] = await db
        .select({ id: purchases.id })
        .from(purchases)
        .innerJoin(storeItems, eq(storeItems.id, purchases.storeItemId))
        .where(eq(storeItems.gameId, gameId))
        .limit(1)

      if (hasPurchase) {
        request.log.warn({ gameId }, 'Stripe disconnect rejected — game has existing purchases')
        return reply.status(409).send({ error: 'Cannot disconnect Stripe while purchases exist' })
      }

      await db
        .update(game)
        .set({ stripeAccountId: null, stripeOnboardingComplete: false })
        .where(eq(game.id, gameId))

      request.log.info({ gameId }, 'Stripe account disconnected')
      return reply.status(204).send()
    },
  )

  // POST /stripe/webhook — Stripe events, signature verified, raw body required.
  // Nested scope overrides the JSON content-type parser to get raw Buffer for sig verification.
  fastify.register(async (scope) => {
    scope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, body, done) => { done(null, body) },
    )

    scope.post('/stripe/webhook', async (request, reply) => {
      if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
        return reply.status(503).send({ error: 'Stripe not configured' })
      }

      const sig = request.headers['stripe-signature']
      if (!sig) {
        return reply.status(400).send({ error: 'Missing stripe-signature header' })
      }

      const stripe = new Stripe(env.STRIPE_SECRET_KEY)
      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(
          request.body as Buffer,
          sig as string,
          env.STRIPE_WEBHOOK_SECRET,
        )
      } catch {
        request.log.warn('Stripe webhook signature verification failed')
        return reply.status(400).send({ error: 'Invalid signature' })
      }

      if (event.type === 'account.updated') {
        const account = event.data.object as Stripe.Account
        if (account.details_submitted && account.charges_enabled) {
          const [gameRow] = await db
            .select({ id: game.id })
            .from(game)
            .where(eq(game.stripeAccountId, account.id))
            .limit(1)

          if (gameRow) {
            await db
              .update(game)
              .set({ stripeOnboardingComplete: true })
              .where(eq(game.id, gameRow.id))
            request.log.info({ gameId: gameRow.id, accountId: account.id }, 'Stripe onboarding marked complete')
          } else {
            request.log.warn({ accountId: account.id }, 'account.updated for unknown Stripe account — ignoring')
          }
        }
      }

      return reply.send({ received: true })
    })
  })
}
