import type { FastifyPluginAsync } from 'fastify'
import { eq, and, desc, count, sql, inArray, asc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { game, posts, comments, postLikes, users, gameMembers, adventureSubscriptions } from '../db/schema.js'
import { CreatePostInput, UpdatePostInput, CreateCommentInput } from '@plotrunner/shared'
import { gmOrOwner } from '../lib/roles.js'

export const postRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /games/:slug/posts — public, paginated, published only
  fastify.get('/games/:slug/posts', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const { limit = '20', offset = '0' } = request.query as { limit?: string; offset?: string }
    const limitN = Math.min(parseInt(limit, 10) || 20, 50)
    const offsetN = parseInt(offset, 10) || 0

    const [targetGame] = await db
      .select({ id: game.id })
      .from(game)
      .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
      .limit(1)
    if (!targetGame) return reply.status(404).send({ error: 'Game not found' })

    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(and(eq(posts.gameId, targetGame.id), eq(posts.status, 'published')))

    const rows = await db
      .select({
        id: posts.id,
        gameId: posts.gameId,
        authorId: posts.authorId,
        authorName: users.displayName,
        title: posts.title,
        body: posts.body,
        likeCount: sql<number>`cast(count(distinct ${postLikes.id}) as int)`,
        commentCount: sql<number>`cast(count(distinct ${comments.id}) as int)`,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        mediaType: posts.mediaType,
        mediaUrls: posts.mediaUrls,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(postLikes, eq(postLikes.postId, posts.id))
      .leftJoin(comments, eq(comments.postId, posts.id))
      .where(and(eq(posts.gameId, targetGame.id), eq(posts.status, 'published')))
      .groupBy(posts.id, users.displayName)
      .orderBy(desc(posts.createdAt))
      .limit(limitN)
      .offset(offsetN)

    return reply.send({ items: rows, total, limit: limitN, offset: offsetN })
  })

  // GET /posts/drafts — auth only, returns all caller's drafts across all their games
  fastify.get(
    '/posts/drafts',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub

      const rows = await db
        .select({
          id: posts.id,
          title: posts.title,
          body: posts.body,
          gameId: posts.gameId,
          gameName: game.name,
          mediaType: posts.mediaType,
          mediaUrls: posts.mediaUrls,
          status: posts.status,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .innerJoin(game, eq(game.id, posts.gameId))
        .where(and(eq(posts.authorId, userId), eq(posts.status, 'draft')))
        .orderBy(desc(posts.updatedAt))

      return reply.send(rows)
    },
  )

  // POST /posts — game-context, owner/gm, active game
  fastify.post(
    '/posts',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { role, gameId, userId, gameStatus } = request.gameContext

      if (!gmOrOwner(role)) {
        request.log.warn({ userId, role, gameId }, "non-staff tried to create a post")
        return reply.status(403).send({ error: 'Owner or GM role required' })
      }
      if (gameStatus !== 'active') {
        request.log.warn({ userId, role, gameId }, "post creation rejected — adventure is not active")
        return reply.status(403).send({ error: 'Posts can only be created while the Adventure is active' })
      }

      const result = CreatePostInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [post] = await db.insert(posts).values({
        gameId,
        authorId: userId,
        title: result.data.title,
        body: result.data.body,
        mediaType: result.data.mediaType ?? null,
        mediaUrls: result.data.mediaUrls ?? null,
        status: result.data.status ?? 'published',
      }).returning()

      request.log.info({ id: post!.id, gameId, status: post!.status }, "post created")
      return reply.status(201).send(post)
    },
  )

  // PATCH /posts/:postId — game-context, owner/gm, own post only
  fastify.patch(
    '/posts/:postId',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { postId } = request.params as { postId: string }
      const { gameId, userId, role } = request.gameContext

      if (!gmOrOwner(role)) {
        return reply.status(403).send({ error: 'Owner or GM role required' })
      }

      const [post] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.id, postId), eq(posts.gameId, gameId), eq(posts.authorId, userId)))
        .limit(1)

      if (!post) return reply.status(404).send({ error: 'Post not found' })

      const result = UpdatePostInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      // Merge patch over existing values, then validate effective media state
      const effectiveMediaType = result.data.mediaType !== undefined ? result.data.mediaType : post.mediaType
      const effectiveMediaUrls = result.data.mediaUrls !== undefined ? result.data.mediaUrls : post.mediaUrls

      if (effectiveMediaType === 'photo') {
        if (!effectiveMediaUrls || effectiveMediaUrls.length < 1 || effectiveMediaUrls.length > 8) {
          return reply.status(400).send({ error: 'Invalid input', details: { fieldErrors: { mediaUrls: ['Photo posts require 1–8 URLs'] } } })
        }
      } else if (effectiveMediaType === 'video') {
        if (!effectiveMediaUrls || effectiveMediaUrls.length !== 1) {
          return reply.status(400).send({ error: 'Invalid input', details: { fieldErrors: { mediaUrls: ['Video posts require exactly 1 URL'] } } })
        }
      } else if (!effectiveMediaType && effectiveMediaUrls && effectiveMediaUrls.length > 0) {
        return reply.status(400).send({ error: 'Invalid input', details: { fieldErrors: { mediaUrls: ['mediaUrls provided without mediaType'] } } })
      }

      const [updated] = await db
        .update(posts)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(posts.id, postId))
        .returning()

      request.log.info({ id: postId, gameId, status: updated!.status }, "post updated")
      return reply.send(updated)
    },
  )

  // DELETE /posts/:postId — game-context, owner/gm
  fastify.delete(
    '/posts/:postId',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { postId } = request.params as { postId: string }
      const { role, gameId } = request.gameContext

      if (!gmOrOwner(role)) {
        request.log.warn({ userId: request.gameContext.userId, role }, "non-staff tried to delete a post")
        return reply.status(403).send({ error: 'Owner or GM role required' })
      }

      const [post] = await db.select().from(posts).where(and(eq(posts.id, postId), eq(posts.gameId, gameId))).limit(1)
      if (!post) {
        request.log.warn({ postId, gameId }, "post not found for delete")
        return reply.status(404).send({ error: 'Post not found' })
      }

      await db.delete(posts).where(eq(posts.id, postId))
      request.log.info({ id: postId, gameId }, "post deleted")
      return reply.status(204).send()
    },
  )

  // GET /posts/:postId/comments — public for public+active games, members-only otherwise
  fastify.get('/posts/:postId/comments', async (request, reply) => {
    const { postId } = request.params as { postId: string }

    const [postWithGame] = await db
      .select({
        postId: posts.id,
        gameId: posts.gameId,
        gameIsPublic: game.isPublic,
        gameStatus: game.status,
      })
      .from(posts)
      .innerJoin(game, eq(game.id, posts.gameId))
      .where(eq(posts.id, postId))
      .limit(1)

    if (!postWithGame) return reply.status(404).send({ error: 'Post not found' })

    const isPublicGame = postWithGame.gameIsPublic && postWithGame.gameStatus === 'active'
    if (!isPublicGame) {
      const token = (request.headers['authorization'] ?? '').replace('Bearer ', '')
      if (!token) return reply.status(403).send({ error: 'Access denied' })
      try {
        await request.jwtVerify()
      } catch {
        return reply.status(403).send({ error: 'Access denied' })
      }
      const userId = (request.user as { sub: string }).sub
      const [membership] = await db
        .select({ id: gameMembers.id })
        .from(gameMembers)
        .where(
          and(
            eq(gameMembers.gameId, postWithGame.gameId),
            eq(gameMembers.userId, userId),
            eq(gameMembers.status, 'active'),
          ),
        )
        .limit(1)
      if (!membership) return reply.status(403).send({ error: 'Access denied' })
    }

    const rows = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        body: comments.body,
        authorId: comments.authorId,
        authorName: users.displayName,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt))

    return reply.send(rows)
  })

  // POST /posts/:postId/comments — auth + game membership
  fastify.post(
    '/posts/:postId/comments',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { postId } = request.params as { postId: string }
      const userId = request.user.sub

      const [post] = await db
        .select({ id: posts.id, gameId: posts.gameId })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1)
      if (!post) return reply.status(404).send({ error: 'Post not found' })

      const [membership] = await db
        .select({ id: gameMembers.id })
        .from(gameMembers)
        .where(and(eq(gameMembers.gameId, post.gameId), eq(gameMembers.userId, userId), eq(gameMembers.status, 'active')))
        .limit(1)
      if (!membership) return reply.status(403).send({ error: 'Must be a member of this game to comment' })

      const result = CreateCommentInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [comment] = await db.insert(comments).values({
        postId,
        authorId: userId,
        body: result.data.body,
      }).returning()

      return reply.status(201).send(comment)
    },
  )

  // DELETE /posts/:postId/comments/:commentId — auth (own comment OR game owner/gm)
  fastify.delete(
    '/posts/:postId/comments/:commentId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { postId, commentId } = request.params as { postId: string; commentId: string }
      const userId = request.user.sub

      const [comment] = await db
        .select()
        .from(comments)
        .where(and(eq(comments.id, commentId), eq(comments.postId, postId)))
        .limit(1)
      if (!comment) return reply.status(404).send({ error: 'Comment not found' })

      if (comment.authorId !== userId) {
        const [post] = await db
          .select({ gameId: posts.gameId })
          .from(posts)
          .where(eq(posts.id, postId))
          .limit(1)
        if (!post) return reply.status(404).send({ error: 'Post not found' })

        const [member] = await db
          .select()
          .from(gameMembers)
          .where(
            and(
              eq(gameMembers.gameId, post.gameId),
              eq(gameMembers.userId, userId),
              eq(gameMembers.status, 'active'),
            ),
          )
          .limit(1)
        if (!member || !gmOrOwner(member.role)) {
          return reply.status(403).send({ error: 'Cannot delete another user\'s comment' })
        }
      }

      await db.delete(comments).where(eq(comments.id, commentId))
      return reply.status(204).send()
    },
  )

  // POST /posts/:postId/like — auth + game membership, idempotent toggle
  fastify.post(
    '/posts/:postId/like',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { postId } = request.params as { postId: string }
      const userId = request.user.sub

      const [post] = await db
        .select({ id: posts.id, gameId: posts.gameId })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1)
      if (!post) return reply.status(404).send({ error: 'Post not found' })

      const [membership] = await db
        .select({ id: gameMembers.id })
        .from(gameMembers)
        .where(and(eq(gameMembers.gameId, post.gameId), eq(gameMembers.userId, userId), eq(gameMembers.status, 'active')))
        .limit(1)
      if (!membership) return reply.status(403).send({ error: 'Must be a member of this game to like posts' })

      const [existing] = await db
        .select()
        .from(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        .limit(1)

      if (existing) {
        await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        return reply.send({ liked: false })
      } else {
        try {
          await db.insert(postLikes).values({ postId, userId })
        } catch (err: unknown) {
          if ((err as { code?: string }).code !== '23505') throw err
        }
        return reply.send({ liked: true })
      }
    },
  )

  // GET /feed — auth, posts from subscribed games, paginated, published only
  fastify.get(
    '/feed',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub
      const { limit = '20', offset = '0' } = request.query as { limit?: string; offset?: string }
      const limitN = Math.min(parseInt(limit, 10) || 20, 50)
      const offsetN = parseInt(offset, 10) || 0

      const subscriptions = await db
        .select({ gameId: adventureSubscriptions.gameId })
        .from(adventureSubscriptions)
        .where(eq(adventureSubscriptions.userId, userId))

      if (subscriptions.length === 0) {
        return reply.send({ items: [], total: 0, limit: limitN, offset: offsetN })
      }

      const subscribedGameIds = subscriptions.map(s => s.gameId)

      const [{ total }] = await db
        .select({ total: count() })
        .from(posts)
        .where(and(inArray(posts.gameId, subscribedGameIds), eq(posts.status, 'published')))

      const rows = await db
        .select({
          id: posts.id,
          gameId: posts.gameId,
          gameName: game.name,
          gameSlug: game.slug,
          authorId: posts.authorId,
          authorName: users.displayName,
          title: posts.title,
          body: posts.body,
          likeCount: sql<number>`cast(count(distinct ${postLikes.id}) as int)`,
          commentCount: sql<number>`cast(count(distinct ${comments.id}) as int)`,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          mediaType: posts.mediaType,
          mediaUrls: posts.mediaUrls,
          likedByMe: sql<boolean>`EXISTS (
            SELECT 1 FROM post_likes pl
            WHERE pl.post_id = ${posts.id} AND pl.user_id = ${userId}
          )`.as('liked_by_me'),
        })
        .from(posts)
        .innerJoin(game, eq(game.id, posts.gameId))
        .innerJoin(users, eq(users.id, posts.authorId))
        .leftJoin(postLikes, eq(postLikes.postId, posts.id))
        .leftJoin(comments, eq(comments.postId, posts.id))
        .where(and(inArray(posts.gameId, subscribedGameIds), eq(posts.status, 'published')))
        .groupBy(posts.id, game.name, game.slug, users.displayName)
        .orderBy(desc(posts.createdAt))
        .limit(limitN)
        .offset(offsetN)

      return reply.send({ items: rows, total: Number(total), limit: limitN, offset: offsetN })
    },
  )
}
