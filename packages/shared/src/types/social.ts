export interface Post {
  id: string
  gameId: string
  authorId: string
  authorName: string
  title: string
  body: string
  likeCount: number
  commentCount: number
  likedByMe?: boolean
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

export interface LarpSubscription {
  id: string
  gameId: string
  userId: string
  createdAt: string
}
