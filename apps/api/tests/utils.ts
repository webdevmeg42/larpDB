export function extractToken(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie']
  const cookieStr = Array.isArray(raw) ? raw[0] : ((raw as string | undefined) ?? '')
  const value = cookieStr.match(/\btoken=([^;]+)/)?.[1]
  if (!value) throw new Error(`No token cookie found in Set-Cookie header: ${String(raw)}`)
  return value
}

type InjectApp = {
  inject: (opts: unknown) => Promise<{ statusCode: number; body: string; headers: Record<string, unknown>; json: () => Record<string, unknown> }>
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
  if (res.statusCode !== 201) throw new Error(`registerAndLogin failed ${res.statusCode}: ${res.body}`)
  const token = extractToken(res.headers)
  const { user } = res.json() as { user: { id: string; email: string; displayName: string; role: string; isSysAdmin: boolean } }
  return { token, userId: user.id, user }
}

type GameApp = {
  inject: (opts: unknown) => Promise<{ statusCode: number; body: string; json: () => Record<string, unknown> }>
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
  if (gameRes.statusCode !== 201) throw new Error(`POST /games failed ${gameRes.statusCode}: ${gameRes.body}`)
  const gameId = (gameRes.json() as { id: string }).id
  const patchRes = await app.inject({
    method: 'PATCH',
    url: `/games/${gameId}/status`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { status: 'active' },
  })
  if (patchRes.statusCode !== 200) throw new Error(`PATCH /games/${gameId}/status failed ${patchRes.statusCode}: ${patchRes.body}`)
  return { gameId }
}
