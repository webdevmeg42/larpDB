export interface Plot {
  id: string
  title: string
  description: string | null
  status: 'active' | 'resolved'
  linkedEventIds: string[]
  createdBy: string
  createdAt: string
}
