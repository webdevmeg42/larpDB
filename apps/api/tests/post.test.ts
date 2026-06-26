import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

async function createAndLogin(email = 'owner@test.com') {
  const app = buildApp()
  await app.ready()

  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email, password: 'password123', displayName: 'Owner' },
  })
  const { token } = regRes.json()

  const gameRes = await app.inject({
    method: 'POST', url: '/games',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Test Game' },
  })
  const { id: gameId, slug } = gameRes.json()

  await app.inject({
    method: 'PATCH', url: `/games/${gameId}/status`,
    headers: { authorization: `Bearer ${token}` },
    payload: { status: 'active' },
  })

  return { app, token, gameId, slug }
}

describe('GET /games/:slug/posts', () => {
  it('returns paginated empty list for new game', async () => {
    const { app, slug } = await createAndLogin()
    const res = await app.inject({ method: 'GET', url: `/games/${slug}/posts` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
    expect(body.limit).toBe(20)
    expect(body.offset).toBe(0)
    await app.close()
  })

  it('returns posts with authorName and counts', async () => {
    const { app, token, gameId, slug } = await createAndLogin()
    await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { title: 'Hello World', body: 'This is the body.' },
    })

    const res = await app.inject({ method: 'GET', url: `/games/${slug}/posts` })
    expect(res.statusCode).toBe(200)
    const { items, total } = res.json()
    expect(total).toBe(1)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Hello World')
    expect(items[0].body).toBe('This is the body.')
    expect(items[0].authorName).toBe('Owner')
    expect(items[0].likeCount).toBe(0)
    expect(items[0].commentCount).toBe(0)
    await app.close()
  })

  it('returns posts newest-first', async () => {
    const { app, token, gameId, slug } = await createAndLogin()
    await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { title: 'First', body: 'body' },
    })
    await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { title: 'Second', body: 'body' },
    })

    const res = await app.inject({ method: 'GET', url: `/games/${slug}/posts` })
    const { items } = res.json()
    expect(items[0].title).toBe('Second')
    expect(items[1].title).toBe('First')
    await app.close()
  })

  it('returns 404 for unknown slug', async () => {
    const { app } = await createAndLogin()
    const res = await app.inject({ method: 'GET', url: '/games/no-such-larp/posts' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('POST /posts', () => {
  it('owner can create a post', async () => {
    const { app, token, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { title: 'Announcement', body: 'Event this weekend!' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.title).toBe('Announcement')
    expect(body.gameId).toBe(gameId)
    await app.close()
  })

  it('returns 403 for player role', async () => {
    const { app, gameId } = await createAndLogin()

    const playerRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player@test.com', password: 'password123', displayName: 'Player' },
    })
    const { token: playerToken } = playerRes.json()
    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { gameId },
    })

    const res = await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { title: 'Hello', body: 'World' },
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 403 when game is inactive', async () => {
    const { app, token, gameId } = await createAndLogin()
    await app.inject({
      method: 'PATCH', url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'inactive' },
    })

    const res = await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { title: 'Hello', body: 'World' },
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const { app, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'POST', url: '/posts',
      headers: { 'x-game-id': gameId },
      payload: { title: 'Hello', body: 'World' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 400 for missing title', async () => {
    const { app, token, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { body: 'No title here' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('DELETE /posts/:postId', () => {
  it('owner can delete a post', async () => {
    const { app, token, gameId, slug } = await createAndLogin()
    const createRes = await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { title: 'To Delete', body: 'Gone' },
    })
    const { id: postId } = createRes.json()

    const res = await app.inject({
      method: 'DELETE', url: `/posts/${postId}`,
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })
    expect(res.statusCode).toBe(204)

    const listRes = await app.inject({ method: 'GET', url: `/games/${slug}/posts` })
    expect(listRes.json().total).toBe(0)
    await app.close()
  })

  it('returns 403 for player role', async () => {
    const { app, token, gameId } = await createAndLogin()
    const createRes = await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { title: 'Post', body: 'Body' },
    })
    const { id: postId } = createRes.json()

    const playerRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player@test.com', password: 'password123', displayName: 'Player' },
    })
    const { token: playerToken } = playerRes.json()
    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { gameId },
    })

    const res = await app.inject({
      method: 'DELETE', url: `/posts/${postId}`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 404 for non-existent post', async () => {
    const { app, token, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'DELETE', url: '/posts/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

// Helper: creates a game, owner, and one post. Returns app, token, gameId, slug, postId.
async function createGameWithPost(email = 'owner2@test.com') {
  const app = buildApp()
  await app.ready()

  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email, password: 'password123', displayName: 'Owner2' },
  })
  const { token } = regRes.json()

  const gameRes = await app.inject({
    method: 'POST', url: '/games',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Post Game' },
  })
  const { id: gameId, slug } = gameRes.json()

  await app.inject({
    method: 'PATCH', url: `/games/${gameId}/status`,
    headers: { authorization: `Bearer ${token}` },
    payload: { status: 'active' },
  })

  const postRes = await app.inject({
    method: 'POST', url: '/posts',
    headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    payload: { title: 'A Post', body: 'Post body here.' },
  })
  const { id: postId } = postRes.json()

  return { app, token, gameId, slug, postId }
}

describe('GET /posts/:postId/comments', () => {
  it('returns comments with author names', async () => {
    const { app, token, postId } = await createGameWithPost()

    await app.inject({
      method: 'POST', url: `/posts/${postId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { body: 'Great post!' },
    })

    const res = await app.inject({ method: 'GET', url: `/posts/${postId}/comments` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(1)
    expect(body[0].body).toBe('Great post!')
    expect(body[0].authorName).toBe('Owner2')
    await app.close()
  })

  it('returns 404 for non-existent post', async () => {
    const { app } = await createGameWithPost()
    const res = await app.inject({ method: 'GET', url: '/posts/00000000-0000-0000-0000-000000000000/comments' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('POST /posts/:postId/comments', () => {
  it('adds a comment as authenticated user', async () => {
    const { app, token, postId } = await createGameWithPost()

    const res = await app.inject({
      method: 'POST', url: `/posts/${postId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { body: 'Nice post!' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().body).toBe('Nice post!')
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const { app, postId } = await createGameWithPost()

    const res = await app.inject({
      method: 'POST', url: `/posts/${postId}/comments`,
      payload: { body: 'Anonymous' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 400 for empty body', async () => {
    const { app, token, postId } = await createGameWithPost()

    const res = await app.inject({
      method: 'POST', url: `/posts/${postId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { body: '' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('DELETE /posts/:postId/comments/:commentId', () => {
  it('author can delete their own comment', async () => {
    const { app, token, postId } = await createGameWithPost()

    const commentRes = await app.inject({
      method: 'POST', url: `/posts/${postId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { body: 'Will delete' },
    })
    const { id: commentId } = commentRes.json()

    const res = await app.inject({
      method: 'DELETE', url: `/posts/${postId}/comments/${commentId}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
    await app.close()
  })

  it('returns 403 when deleting another user comment as a non-gm/owner', async () => {
    const { app, token, gameId, postId } = await createGameWithPost()

    const commentRes = await app.inject({
      method: 'POST', url: `/posts/${postId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { body: 'Owner comment' },
    })
    const { id: commentId } = commentRes.json()

    const playerRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player99@test.com', password: 'password123', displayName: 'Player99' },
    })
    const { token: playerToken } = playerRes.json()
    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { gameId },
    })

    const res = await app.inject({
      method: 'DELETE', url: `/posts/${postId}/comments/${commentId}`,
      headers: { authorization: `Bearer ${playerToken}` },
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 404 for non-existent comment', async () => {
    const { app, token, postId } = await createGameWithPost()

    const res = await app.inject({
      method: 'DELETE', url: `/posts/${postId}/comments/00000000-0000-0000-0000-000000000000`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('POST /posts/:postId/like', () => {
  it('toggles like on, returns likeCount 1 and likedByMe true', async () => {
    const { app, token, postId } = await createGameWithPost()

    const res = await app.inject({
      method: 'POST', url: `/posts/${postId}/like`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().likeCount).toBe(1)
    expect(res.json().likedByMe).toBe(true)
    await app.close()
  })

  it('toggles like off when already liked', async () => {
    const { app, token, postId } = await createGameWithPost()

    await app.inject({
      method: 'POST', url: `/posts/${postId}/like`,
      headers: { authorization: `Bearer ${token}` },
    })

    const res = await app.inject({
      method: 'POST', url: `/posts/${postId}/like`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.json().likeCount).toBe(0)
    expect(res.json().likedByMe).toBe(false)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const { app, postId } = await createGameWithPost()
    const res = await app.inject({
      method: 'POST', url: `/posts/${postId}/like`,
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('GET /feed', () => {
  it('returns posts from subscribed games only', async () => {
    // Create two games with posts; user subscribes to only one
    const app = buildApp()
    await app.ready()

    // Owner A creates game A with a post
    const ownerARes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'ownerA@test.com', password: 'password123', displayName: 'OwnerA' },
    })
    const { token: tokenA } = ownerARes.json()
    const gameARes = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Game A' },
    })
    const { id: gameIdA } = gameARes.json()
    await app.inject({
      method: 'PATCH', url: `/games/${gameIdA}/status`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { status: 'active' },
    })
    await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${tokenA}`, 'x-game-id': gameIdA },
      payload: { title: 'Post from A', body: 'Body A' },
    })

    // Owner B creates game B with a post
    const ownerBRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'ownerB@test.com', password: 'password123', displayName: 'OwnerB' },
    })
    const { token: tokenB } = ownerBRes.json()
    const gameBRes = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { name: 'Game B' },
    })
    const { id: gameIdB } = gameBRes.json()
    await app.inject({
      method: 'PATCH', url: `/games/${gameIdB}/status`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { status: 'active' },
    })
    await app.inject({
      method: 'POST', url: '/posts',
      headers: { authorization: `Bearer ${tokenB}`, 'x-game-id': gameIdB },
      payload: { title: 'Post from B', body: 'Body B' },
    })

    // Subscriber subscribes to game A only
    const subRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'subscriber@test.com', password: 'password123', displayName: 'Subscriber' },
    })
    const { token: subToken } = subRes.json()
    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${subToken}` },
      payload: { gameId: gameIdA },
    })

    const res = await app.inject({
      method: 'GET', url: '/feed',
      headers: { authorization: `Bearer ${subToken}` },
    })
    expect(res.statusCode).toBe(200)
    const { items, total } = res.json()
    expect(total).toBe(1)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Post from A')
    expect(items[0].gameName).toBe('Game A')
    await app.close()
  })

  it('returns empty feed when not subscribed to anything', async () => {
    const app = buildApp()
    await app.ready()

    const userRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'lonely@test.com', password: 'password123', displayName: 'Lonely' },
    })
    const { token } = userRes.json()

    const res = await app.inject({
      method: 'GET', url: '/feed',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().items).toEqual([])
    expect(res.json().total).toBe(0)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/feed' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

async function setupMediaTests() {
  const app = buildApp()
  await app.ready()

  const regRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'owner@posttest.com', password: 'password123', displayName: 'Owner' },
  })
  const { token } = regRes.json()

  const gameRes = await app.inject({
    method: 'POST',
    url: '/games',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Post Test Game' },
  })
  const { id: gameId } = gameRes.json()

  await app.inject({
    method: 'PATCH',
    url: `/games/${gameId}/status`,
    headers: { authorization: `Bearer ${token}` },
    payload: { status: 'active' },
  })

  return { app, token, gameId }
}

describe('POST /posts — media fields', () => {
  it('creates a post with no media', async () => {
    const { app, token, gameId } = await setupMediaTests()
    const res = await app.inject({
      method: 'POST',
      url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { title: 'Hello', body: 'World' },
    })
    expect(res.statusCode).toBe(201)
    const post = res.json()
    expect(post.mediaType).toBeNull()
    expect(post.mediaUrls).toBeNull()
    await app.close()
  })

  it('creates a post with a photo', async () => {
    const { app, token, gameId } = await setupMediaTests()
    const res = await app.inject({
      method: 'POST',
      url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: {
        title: 'Photo post',
        body: 'Look at this',
        mediaType: 'photo',
        mediaUrls: ['https://example.com/photo.jpg'],
      },
    })
    expect(res.statusCode).toBe(201)
    const post = res.json()
    expect(post.mediaType).toBe('photo')
    expect(post.mediaUrls).toEqual(['https://example.com/photo.jpg'])
    await app.close()
  })

  it('creates a post with a video', async () => {
    const { app, token, gameId } = await setupMediaTests()
    const res = await app.inject({
      method: 'POST',
      url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: {
        title: 'Video post',
        body: 'Watch this',
        mediaType: 'video',
        mediaUrls: ['https://example.com/video.mp4'],
      },
    })
    expect(res.statusCode).toBe(201)
    const post = res.json()
    expect(post.mediaType).toBe('video')
    expect(post.mediaUrls).toEqual(['https://example.com/video.mp4'])
    await app.close()
  })

  it('rejects more than 8 photos', async () => {
    const { app, token, gameId } = await setupMediaTests()
    const res = await app.inject({
      method: 'POST',
      url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: {
        title: 'Too many',
        body: 'photos',
        mediaType: 'photo',
        mediaUrls: Array.from({ length: 9 }, (_, i) => `https://example.com/p${i}.jpg`),
      },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('rejects video with more than 1 URL', async () => {
    const { app, token, gameId } = await setupMediaTests()
    const res = await app.inject({
      method: 'POST',
      url: '/posts',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: {
        title: 'Two videos',
        body: 'nope',
        mediaType: 'video',
        mediaUrls: ['https://example.com/v1.mp4', 'https://example.com/v2.mp4'],
      },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})
