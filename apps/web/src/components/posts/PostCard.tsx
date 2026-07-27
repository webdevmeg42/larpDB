'use client'

import { useState, useEffect, useCallback } from 'react'
import { LikeButton } from './LikeButton'
import { CommentList } from './CommentList'
import type { Post } from '@plotrunner/shared'

interface PostCardProps {
  post: Post
}

function PhotoGrid({ urls, onOpen }: { urls: string[]; onOpen: (i: number) => void }) {
  const cols =
    urls.length === 1 ? 'grid-cols-1' :
    urls.length === 2 ? 'grid-cols-2' :
    'grid-cols-3'
  return (
    <div className={`grid gap-1 ${cols}`}>
      {urls.map((url, i) => (
        <button key={url} type="button" onClick={() => onOpen(i)} className="overflow-hidden rounded">
          <img
            src={url}
            alt=""
            className="aspect-square w-full object-cover hover:opacity-90 transition-opacity"
          />
        </button>
      ))}
    </div>
  )
}

function Lightbox({
  urls,
  index,
  onClose,
}: {
  urls: string[]
  index: number
  onClose: () => void
}) {
  const [current, setCurrent] = useState(index)

  const prev = useCallback(
    () => setCurrent(c => (c - 1 + urls.length) % urls.length),
    [urls.length],
  )
  const next = useCallback(
    () => setCurrent(c => (c + 1) % urls.length),
    [urls.length],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={e => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 text-white text-3xl leading-none"
      >
        <span aria-hidden="true">×</span>
      </button>
      {urls.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={e => { e.stopPropagation(); prev() }}
            className="absolute left-4 text-white text-4xl leading-none px-2"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-16 text-white text-4xl leading-none px-2"
          >
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}
      <img
        src={urls[current]}
        alt=""
        className="max-h-screen max-w-full object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

export function PostCard({ post }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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

      {post.mediaType === 'photo' && post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="mt-3">
          <PhotoGrid urls={post.mediaUrls} onOpen={setLightboxIndex} />
        </div>
      )}

      {post.mediaType === 'video' && post.mediaUrls?.[0] && (
        <div className="mt-3">
          <video
            src={post.mediaUrls[0]}
            controls
            preload="metadata"
            className="w-full rounded-lg max-h-96"
          />
        </div>
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

      {lightboxIndex !== null && post.mediaUrls && (
        <Lightbox
          urls={post.mediaUrls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
