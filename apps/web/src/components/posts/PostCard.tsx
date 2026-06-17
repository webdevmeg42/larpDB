'use client'

import { useState } from 'react'
import { LikeButton } from './LikeButton'
import { CommentList } from './CommentList'
import type { Post } from '@larpdb/shared'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)

  return (
    <div className="rounded-lg border p-4">
      <h3
        className="font-semibold cursor-pointer hover:underline"
        onClick={() => setExpanded(e => !e)}
      >
        {post.title}
      </h3>

      {expanded ? (
        <p className="mt-2 text-sm whitespace-pre-wrap">{post.body}</p>
      ) : (
        <p
          className="mt-1 text-sm text-muted-foreground line-clamp-2 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          {post.body}
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{post.authorName}</span>
        <span>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <LikeButton
          postId={post.id}
          initialCount={post.likeCount}
          initialLiked={post.likedByMe ?? false}
        />
        <button
          onClick={() => setShowComments(s => !s)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          💬 {post.commentCount} {showComments ? '▲' : '▼'}
        </button>
      </div>

      {showComments && <CommentList postId={post.id} />}
    </div>
  )
}
