export function extractToken(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie']
  const cookieStr = Array.isArray(raw) ? raw[0] : ((raw as string | undefined) ?? '')
  return cookieStr.match(/\btoken=([^;]+)/)?.[1] ?? ''
}

type InjectApp = {
  inject: (opts: unknown) => Promise<{ headers: Record<string, unknown>; json: () => Record<string, unknown> }>
}

export async function registerAndLogin(
  app: InjectApp,
  email = 'user@test.com',
  password = 'password123',
): Promise<{ token: string; userId: string; user: { id: string; email: string; displayName: string; role: string; isSysAdmin: boolean } }> {
  const displayName = email.split('@')[0]
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password, displayName },
  })
  const token = extractToken(res.headers)
  const { user } = res.json() as { user: { id: string; email: string; displayName: string; role: string; isSysAdmin: boolean } }
  return { token, userId: user.id, user }
}

type GameApp = {
  inject: (opts: unknown) => Promise<{ json: () => Record<string, unknown> }>
}

export async function createActiveGame(
  app: GameApp,
  ownerToken: string,
  name = 'Test Game',
): Promise<{ gameId: string }> {
  const gameRes = await app.inject({
    method: 'POST',
    url: '/games',
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { name },
  })
  const gameId = (gameRes.json() as { id: string }).id
  await app.inject({
    method: 'PATCH',
    url: `/games/${gameId}/status`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { status: 'active' },
  })
  return { gameId }
}
