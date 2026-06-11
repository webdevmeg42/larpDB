import { useState, useRef } from 'react'
import { getToken, getGameId } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL!
const MAX_FILE_SIZE = 100 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

export function useImageUpload(onSuccess: (url: string) => void) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function trigger() {
    if (uploading) return
    setError(null)
    inputRef.current?.click()
  }

  async function handleFile(file: File) {
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only image files are accepted')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 100MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = getToken()
      const gameId = getGameId()
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(gameId ? { 'X-Game-Id': gameId } : {}),
        },
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Upload failed')
      }

      const { url } = await res.json() as { url: string }
      if (!url) throw new Error('Upload failed: no URL returned')
      onSuccess(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed, please try again')
    } finally {
      setUploading(false)
    }
  }

  return { uploading, error, trigger, inputRef, handleFile }
}
