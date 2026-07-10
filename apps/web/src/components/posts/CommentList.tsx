'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import type { Comment } from '@plotrunner/shared'

interface CommentListProps {
  postId: string
}

export function CommentList({ postId }: CommentListProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get<Comment[]>(`/posts/${postId}/comments`)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [postId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !user) return
    setSubmitting(true)
    try {
      const comment = await api.post<Comment>(`/posts/${postId}/comments`, { body })
      setComments(c => [...c, { ...comment, authorName: user.displayName }])
      setBody('')
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteComment(commentId: string) {
    try {
      await api.delete(`/posts/${postId}/comments/${commentId}`)
      setComments(c => c.filter(x => x.id !== commentId))
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        comments.map(c => (
          <div key={c.id} className="flex items-start gap-2 text-sm">
            <div className="flex-1">
              <span className="font-medium">{c.authorName}</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-muted-foreground text-xs">
                {new Date(c.createdAt).toLocaleDateString()}
              </span>
              <p className="mt-0.5">{c.body}</p>
            </div>
            {user && (user.sub === c.authorId || user.role === 'owner' || user.role === 'gm') && (
              <button
                onClick={() => deleteComment(c.id)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                delete
              </button>
            )}
          </div>
        ))
      )}

      {user && (
        <form onSubmit={submit} className="flex gap-2 mt-3">
          <input
            type="text"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            Post
          </button>
        </form>
      )}
    </div>
  )
}
