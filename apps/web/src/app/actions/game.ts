'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setCurrentGameAction(gameId: string): Promise<void> {
  const store = await cookies()
  store.set('gameId', gameId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  })
  revalidatePath('/', 'layout')
}

export async function clearCurrentGameAction(): Promise<void> {
  const store = await cookies()
  store.delete('gameId')
  revalidatePath('/', 'layout')
}
