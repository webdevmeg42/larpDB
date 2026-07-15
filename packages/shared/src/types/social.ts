export interface Post {
  id: string
  gameId: string
  authorId: string
  authorName: string
  title: string
  body: string
  status: 'draft' | 'published'
  likeCount: number
  commentCount: number
  likedByMe?: boolean
  mediaType: 'photo' | 'video' | null
  mediaUrls: string[] | null
  createdAt: string
  updatedAt: string
}

export interface FeedPost extends Post {
  gameName: string
  gameSlug: string
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
}

export interface AdventureSubscription {
  id: string
  gameId: string
  userId: string
  createdAt: string
}
