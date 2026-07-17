export interface NPC {
  id: string
  name: string
  description: string | null
  portraitUrl: string | null
  notes: string | null
  createdBy: string
  createdAt: string
}
