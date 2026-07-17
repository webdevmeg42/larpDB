'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { api } from '@/lib/api'
import type { SiteConfig, GameCodex, RulebookChapter } from '@plotrunner/shared'

interface Props {
  config: SiteConfig | null
  reload: () => void
}

export default function RulebookTab({ config, reload }: Props) {
  const [codex, setCodex] = useState<GameCodex>({})
  const [chapters, setChapters] = useState<RulebookChapter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [titleError, setTitleError] = useState(false)
  const [linkValue, setLinkValue] = useState('')

  useEffect(() => {
    if (!config) return
    const c = config.codex ?? {}
    setCodex(c)
    const chs = c.rulebook?.chapters ?? []
    setChapters(chs)
    setLinkValue(c.rulebookLink ?? '')
    if (chs.length > 0 && selectedId === null) {
      setSelectedId(chs[0]!.id)
    }
  }, [config])

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
  })

  useEffect(() => {
    if (!editor) return
    const ch = chapters.find(c => c.id === selectedId)
    editor.commands.setContent(ch?.content ?? '')
    setEditingTitle(ch?.title ?? '')
    setTitleError(false)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function patchChapters(updated: RulebookChapter[]) {
    const newCodex = { ...codex, rulebook: { chapters: updated } }
    try {
      await api.patch<SiteConfig>('/config', { codex: newCodex })
      setCodex(newCodex)
      setChapters(updated)
      reload()
    } catch (err) {
      console.error('Failed to save chapters:', err)
      alert('Failed to save. Please try again.')
    }
  }

  function addChapter() {
    const id = crypto.randomUUID()
    setPendingId(id)
    setSelectedId(id)
  }

  function selectChapter(id: string) {
    if (pendingId && id !== pendingId) setPendingId(null)
    setSelectedId(id)
  }

  function deleteChapter(id: string) {
    const updated = chapters
      .filter(c => c.id !== id)
      .map((c, i) => ({ ...c, order: i }))
    void patchChapters(updated)
    if (selectedId === id) setSelectedId(updated[0]?.id ?? null)
  }

  function moveChapter(id: string, direction: 'up' | 'down') {
    const idx = chapters.findIndex(c => c.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === chapters.length - 1) return
    const next = [...chapters]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!]
    void patchChapters(next.map((c, i) => ({ ...c, order: i })))
  }

  async function saveLink() {
    const newCodex: GameCodex = linkValue
      ? { ...codex, rulebookLink: linkValue }
      : (({ rulebookLink: _, ...rest }) => rest)(codex)
    try {
      await api.patch<SiteConfig>('/config', { codex: newCodex })
      setCodex(newCodex)
      reload()
    } catch (err) {
      console.error('Failed to save link:', err)
      alert('Failed to save. Please try again.')
    }
  }

  async function saveChapter() {
    if (!editor) return
    if (!editingTitle.trim()) {
      setTitleError(true)
      return
    }
    if (pendingId) {
      const newChapter: RulebookChapter = {
        id: pendingId,
        title: editingTitle.trim(),
        content: editor.getHTML(),
        order: chapters.length,
      }
      await patchChapters([...chapters, newChapter])
      setPendingId(null)
    } else {
      if (!selectedId) return
      const updated = chapters.map(c =>
        c.id === selectedId ? { ...c, title: editingTitle.trim(), content: editor.getHTML() } : c,
      )
      await patchChapters(updated)
    }
  }

  const selectedChapter = chapters.find(c => c.id === selectedId) ?? null
  const isEditingPending = pendingId !== null && selectedId === pendingId

  const toolbarBtn = (
    label: string,
    action: () => void,
    isActive: boolean,
    extraStyle?: React.CSSProperties,
  ) => (
    <button
      key={label}
      type="button"
      onClick={action}
      style={{
        padding: '2px 6px',
        background: isActive ? '#e2e8f0' : '#fff',
        border: '1px solid #d1d5db',
        borderRadius: '3px',
        fontSize: '11px',
        color: '#374151',
        cursor: 'pointer',
        ...extraStyle,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: '12px', minHeight: '400px' }}>
      {/* Left column */}
      <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* External link card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
          <div style={{ fontSize: '11px', marginBottom: '6px', color: '#111827', fontWeight: 500 }}>
            External rulebook link
          </div>
          <input
            value={linkValue}
            onChange={e => setLinkValue(e.target.value)}
            placeholder="https://docs.google.com/…"
            style={{
              fontSize: '12px',
              width: '100%',
              boxSizing: 'border-box',
              color: '#2563eb',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              padding: '4px 8px',
            }}
          />
          <button
            type="button"
            onClick={() => void saveLink()}
            style={{
              fontSize: '11px',
              marginTop: '6px',
              padding: '3px 8px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>

        {/* Chapters list card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', flex: 1 }}>
          <div style={{ fontSize: '11px', marginBottom: '8px', color: '#6b7280' }}>Chapters</div>
          {chapters.map(ch => (
            <div
              key={ch.id}
              onClick={() => selectChapter(ch.id)}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderLeft: ch.id === selectedId ? '3px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '6px 8px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: ch.id === selectedId ? 600 : 400, color: '#374151' }}>
                {ch.order + 1}. {ch.title}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); moveChapter(ch.id, 'up') }}
                  style={{ color: '#6b7280', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                >▲</button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); moveChapter(ch.id, 'down') }}
                  style={{ color: '#6b7280', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                >▼</button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); deleteChapter(ch.id) }}
                  style={{ color: '#b91c1c', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                >✕</button>
              </div>
            </div>
          ))}
          {isEditingPending && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderLeft: '3px solid #2563eb',
                borderRadius: '4px',
                padding: '6px 8px',
                marginBottom: '4px',
                cursor: 'default',
              }}
            >
              <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                {chapters.length + 1}. New chapter…
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={addChapter}
            disabled={isEditingPending}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              width: '100%',
              background: isEditingPending ? '#93c5fd' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isEditingPending ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            + Add chapter
          </button>
        </div>
      </div>

      {/* Right column: editor */}
      <div style={{
        flex: 1,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {selectedChapter || isEditingPending ? (
          <>
            <div>
              <div style={{ fontSize: '11px', color: '#111827', fontWeight: 500, marginBottom: '3px' }}>
                Chapter title <span style={{ color: '#dc2626' }}>*</span>
              </div>
              <input
                value={editingTitle}
                onChange={e => { setEditingTitle(e.target.value); setTitleError(false) }}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  width: '100%',
                  boxSizing: 'border-box',
                  color: '#2563eb',
                  border: titleError ? '1px solid #dc2626' : '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '4px 8px',
                }}
              />
              {titleError && (
                <div data-testid="chapter-title-error" style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>
                  Chapter title is required
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '4px 6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              flexWrap: 'wrap',
            }}>
              {toolbarBtn('B', () => editor?.chain().focus().toggleBold().run(), !!editor?.isActive('bold'), { fontWeight: 700 })}
              {toolbarBtn('I', () => editor?.chain().focus().toggleItalic().run(), !!editor?.isActive('italic'), { fontStyle: 'italic' })}
              {toolbarBtn('U', () => editor?.chain().focus().toggleUnderline().run(), !!editor?.isActive('underline'), { textDecoration: 'underline' })}
              <span style={{ color: '#d1d5db', margin: '0 2px' }}>|</span>
              {toolbarBtn('Body', () => editor?.chain().focus().setParagraph().run(), !!editor?.isActive('paragraph'))}
              {toolbarBtn('H2', () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), !!editor?.isActive('heading', { level: 2 }))}
              {toolbarBtn('H3', () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), !!editor?.isActive('heading', { level: 3 }))}
              <span style={{ color: '#d1d5db', margin: '0 2px' }}>|</span>
              {toolbarBtn('• List', () => editor?.chain().focus().toggleBulletList().run(), !!editor?.isActive('bulletList'))}
              {toolbarBtn('1. List', () => editor?.chain().focus().toggleOrderedList().run(), !!editor?.isActive('orderedList'))}
              {toolbarBtn('—', () => editor?.chain().focus().setHorizontalRule().run(), false)}
            </div>

            {/* Editor area */}
            <div
              style={{
                flex: 1,
                minHeight: '300px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '10px',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#374151',
                cursor: 'text',
              }}
              onClick={(e) => { if (e.target === e.currentTarget) editor?.commands.focus('end') }}
            >
              <EditorContent editor={editor} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => void saveChapter()}
                style={{
                  fontSize: '11px',
                  padding: '5px 14px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Save chapter
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#6b7280', fontSize: '13px' }}>
            Select a chapter or add a new one to get started.
          </div>
        )}
      </div>
    </div>
  )
}
