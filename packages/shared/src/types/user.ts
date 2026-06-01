export type UserRole = 'owner' | 'gm' | 'player'

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
}
