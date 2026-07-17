'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

interface ProfileUser {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  phone: string | null
  createdAt: string
}

export default function ProfilePage() {
  const { refreshUser } = useAuth()
  const { toast } = useToast()

  const [profile, setProfile] = useState<ProfileUser | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    api.get<ProfileUser>('/profile').then(p => {
      setProfile(p)
      setDisplayName(p.displayName)
      setEmail(p.email)
      setPhone(p.phone ?? '')
    }).catch(() => {
      setLoadError('Failed to load profile. Please refresh the page.')
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const res = await api.patch<{ user: ProfileUser }>('/profile', {
        displayName,
        email,
        phone: phone || null,
      })
      setProfile(res.user)
      await refreshUser()
      toast('Profile saved')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      setAvatarError('Only image files are accepted (JPEG, PNG, GIF, WebP)')
      return
    }
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/profile/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Upload failed')
      }
      const updated = await res.json() as ProfileUser
      setProfile(updated)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      await api.post('/profile/password', { currentPassword, newPassword, confirmPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loadError) {
    return <div className="p-6 text-sm text-destructive">{loadError}</div>
  }

  if (!profile) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  }

  const avatarSrc = profile.avatarUrl
    ? (profile.avatarUrl.startsWith('/uploads/') ? `${API_URL}${profile.avatarUrl}` : profile.avatarUrl)
    : null

  const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1'

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">My Profile</h1>

      {/* Identity section */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold flex-shrink-0 overflow-hidden">
            {avatarSrc
              ? <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
              : (profile.displayName[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Profile photo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { e.target.value = ''; void handleAvatarFile(f) } }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="text-xs border border-border rounded-md px-3 py-1 hover:bg-accent transition-colors disabled:opacity-50"
            >
              {avatarUploading ? 'Uploading…' : 'Upload photo'}
            </button>
            {avatarError && <p className="text-xs text-destructive mt-1">{avatarError}</p>}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Display name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Phone number <span className="normal-case font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Not set"
              className={inputClass}
            />
          </div>
        </div>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <hr className="border-border" />

      {/* Password section */}
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>

        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        {passwordSuccess && <p className="text-sm text-green-500">Password updated.</p>}

        <button
          type="submit"
          disabled={passwordSaving}
          className="border border-border rounded-md px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
        >
          {passwordSaving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
